/**
 * PATCH /api/admin/accounts/system/[id]
 *
 * Update a system account's status (suspend/reactivate).
 *
 * @param {string} id - Account UUID
 * @param {string} status - New status: 'active' | 'suspended'
 * @returns {Object} Success message
 */

import { z } from 'zod'
import { consola } from 'consola'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/supabase'
import type { UpdateAccountResponse } from '~/types/accounts'

// UUID validation
const uuidSchema = z.string().uuid('Invalid account ID')

// Request body validation
const updateStatusSchema = z.object({
  status: z.enum(['active', 'suspended'], {
    errorMap: () => ({ message: 'Status must be "active" or "suspended"' }),
  }),
})

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

  // Parse and validate request body
  const body = await readBody(event)
  const parsed = updateStatusSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.errors[0]?.message || 'Invalid request data',
    })
  }

  const { status } = parsed.data

  if (import.meta.dev) {
    consola.info('PATCH /api/admin/accounts/system/[id] - Updating account', { adminUserId, accountId, status })
  }

  // Prevent self-suspension
  if (accountId === adminUserId && status === 'suspended') {
    throw createError({
      statusCode: 400,
      message: 'You cannot suspend your own account',
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
    consola.error('PATCH /api/admin/accounts/system/[id] - Fetch error:', fetchError.message)
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

  // Update status
  const { error: updateError } = await adminClient
    .from('account_profiles')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', accountId)

  if (updateError) {
    consola.error('PATCH /api/admin/accounts/system/[id] - Update error:', updateError.message)
    throw createError({
      statusCode: 500,
      message: 'Failed to update account',
    })
  }

  const action = status === 'suspended' ? 'suspended' : 'reactivated'
  consola.success(`PATCH /api/admin/accounts/system/[id] - Account ${action}:`, accountId)

  return {
    success: true,
    message: `Account ${action} successfully`,
  }
})

