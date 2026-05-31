/**
 * GET /api/admin/accounts/contractors
 *
 * List all contractor accounts (business users) with their claimed profiles.
 *
 * Query params:
 * - status: 'active' | 'suspended' | 'deleted' | 'all' (default: 'all')
 * - search: string (search by email)
 * - limit: number (default: 20, max: 100)
 * - offset: number (default: 0)
 * - orderBy: 'created_at' | 'updated_at' (default: 'created_at')
 * - orderDirection: 'asc' | 'desc' (default: 'desc')
 */

import { z } from 'zod'
import { consola } from 'consola'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/supabase'
import type { ContractorAccountsResponse, ContractorAccount } from '~/types/accounts'

// Query parameter validation schema
const listContractorAccountsQuerySchema = z.object({
  status: z.enum(['active', 'suspended', 'deleted', 'all']).default('all'),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  orderBy: z.enum(['created_at', 'updated_at']).default('created_at'),
  orderDirection: z.enum(['asc', 'desc']).default('desc'),
})

export default defineEventHandler(async (event): Promise<ContractorAccountsResponse> => {
  // Require admin authentication
  const adminUserId = await requireAdmin(event)

  if (import.meta.dev) {
    consola.info('GET /api/admin/accounts/contractors - Fetching contractor accounts', { adminUserId })
  }

  // Parse and validate query parameters
  const query = getQuery(event)
  const parsed = listContractorAccountsQuerySchema.safeParse(query)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.errors[0]?.message || 'Invalid query parameters',
    })
  }

  const validatedQuery = parsed.data

  // Use service role client to access auth.users
  const adminClient = serverSupabaseServiceRole<Database>(event)

  // Build query for account_profiles where account_type = 'business'
  let dbQuery = adminClient
    .from('account_profiles')
    .select('*', { count: 'exact' })
    .eq('account_type', 'business')

  // Apply status filter
  if (validatedQuery.status !== 'all') {
    dbQuery = dbQuery.eq('status', validatedQuery.status)
  }

  // Apply ordering
  dbQuery = dbQuery.order(validatedQuery.orderBy, {
    ascending: validatedQuery.orderDirection === 'asc',
  })

  // Apply pagination
  dbQuery = dbQuery.range(
    validatedQuery.offset,
    validatedQuery.offset + validatedQuery.limit - 1
  )

  // Execute query
  const { data: profiles, count, error: dbError } = await dbQuery

  if (dbError) {
    consola.error('GET /api/admin/accounts/contractors - Database error:', dbError.message)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch contractor accounts',
    })
  }

  // Get auth user details and claimed profiles for each account
  const contractorAccounts: ContractorAccount[] = []

  if (profiles && profiles.length > 0) {
    // Fetch all auth users in one call
    const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers({
      perPage: 1000,
    })

    if (authError) {
      consola.error('GET /api/admin/accounts/contractors - Auth error:', authError.message)
      throw createError({
        statusCode: 500,
        message: 'Failed to fetch user details',
      })
    }

    // Create map for quick lookup
    const userMap = new Map(authUsers.users.map(u => [u.id, u]))

    // Fetch claimed contractors for all profiles
    const profileIds = profiles.map(p => p.id)
    const { data: claimedContractors, error: contractorsError } = await adminClient
      .from('contractors')
      .select('id, company_name, slug, claimed_by')
      .in('claimed_by', profileIds)
      .is('deleted_at', null)

    if (contractorsError) {
      consola.error('GET /api/admin/accounts/contractors - Contractors error:', contractorsError.message)
      throw createError({
        statusCode: 500,
        message: 'Failed to fetch claimed profiles',
      })
    }

    // Group contractors by claimed_by
    const contractorsByOwner = new Map<string, typeof claimedContractors>()
    for (const contractor of claimedContractors || []) {
      if (contractor.claimed_by) {
        const existing = contractorsByOwner.get(contractor.claimed_by) || []
        existing.push(contractor)
        contractorsByOwner.set(contractor.claimed_by, existing)
      }
    }

    // Combine profile data with auth user data and claimed profiles
    for (const profile of profiles) {
      const authUser = userMap.get(profile.id)
      const claimed = contractorsByOwner.get(profile.id) || []

      // Apply search filter (by email) - done here since auth.users isn't in account_profiles
      if (validatedQuery.search) {
        const searchLower = validatedQuery.search.toLowerCase()
        const email = authUser?.email?.toLowerCase() || ''
        const displayName = (authUser?.user_metadata?.display_name || '').toLowerCase()

        if (!email.includes(searchLower) && !displayName.includes(searchLower)) {
          continue
        }
      }

      contractorAccounts.push({
        ...profile,
        email: authUser?.email || 'Unknown',
        displayName: authUser?.user_metadata?.display_name || undefined,
        lastSignInAt: authUser?.last_sign_in_at || undefined,
        claimedProfiles: claimed.map(c => ({
          id: c.id,
          company_name: c.company_name,
          slug: c.slug,
        })),
        claimedProfileCount: claimed.length,
      })
    }
  }

  const total = count || 0
  const limit = validatedQuery.limit
  const offset = validatedQuery.offset

  if (import.meta.dev) {
    consola.success('GET /api/admin/accounts/contractors - Found', contractorAccounts.length, 'accounts')
  }

  return {
    success: true,
    data: contractorAccounts,
    pagination: {
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
      offset,
      totalPages: Math.ceil(total / limit),
    },
  }
})

