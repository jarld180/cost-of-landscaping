/**
 * POST /api/public/reviews/submit
 *
 * Submit a platform review for a contractor.
 * Full flow (after migration): save as 'pending' → send confirmation email → user clicks link → published
 * Legacy flow (before migration): save directly as published, no confirmation step
 */

import { z } from 'zod'
import { consola } from 'consola'
import { serverSupabaseServiceRole } from '#supabase/server'
import { applyRateLimit } from '../../../utils/rateLimit'
import { Resend } from 'resend'

const submitSchema = z.object({
  contractorId: z.string().uuid(),
  reviewerName: z.string().min(2).max(100),
  reviewerEmail: z.string().email().max(200),
  stars: z.number().int().min(1).max(5),
  reviewText: z.string().min(10).max(2000),
})

const CONFIRM_EXPIRY_HOURS = 48

async function schemaHasStatusColumn(client: ReturnType<typeof serverSupabaseServiceRole>): Promise<boolean> {
  const { data } = await client
    .from('reviews')
    .select('status')
    .limit(1)
    .maybeSingle()
  // If the query doesn't throw, the column exists; if it errors with 42703 it doesn't
  // But Supabase JS swallows the error differently — probe via a known-bad query
  const { error } = await client.from('reviews').select('status').limit(0)
  return !error
}

export default defineEventHandler(async (event) => {
  await applyRateLimit(event, { maxRequests: 3, windowSeconds: 300, keyPrefix: 'review-submit' })

  const body = await readBody(event)
  const parsed = submitSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Invalid form data' })
  }

  const { contractorId, reviewerName, reviewerEmail, stars, reviewText } = parsed.data
  const client = serverSupabaseServiceRole(event)

  // Verify contractor exists and is active
  const { data: contractor, error: contractorError } = await client
    .from('contractors')
    .select('id, company_name, slug, city_id')
    .eq('id', contractorId)
    .eq('status', 'active')
    .is('deleted_at', null)
    .single()

  if (contractorError || !contractor) {
    throw createError({ statusCode: 404, message: 'Contractor not found' })
  }

  // Get reviewer IP
  const forwardedFor = getHeader(event, 'x-forwarded-for')
  const cfIp = getHeader(event, 'cf-connecting-ip')
  const reviewerIp = cfIp || (forwardedFor ? forwardedFor.split(',')[0].trim() : null)
    || event.node.req.socket.remoteAddress || null

  // Detect whether the new schema (post-migration) is in place
  const hasNewSchema = await schemaHasStatusColumn(client)

  if (hasNewSchema) {
    // Full flow: save as pending → send confirmation email → user confirms → published

    // Check for duplicate review from this email
    const { data: existing } = await client
      .from('reviews')
      .select('id, status')
      .eq('contractor_id', contractorId)
      .eq('reviewer_email', reviewerEmail)
      .is('google_review_id', null)
      .limit(1)

    if (existing && existing.length > 0) {
      const existingStatus = (existing[0] as { id: string; status: string }).status
      if (existingStatus === 'published') {
        throw createError({ statusCode: 400, message: 'You have already reviewed this contractor.' })
      }
      if (existingStatus === 'pending') {
        throw createError({ statusCode: 400, message: 'A review confirmation was already sent to your email. Please check your inbox.' })
      }
    }

    const confirmToken = crypto.randomUUID()
    const confirmExpiresAt = new Date(Date.now() + CONFIRM_EXPIRY_HOURS * 60 * 60 * 1000).toISOString()

    const { error: insertError } = await client.from('reviews').insert({
      contractor_id: contractorId,
      google_review_id: null,
      reviewer_name: reviewerName,
      reviewer_email: reviewerEmail,
      reviewer_ip: reviewerIp,
      stars,
      review_text: reviewText,
      review_origin: 'platform',
      status: 'pending',
      confirm_token: confirmToken,
      confirm_expires_at: confirmExpiresAt,
      published_at: null,
    })

    if (insertError) {
      consola.error('Review insert error:', insertError)
      throw createError({ statusCode: 500, message: 'Failed to save review' })
    }

    // Send confirmation email
    const config = useRuntimeConfig()
    const siteUrl = config.public.siteUrl || 'https://costoflandscaping.com'
    const confirmUrl = `${siteUrl}/api/public/reviews/confirm/${confirmToken}`

    try {
      const resend = new Resend(config.resendApiKey)
      await resend.emails.send({
        from: 'Cost of landscape <noreply@mail.costoflandscape.com>',
        to: reviewerEmail,
        subject: `Confirm your review for ${contractor.company_name}`,
        html: `
          <p>Hi ${reviewerName},</p>
          <p>Thanks for reviewing <strong>${contractor.company_name}</strong>!</p>
          <p>Click the link below to confirm your ${stars}-star review and publish it:</p>
          <p><a href="${confirmUrl}" style="background:#f59e0b;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Confirm My Review</a></p>
          <p>This link expires in ${CONFIRM_EXPIRY_HOURS} hours.</p>
          <p style="color:#888;font-size:12px;">If you didn't submit this review, you can ignore this email.</p>
          <p style="color:#888;font-size:12px;">— Cost of landscape</p>
        `,
      })
    } catch (emailErr) {
      consola.warn('Failed to send review confirmation email:', emailErr)
    }

    return { success: true, message: 'Check your email to confirm your review.' }
  }

  // Legacy flow (migration not yet applied): publish immediately without email confirmation
  // Use a deterministic placeholder for google_review_id (required NOT NULL pre-migration)
  const placeholderId = `platform-${crypto.randomUUID()}`

  const { error: legacyInsertError } = await client.from('reviews').insert({
    contractor_id: contractorId,
    google_review_id: placeholderId,
    reviewer_name: reviewerName,
    stars,
    review_text: reviewText,
    review_origin: 'platform',
    published_at: new Date().toISOString(),
  })

  if (legacyInsertError) {
    consola.error('Review insert error (legacy schema):', legacyInsertError)
    throw createError({ statusCode: 500, message: 'Failed to save review' })
  }

  return { success: true, message: 'Your review has been published.' }
})
