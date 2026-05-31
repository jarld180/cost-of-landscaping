/**
 * POST /api/public/claims/verify
 *
 * Public endpoint to verify an email address for a business claim.
 * Called when user clicks the verification link in their email.
 *
 * Flow:
 * 1. Validates the token exists and is not expired
 * 2. Sets email_verified_at = now()
 * 3. Updates status from 'unverified' to 'pending'
 * 4. Returns success with contractor name, or error details
 */

import { z } from 'zod'
import { consola } from 'consola'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/supabase'

const verifyRequestSchema = z.object({
  token: z.string().uuid('Invalid verification token'),
})

export default defineEventHandler(async (event) => {
  // Use service role client to bypass RLS for public claim verification
  const client = serverSupabaseServiceRole<Database>(event)

  // Parse and validate request body
  const body = await readBody(event)
  const parsed = verifyRequestSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request',
      data: parsed.error.flatten().fieldErrors,
    })
  }

  const { token } = parsed.data

  // Find claim by verification token
  const { data: claim, error: claimError } = await client
    .from('business_claims')
    .select(`
      id,
      status,
      email_verified_at,
      email_verification_expires_at,
      claimant_email,
      contractor:contractors!inner(id, company_name)
    `)
    .eq('email_verification_token', token)
    .single()

  if (claimError || !claim) {
    consola.warn(`Verification failed - invalid token: ${token}`)
    throw createError({
      statusCode: 404,
      message: 'Invalid verification link. Please submit a new claim.',
      data: { code: 'INVALID_TOKEN' },
    })
  }

  // Check if already verified
  if (claim.email_verified_at) {
    consola.info(`Claim ${claim.id} already verified`)
    return {
      success: true,
      message: 'Your email has already been verified. Our team is reviewing your claim.',
      claimId: claim.id,
      contractorName: (claim.contractor as { company_name: string })?.company_name,
      alreadyVerified: true,
    }
  }

  // Check if token is expired
  const now = new Date()
  const expiresAt = claim.email_verification_expires_at
    ? new Date(claim.email_verification_expires_at)
    : null

  if (expiresAt && expiresAt < now) {
    consola.warn(`Verification failed - token expired for claim ${claim.id}`)
    throw createError({
      statusCode: 410,
      message: 'This verification link has expired. Please request a new one.',
      data: {
        code: 'TOKEN_EXPIRED',
        claimId: claim.id,
        claimantEmail: claim.claimant_email,
      },
    })
  }

  // Verify the email - update claim status
  const { error: updateError } = await client
    .from('business_claims')
    .update({
      email_verified_at: now.toISOString(),
      status: 'pending',
    })
    .eq('id', claim.id)

  if (updateError) {
    consola.error(`Failed to verify claim ${claim.id}:`, updateError)
    throw createError({
      statusCode: 500,
      message: 'Failed to verify email. Please try again.',
    })
  }

  const contractorName = (claim.contractor as { company_name: string })?.company_name
  consola.success(`Email verified for claim ${claim.id} - ${contractorName}`)

  return {
    success: true,
    message: 'Email verified! Our team will review your claim shortly.',
    claimId: claim.id,
    contractorName,
    alreadyVerified: false,
  }
})

