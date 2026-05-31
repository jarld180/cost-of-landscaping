/**
 * GET /api/admin/accounts/contractors/[id]
 *
 * Get a single contractor account with all claimed profiles.
 *
 * @param {string} id - Account UUID
 * @returns {Object} Contractor account with claimed profiles
 */

import { z } from 'zod'
import { consola } from 'consola'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/supabase'
import type { ContractorAccount } from '~/types/accounts'

// UUID validation
const uuidSchema = z.string().uuid('Invalid account ID')

export default defineEventHandler(async (event): Promise<{ success: boolean; data: ContractorAccount }> => {
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
    consola.info('GET /api/admin/accounts/contractors/[id] - Fetching account', { adminUserId, accountId })
  }

  // Use service role client
  const adminClient = serverSupabaseServiceRole<Database>(event)

  // Fetch account profile
  const { data: profile, error: fetchError } = await adminClient
    .from('account_profiles')
    .select('*')
    .eq('id', accountId)
    .eq('account_type', 'business')
    .maybeSingle()

  if (fetchError) {
    consola.error('GET /api/admin/accounts/contractors/[id] - Fetch error:', fetchError.message)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch account',
    })
  }

  if (!profile) {
    throw createError({
      statusCode: 404,
      message: 'Contractor account not found',
    })
  }

  // Fetch auth user details
  const { data: authUser, error: authError } = await adminClient.auth.admin.getUserById(accountId)

  if (authError) {
    consola.error('GET /api/admin/accounts/contractors/[id] - Auth error:', authError.message)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch user details',
    })
  }

  // Fetch all claimed contractors
  const { data: claimedContractors, error: contractorsError } = await adminClient
    .from('contractors')
    .select('id, company_name, slug')
    .eq('claimed_by', accountId)
    .is('deleted_at', null)
    .order('company_name', { ascending: true })

  if (contractorsError) {
    consola.error('GET /api/admin/accounts/contractors/[id] - Contractors error:', contractorsError.message)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch claimed profiles',
    })
  }

  const contractorAccount: ContractorAccount = {
    ...profile,
    email: authUser.user?.email || 'Unknown',
    displayName: authUser.user?.user_metadata?.display_name || undefined,
    lastSignInAt: authUser.user?.last_sign_in_at || undefined,
    claimedProfiles: (claimedContractors || []).map(c => ({
      id: c.id,
      company_name: c.company_name,
      slug: c.slug,
    })),
    claimedProfileCount: claimedContractors?.length || 0,
  }

  if (import.meta.dev) {
    consola.success('GET /api/admin/accounts/contractors/[id] - Account found:', contractorAccount.email)
  }

  return {
    success: true,
    data: contractorAccount,
  }
})

