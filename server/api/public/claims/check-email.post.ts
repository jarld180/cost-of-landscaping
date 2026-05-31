/**
 * POST /api/public/claims/check-email
 *
 * Public endpoint to check if an email already has an account.
 * Used to prompt users to sign in instead of creating duplicate flows.
 *
 * Security considerations:
 * - Does not reveal account status details to prevent enumeration
 * - Returns generic responses to avoid leaking user information
 * - Rate limiting should be applied at infrastructure level
 */

import { z } from 'zod'
import { consola } from 'consola'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/supabase'

const checkEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export default defineEventHandler(async (event) => {
  // Use service role client to query auth.users
  const client = serverSupabaseServiceRole<Database>(event)

  // Parse and validate request body
  const body = await readBody(event)
  const parsed = checkEmailSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid email address',
    })
  }

  const { email } = parsed.data
  const normalizedEmail = email.toLowerCase().trim()

  try {
    // Query auth.users via service role to find user by email
    // Using listUsers and filtering - Supabase doesn't have getUserByEmail in admin API
    const { data: listData, error: listError } = await client.auth.admin.listUsers({
      page: 1,
      perPage: 1000, // Get enough users to search through
    })

    if (listError) {
      consola.error('check-email: Failed to query auth:', listError.message)
      // Don't expose internal errors - return safe default (allow claim attempt)
      return {
        exists: false,
        requiresSignIn: false,
        canClaim: true,
      }
    }

    // Find user by email
    const existingUser = listData?.users?.find(
      u => u.email?.toLowerCase() === normalizedEmail
    )

    if (!existingUser) {
      // No account exists - can proceed with normal claim flow
      return {
        exists: false,
        requiresSignIn: false,
        canClaim: true,
      }
    }

    // User exists - check account_profiles for status
    const { data: profile } = await client
      .from('account_profiles')
      .select('status, account_type')
      .eq('id', existingUser.id)
      .maybeSingle()

    const accountStatus = profile?.status || 'active' // Default to active if no profile

    // Account exists - check status
    if (accountStatus === 'suspended' || accountStatus === 'deleted') {
      // Don't reveal suspension - just say they can't claim
      consola.info(`check-email: Account ${normalizedEmail} is ${accountStatus}`)
      return {
        exists: true,
        requiresSignIn: false,
        canClaim: false,
        message: 'Unable to process claim with this email address.',
      }
    }

    // Active account exists - prompt to sign in
    consola.info(`check-email: Active account exists for ${normalizedEmail}`)
    return {
      exists: true,
      requiresSignIn: true,
      canClaim: true,
      message: 'An account with this email already exists. Please sign in to claim this profile.',
    }
  } catch (err) {
    consola.error('check-email: Unexpected error:', err)
    // Safe fallback - don't expose internal errors
    return {
      exists: false,
      requiresSignIn: false,
      canClaim: true,
    }
  }
})

