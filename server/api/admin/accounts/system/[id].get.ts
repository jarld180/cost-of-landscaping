/**
 * GET /api/admin/accounts/system/[id]
 *
 * Get details of a single system account.
 *
 * @param {string} id - Account UUID
 * @returns {Object} System account details
 */

import { z } from 'zod'
import { consola } from 'consola'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/supabase'
import type { SystemAccount } from '~/types/accounts'

// UUID validation
const uuidSchema = z.string().uuid('Invalid account ID')

export default defineEventHandler(async (event): Promise<{ success: boolean; data: SystemAccount }> => {
  // Require admin authentication
  const userId = await requireAdmin(event)

  // Get and validate account ID
  const accountId = getRouterParam(event, 'id')

  if (!accountId) {
    throw createError({
      statusCode: 400,
      message: 'Account ID is required',
    })
  }

  const validatedId = uuidSchema.safeParse(accountId)
  if (!validatedId.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid account ID format',
    })
  }

  if (import.meta.dev) {
    consola.info('GET /api/admin/accounts/system/[id] - Fetching account', { userId, accountId })
  }

  // Use service role client
  const adminClient = serverSupabaseServiceRole<Database>(event)

  // Fetch account profile
  const { data: profile, error: dbError } = await adminClient
    .from('account_profiles')
    .select('*')
    .eq('id', accountId)
    .eq('account_type', 'admin')
    .maybeSingle()

  if (dbError) {
    consola.error('GET /api/admin/accounts/system/[id] - Database error:', dbError.message)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch account',
    })
  }

  if (!profile) {
    throw createError({
      statusCode: 404,
      message: 'System account not found',
    })
  }

  // Fetch auth user details
  const { data: authUser, error: authError } = await adminClient.auth.admin.getUserById(accountId)

  if (authError) {
    consola.error('GET /api/admin/accounts/system/[id] - Auth error:', authError.message)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch user details',
    })
  }

  const systemAccount: SystemAccount = {
    ...profile,
    email: authUser.user?.email || 'Unknown',
    displayName: authUser.user?.user_metadata?.display_name || undefined,
    lastSignInAt: authUser.user?.last_sign_in_at || undefined,
  }

  if (import.meta.dev) {
    consola.success('GET /api/admin/accounts/system/[id] - Account found:', systemAccount.email)
  }

  return {
    success: true,
    data: systemAccount,
  }
})

