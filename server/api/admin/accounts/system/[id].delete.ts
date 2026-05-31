/**
 * DELETE /api/admin/accounts/system/[id]
 *
 * Soft delete a system account by setting status to 'deleted'.
 *
 * @param {string} id - Account UUID
 * @returns {Object} Success message
 */

import { z } from 'zod'
import { consola } from 'consola'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/supabase'
import type { UpdateAccountResponse } from '~/types/accounts'

// UUID validation
const uuidSchema = z.string().uuid('Invalid account ID')

export default defineEventHandler(async (event): Promise<UpdateAccountResponse> => {
  // Require admin authentication
  const adminUserId = await requireAdmin(event)

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
    consola.info('DELETE /api/admin/accounts/system/[id] - Deleting account', { adminUserId, accountId })
  }

  // Prevent self-deletion
  if (accountId === adminUserId) {
    throw createError({
      statusCode: 400,
      message: 'You cannot delete your own account',
    })
  }

  // Use service role client
  const adminClient = serverSupabaseServiceRole<Database>(event)

  // Verify account exists and is a system account
  const { data: profile, error: fetchError } = await adminClient
    .from('account_profiles')
    .select('id, account_type, status')
    .eq('id', accountId)
    .eq('account_type', 'admin')
    .maybeSingle()

  if (fetchError) {
    consola.error('DELETE /api/admin/accounts/system/[id] - Fetch error:', fetchError.message)
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

  if (profile.status === 'deleted') {
    throw createError({
      statusCode: 400,
      message: 'Account is already deleted',
    })
  }

  // Soft delete by setting status to 'deleted'
  const { error: updateError } = await adminClient
    .from('account_profiles')
    .update({
      status: 'deleted',
      updated_at: new Date().toISOString(),
      metadata: {
        deleted_by: adminUserId,
        deleted_at: new Date().toISOString(),
      },
    })
    .eq('id', accountId)

  if (updateError) {
    consola.error('DELETE /api/admin/accounts/system/[id] - Delete error:', updateError.message)
    throw createError({
      statusCode: 500,
      message: 'Failed to delete account',
    })
  }

  consola.success('DELETE /api/admin/accounts/system/[id] - Account deleted:', accountId)

  return {
    success: true,
    message: 'Account deleted successfully',
  }
})

