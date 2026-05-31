/**
 * POST /api/public/claims/validate-activation
 *
 * Validates an activation token for the activate page.
 * Returns contractor name and claimant email for display.
 * Does NOT perform any write operations - read-only validation.
 *
 * Security:
 * - Read-only endpoint
 * - Generic error messages to prevent information leakage
 * - Validates all required claim states
 */

import { z } from 'zod'
import { consola } from 'consola'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/supabase'

const validateTokenSchema = z.object({
  token: z.string().uuid('Invalid token format'),
})

// Token expiry: 7 days
const ACTIVATION_TOKEN_EXPIRY_DAYS = 7

export default defineEventHandler(async (event) => {
  // Use service role to bypass RLS for reading claim data
  const client = serverSupabaseServiceRole<Database>(event)

  // Parse and validate request body
  const body = await readBody(event)
  const parsed = validateTokenSchema.safeParse(body)

  if (!parsed.success) {
    if (import.meta.dev) {
      consola.warn('[validate-activation] Invalid token format:', parsed.error.flatten())
    }
    throw createError({
      statusCode: 400,
      message: 'Invalid activation link',
      data: { code: 'INVALID_TOKEN' },
    })
  }

  const { token } = parsed.data

  // Find claim by activation token
  const { data: claim, error: claimError } = await client
    .from('business_claims')
    .select(`
      id,
      status,
      claimant_email,
      email_verified_at,
      account_activation_token,
      account_activation_expires_at,
      account_activated_at,
      contractor:contractors!business_claims_contractor_id_fkey (
        id,
        company_name
      )
    `)
    .eq('account_activation_token', token)
    .maybeSingle()

  if (claimError) {
    consola.error('[validate-activation] Database error:', claimError.message)
    throw createError({
      statusCode: 500,
      message: 'Unable to validate activation link',
    })
  }

  // Token not found - generic error
  if (!claim) {
    if (import.meta.dev) {
      consola.warn('[validate-activation] Token not found:', token)
    }
    throw createError({
      statusCode: 404,
      message: 'Invalid or expired activation link',
      data: { code: 'INVALID_TOKEN' },
    })
  }

  // Already activated - prevent replay
  if (claim.account_activated_at) {
    if (import.meta.dev) {
      consola.warn('[validate-activation] Already activated:', claim.id)
    }
    throw createError({
      statusCode: 410,
      message: 'This account has already been activated',
      data: { code: 'ALREADY_ACTIVATED' },
    })
  }

  // Claim must be in approved status
  if (claim.status !== 'approved') {
    if (import.meta.dev) {
      consola.warn('[validate-activation] Invalid claim status:', claim.status)
    }
    throw createError({
      statusCode: 400,
      message: 'Invalid activation link',
      data: { code: 'INVALID_TOKEN' },
    })
  }

  // Email must be verified
  if (!claim.email_verified_at) {
    if (import.meta.dev) {
      consola.warn('[validate-activation] Email not verified:', claim.id)
    }
    throw createError({
      statusCode: 400,
      message: 'Invalid activation link',
      data: { code: 'INVALID_TOKEN' },
    })
  }

  // Check token expiry
  if (claim.account_activation_expires_at) {
    const expiresAt = new Date(claim.account_activation_expires_at)
    if (expiresAt <= new Date()) {
      if (import.meta.dev) {
        consola.warn('[validate-activation] Token expired:', claim.id)
      }
      throw createError({
        statusCode: 410,
        message: 'This activation link has expired. Please contact support.',
        data: { code: 'TOKEN_EXPIRED', claimId: claim.id },
      })
    }
  }

  // All validations passed
  const contractorName = claim.contractor?.company_name || 'Unknown Business'

  if (import.meta.dev) {
    consola.success('[validate-activation] Token valid for:', contractorName)
  }

  return {
    success: true,
    valid: true,
    contractorName,
    claimantEmail: claim.claimant_email,
  }
})

