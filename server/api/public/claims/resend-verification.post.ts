/**
 * POST /api/public/claims/resend-verification
 *
 * Public endpoint to resend the verification email for an expired claim.
 * Called when user clicks "Resend verification email" on the expired token page.
 *
 * Flow:
 * 1. Find claim by email + contractor_id (or claim_id if provided)
 * 2. Validate claim exists and is in 'unverified' status
 * 3. Generate new token + 24-hour expiry
 * 4. Send new verification email
 * 5. Return success/error response
 */

import { z } from 'zod'
import { consola } from 'consola'
import { serverSupabaseServiceRole } from '#supabase/server'
import { EmailService } from '../../../services/EmailService'
import type { Database } from '~/types/supabase'

const resendRequestSchema = z.object({
  // Can resend by claimId (from expired token page)
  claimId: z.string().uuid().optional(),
  // Or by email + contractorId (from form)
  email: z.string().email().optional(),
  contractorId: z.string().uuid().optional(),
}).refine(
  (data) => data.claimId || (data.email && data.contractorId),
  { message: 'Either claimId or both email and contractorId are required' }
)

// Token expiry duration (must match index.post.ts)
const EMAIL_VERIFICATION_EXPIRY_HOURS = 24

export default defineEventHandler(async (event) => {
  // Use service role client to bypass RLS for public claim operations
  const client = serverSupabaseServiceRole<Database>(event)

  // Parse and validate request body
  const body = await readBody(event)
  const parsed = resendRequestSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request',
      data: parsed.error.flatten().fieldErrors,
    })
  }

  const { claimId, email, contractorId } = parsed.data

  // Build query to find the claim
  let query = client
    .from('business_claims')
    .select(`
      id,
      status,
      claimant_email,
      claimant_name,
      contractor_id,
      contractor:contractors!inner(id, company_name)
    `)

  if (claimId) {
    query = query.eq('id', claimId)
  } else {
    query = query.eq('claimant_email', email!).eq('contractor_id', contractorId!)
  }

  const { data: claim, error: claimError } = await query.single()

  if (claimError || !claim) {
    consola.warn('Resend verification failed - claim not found')
    throw createError({
      statusCode: 404,
      message: 'No pending claim found. Please submit a new claim.',
    })
  }

  // Validate claim is in unverified status
  if (claim.status !== 'unverified') {
    if (claim.status === 'pending') {
      return {
        success: true,
        message: 'Your email has already been verified. Our team is reviewing your claim.',
        alreadyVerified: true,
      }
    }
    throw createError({
      statusCode: 400,
      message: `Cannot resend verification for a claim with status: ${claim.status}`,
    })
  }

  // Generate new verification token and expiry
  const now = new Date()
  const newToken = crypto.randomUUID()
  const newExpiresAt = new Date(now.getTime() + EMAIL_VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000)

  // Update claim with new token
  const { error: updateError } = await client
    .from('business_claims')
    .update({
      email_verification_token: newToken,
      email_verification_expires_at: newExpiresAt.toISOString(),
    })
    .eq('id', claim.id)

  if (updateError) {
    consola.error(`Failed to update verification token for claim ${claim.id}:`, updateError)
    throw createError({
      statusCode: 500,
      message: 'Failed to resend verification email. Please try again.',
    })
  }

  // Send new verification email
  const config = useRuntimeConfig()
  const businessName = (claim.contractor as { company_name: string })?.company_name || 'your business'

  if (config.resendApiKey) {
    const emailService = new EmailService({
      apiKey: config.resendApiKey,
      fromEmail: 'noreply@mail.costoflandscape.com',
      siteName: config.public.siteName || 'Cost of Landscaping',
      siteUrl: config.public.siteUrl || 'https://costoflandscaping.com',
    })

    // Fire and forget - don't block the response
    emailService.sendVerificationResendEmail({
      claimantEmail: claim.claimant_email,
      claimantName: claim.claimant_name,
      businessName,
      verificationToken: newToken,
    }).catch((err) => {
      consola.error('Failed to send verification resend email:', err)
    })
  }

  consola.success(`Verification email resent for claim ${claim.id} to ${claim.claimant_email}`)

  return {
    success: true,
    message: 'A new verification email has been sent. Please check your inbox.',
    alreadyVerified: false,
  }
})

