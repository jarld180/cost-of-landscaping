/**
 * POST /api/admin/accounts/system/invite
 *
 * Invite a new system account (CoC staff user) by email.
 *
 * Uses Supabase Admin API to send an invitation email.
 * Creates an account_profiles entry with account_type = 'admin'.
 *
 * @param {string} email - Email address to invite
 * @param {string} displayName - Optional display name
 * @returns {Object} Success message and account ID
 */

import { z } from 'zod'
import { consola } from 'consola'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/supabase'
import type { InviteSystemUserResponse } from '~/types/accounts'

// Request body validation schema
const inviteRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  displayName: z.string().min(1).max(100).optional(),
})

export default defineEventHandler(async (event): Promise<InviteSystemUserResponse> => {
  // Require admin authentication
  const adminUserId = await requireAdmin(event)

  if (import.meta.dev) {
    consola.info('POST /api/admin/accounts/system/invite - Inviting system user', { adminUserId })
  }

  // Parse and validate request body
  const body = await readBody(event)
  const parsed = inviteRequestSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.errors[0]?.message || 'Invalid request data',
    })
  }

  const { email, displayName } = parsed.data

  // Use service role client for admin operations
  const adminClient = serverSupabaseServiceRole<Database>(event)

  // Check if user already exists
  const { data: existingUsers } = await adminClient.auth.admin.listUsers()
  const existingUser = existingUsers?.users.find(u => u.email?.toLowerCase() === email.toLowerCase())

  if (existingUser) {
    // Check if they already have an admin account_profile
    const { data: existingProfile } = await adminClient
      .from('account_profiles')
      .select('id, account_type, status')
      .eq('id', existingUser.id)
      .maybeSingle()

    if (existingProfile) {
      if (existingProfile.account_type === 'admin') {
        throw createError({
          statusCode: 409,
          message: 'This email is already registered as a system account',
        })
      } else {
        throw createError({
          statusCode: 409,
          message: 'This email is registered as a contractor account. Cannot convert to system account.',
        })
      }
    }
  }

  // Invite user via Supabase Admin API
  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    email,
    {
      data: {
        display_name: displayName || email.split('@')[0],
        invited_by: adminUserId,
        account_type: 'admin',
      },
      redirectTo: `${getRequestURL(event).origin}/admin`,
    }
  )

  if (inviteError) {
    consola.error('POST /api/admin/accounts/system/invite - Invite error:', inviteError.message)

    // Handle specific errors
    if (inviteError.message.includes('already registered')) {
      throw createError({
        statusCode: 409,
        message: 'This email is already registered',
      })
    }

    throw createError({
      statusCode: 500,
      message: 'Failed to send invitation email',
    })
  }

  if (!inviteData.user) {
    throw createError({
      statusCode: 500,
      message: 'Failed to create user account',
    })
  }

  // Create account_profiles entry
  const { error: profileError } = await adminClient
    .from('account_profiles')
    .insert({
      id: inviteData.user.id,
      account_type: 'admin',
      status: 'active',
      metadata: {
        invited_by: adminUserId,
        invited_at: new Date().toISOString(),
      },
    })

  if (profileError) {
    consola.error('POST /api/admin/accounts/system/invite - Profile error:', profileError.message)
    // Don't fail the request - the user is created, profile can be fixed later
    consola.warn('User invited but profile creation failed - will be created on first login')
  }

  consola.success('POST /api/admin/accounts/system/invite - User invited:', email)

  return {
    success: true,
    message: `Invitation sent to ${email}`,
    accountId: inviteData.user.id,
  }
})

