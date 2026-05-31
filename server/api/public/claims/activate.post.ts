/**
 * POST /api/public/claims/activate
 *
 * CRITICAL SECURITY ENDPOINT - Creates user accounts
 *
 * Activates an approved claim by creating a user account.
 * This endpoint must be bulletproof against:
 * - Token manipulation/guessing (UUID validation + DB lookup)
 * - Replay attacks (account_activated_at check + atomic update)
 * - Race conditions (re-verify after async operations)
 * - Status bypass (strict approved + email_verified checks)
 * - Information leakage (generic error messages)
 *
 * Required conditions for activation:
 * 1. Token is valid UUID format
 * 2. Token exists in business_claims.account_activation_token
 * 3. Claim status === 'approved' (admin-approved only)
 * 4. email_verified_at IS NOT NULL (email was verified)
 * 5. account_activated_at IS NULL (not already activated)
 * 6. account_activation_expires_at > now() (not expired)
 * 7. Password meets complexity requirements
 */

import { z } from 'zod'
import { consola } from 'consola'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/supabase'

// Strict password requirements
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

const activateRequestSchema = z.object({
  token: z.string().uuid('Invalid activation link'),
  password: passwordSchema,
})

export default defineEventHandler(async (event) => {
  const adminClient = serverSupabaseServiceRole<Database>(event)

  // ===== STEP 1: Parse and validate request =====
  const body = await readBody(event)
  const parsed = activateRequestSchema.safeParse(body)

  if (!parsed.success) {
    const errors = parsed.error.flatten()
    if (import.meta.dev) {
      consola.warn('[activate] Validation failed:', errors)
    }
    // Only reveal password errors, not token format (security)
    const passwordErrors = errors.fieldErrors.password
    if (passwordErrors && passwordErrors.length > 0) {
      throw createError({
        statusCode: 400,
        message: passwordErrors[0],
        data: { code: 'INVALID_PASSWORD' },
      })
    }
    throw createError({
      statusCode: 400,
      message: 'Invalid activation link',
      data: { code: 'INVALID_TOKEN' },
    })
  }

  const { token, password } = parsed.data

  // ===== STEP 2: Fetch and validate claim (atomic check) =====
  const { data: claim, error: claimError } = await adminClient
    .from('business_claims')
    .select(`
      id,
      contractor_id,
      claimant_email,
      claimant_name,
      status,
      email_verified_at,
      account_activation_token,
      account_activation_expires_at,
      account_activated_at,
      contractor:contractors!business_claims_contractor_id_fkey (
        id,
        company_name,
        is_claimed
      )
    `)
    .eq('account_activation_token', token)
    .maybeSingle()

  if (claimError) {
    consola.error('[activate] SECURITY: Database error during claim lookup:', claimError.message)
    throw createError({
      statusCode: 500,
      message: 'Unable to process activation',
    })
  }

  // ===== STEP 3: Validate all security conditions =====
  // Use a single generic error for all security failures (no information leakage)
  const securityError = createError({
    statusCode: 400,
    message: 'Invalid or expired activation link',
    data: { code: 'INVALID_TOKEN' },
  })

  // 3a. Token not found
  if (!claim) {
    consola.warn('[activate] SECURITY: Token not found in database')
    throw securityError
  }

  // 3b. Already activated (CRITICAL: prevent replay attacks)
  if (claim.account_activated_at) {
    consola.warn('[activate] SECURITY: Replay attack attempted on claim:', claim.id)
    throw createError({
      statusCode: 410,
      message: 'This account has already been activated',
      data: { code: 'ALREADY_ACTIVATED' },
    })
  }

  // 3c. Claim must be admin-approved
  if (claim.status !== 'approved') {
    consola.warn('[activate] SECURITY: Invalid status:', claim.status, 'for claim:', claim.id)
    throw securityError
  }

  // 3d. Email must be verified
  if (!claim.email_verified_at) {
    consola.warn('[activate] SECURITY: Email not verified for claim:', claim.id)
    throw securityError
  }

  // 3e. Token must not be expired
  if (claim.account_activation_expires_at) {
    const expiresAt = new Date(claim.account_activation_expires_at)
    if (expiresAt <= new Date()) {
      consola.warn('[activate] SECURITY: Expired token for claim:', claim.id)
      throw createError({
        statusCode: 410,
        message: 'This activation link has expired. Please contact support.',
        data: { code: 'TOKEN_EXPIRED' },
      })
    }
  }

  // 3f. Contractor must not already be claimed
  if (claim.contractor?.is_claimed) {
    consola.warn('[activate] SECURITY: Contractor already claimed:', claim.contractor_id)
    throw securityError
  }

  consola.info('[activate] All security checks passed for claim:', claim.id)

  // ===== STEP 4: Create auth user (with rollback capability) =====
  let createdUserId: string | null = null

  try {
    // Check if user already exists with this email
    const { data: existingUsers } = await adminClient.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(
      u => u.email?.toLowerCase() === claim.claimant_email.toLowerCase()
    )

    if (existingUser) {
      consola.warn('[activate] SECURITY: Email already registered:', claim.claimant_email)
      throw createError({
        statusCode: 409,
        message: 'An account with this email already exists. Please log in instead.',
        data: { code: 'EMAIL_EXISTS' },
      })
    }

    // Create auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: claim.claimant_email,
      password: password,
      email_confirm: true, // Already verified via claim flow
      user_metadata: {
        display_name: claim.claimant_name,
        claim_id: claim.id,
        contractor_id: claim.contractor_id,
      },
    })

    if (authError || !authData.user) {
      consola.error('[activate] CRITICAL: Failed to create auth user:', authError?.message)
      throw createError({
        statusCode: 500,
        message: 'Unable to create account. Please try again.',
      })
    }

    createdUserId = authData.user.id
    consola.info('[activate] Auth user created:', createdUserId)

    // ===== STEP 5: Create account_profiles entry =====
    const { error: profileError } = await adminClient
      .from('account_profiles')
      .insert({
        id: createdUserId,
        account_type: 'business',
        status: 'active',
        metadata: {
          activated_from_claim: claim.id,
          activated_at: new Date().toISOString(),
        },
      })

    if (profileError) {
      consola.error('[activate] CRITICAL: Failed to create profile, rolling back user:', profileError.message)
      // Rollback: delete the auth user
      await adminClient.auth.admin.deleteUser(createdUserId)
      throw createError({
        statusCode: 500,
        message: 'Unable to create account. Please try again.',
      })
    }

    consola.info('[activate] Account profile created for:', createdUserId)

    // ===== STEP 6: Update contractor (mark as claimed, generate embed token) =====
    const { error: contractorError } = await adminClient
      .from('contractors')
      .update({
        is_claimed: true,
        claimed_by: createdUserId,
        claimed_at: new Date().toISOString(),
        embed_token: crypto.randomUUID(),
      })
      .eq('id', claim.contractor_id)

    if (contractorError) {
      consola.error('[activate] CRITICAL: Failed to update contractor, rolling back:', contractorError.message)
      // Rollback: delete profile and auth user
      await adminClient.from('account_profiles').delete().eq('id', createdUserId)
      await adminClient.auth.admin.deleteUser(createdUserId)
      throw createError({
        statusCode: 500,
        message: 'Unable to create account. Please try again.',
      })
    }

    consola.info('[activate] Contractor marked as claimed:', claim.contractor_id)

    // ===== STEP 7: Update claim to completed (atomic finalization) =====
    // Re-verify the claim hasn't been activated by another request (race condition check)
    const { data: updatedClaim, error: updateError } = await adminClient
      .from('business_claims')
      .update({
        status: 'completed',
        account_activated_at: new Date().toISOString(),
        claimant_user_id: createdUserId,
      })
      .eq('id', claim.id)
      .is('account_activated_at', null) // CRITICAL: Only update if still null (use .is() for null checks)
      .select('id')
      .maybeSingle()

    if (updateError || !updatedClaim) {
      consola.error('[activate] CRITICAL: Race condition or update failed:', updateError?.message)
      // Rollback everything
      await adminClient.from('contractors').update({
        is_claimed: false,
        claimed_by: null,
        claimed_at: null,
      }).eq('id', claim.contractor_id)
      await adminClient.from('account_profiles').delete().eq('id', createdUserId)
      await adminClient.auth.admin.deleteUser(createdUserId)
      throw createError({
        statusCode: 409,
        message: 'This activation link has already been used.',
        data: { code: 'ALREADY_ACTIVATED' },
      })
    }

    consola.success('[activate] SUCCESS: Account activated for claim:', claim.id)

    // ===== STEP 8: Return success =====
    return {
      success: true,
      message: 'Account activated successfully',
      redirectUrl: '/owner/onboarding',
      contractorName: claim.contractor?.company_name,
    }

  } catch (error) {
    const statusCode = typeof error === 'object' && error !== null && 'statusCode' in error
      ? (error as { statusCode?: number }).statusCode
      : undefined

    // If we created a user but hit an error, ensure cleanup
    if (createdUserId && statusCode !== 409) {
      consola.warn('[activate] Cleaning up partial user creation:', createdUserId)
      try {
        await adminClient.from('account_profiles').delete().eq('id', createdUserId)
        await adminClient.auth.admin.deleteUser(createdUserId)
      } catch (cleanupError) {
        consola.error('[activate] CRITICAL: Cleanup failed:', cleanupError)
      }
    }
    throw error
  }
})

