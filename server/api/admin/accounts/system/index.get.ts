/**
 * GET /api/admin/accounts/system
 *
 * List system accounts (CoC staff users) with filters and pagination.
 *
 * Query Parameters:
 * - status: Filter by account status (active, suspended, deleted, all)
 * - search: Search by email
 * - limit: Number of results (default: 20, max: 100)
 * - offset: Pagination offset (default: 0)
 * - orderBy: Sort field (created_at, updated_at)
 * - orderDirection: Sort direction (asc, desc)
 *
 * @returns {Object} List of system accounts with pagination info
 */

import { z } from 'zod'
import { consola } from 'consola'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/supabase'
import type { SystemAccountsResponse, SystemAccount } from '~/types/accounts'

// Query parameter validation schema
const listSystemAccountsQuerySchema = z.object({
  status: z.enum(['active', 'suspended', 'deleted', 'all']).default('all'),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  orderBy: z.enum(['created_at', 'updated_at']).default('created_at'),
  orderDirection: z.enum(['asc', 'desc']).default('desc'),
})

export default defineEventHandler(async (event): Promise<SystemAccountsResponse> => {
  // Require admin authentication
  const userId = await requireAdmin(event)

  if (import.meta.dev) {
    consola.info('GET /api/admin/accounts/system - Listing system accounts', { userId })
  }

  // Get and validate query parameters
  const query = getQuery(event)
  const validatedQuery = listSystemAccountsQuerySchema.parse(query)

  if (import.meta.dev) {
    consola.info('GET /api/admin/accounts/system - Query params:', validatedQuery)
  }

  // Use service role client to access auth.users
  const adminClient = serverSupabaseServiceRole<Database>(event)

  // Build query for account_profiles where account_type = 'admin'
  let dbQuery = adminClient
    .from('account_profiles')
    .select('*', { count: 'exact' })
    .eq('account_type', 'admin')

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
    consola.error('GET /api/admin/accounts/system - Database error:', dbError.message)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch system accounts',
    })
  }

  // Get auth user details for each profile
  const systemAccounts: SystemAccount[] = []

  if (profiles && profiles.length > 0) {
    // Fetch all auth users in one call
    const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers({
      perPage: 1000, // Get all users
    })

    if (authError) {
      consola.error('GET /api/admin/accounts/system - Auth error:', authError.message)
      throw createError({
        statusCode: 500,
        message: 'Failed to fetch user details',
      })
    }

    // Create a map for quick lookup
    const userMap = new Map(authUsers.users.map(u => [u.id, u]))

    // Combine profile data with auth user data
    for (const profile of profiles) {
      const authUser = userMap.get(profile.id)

      // Apply search filter (by email) - done here since auth.users isn't in account_profiles
      if (validatedQuery.search) {
        const searchLower = validatedQuery.search.toLowerCase()
        const email = authUser?.email?.toLowerCase() || ''
        const displayName = (authUser?.user_metadata?.display_name || '').toLowerCase()

        if (!email.includes(searchLower) && !displayName.includes(searchLower)) {
          continue // Skip this user if search doesn't match
        }
      }

      systemAccounts.push({
        ...profile,
        email: authUser?.email || 'Unknown',
        displayName: authUser?.user_metadata?.display_name || undefined,
        lastSignInAt: authUser?.last_sign_in_at || undefined,
      })
    }
  }

  // Calculate pagination
  const total = count || 0
  const totalPages = Math.ceil(total / validatedQuery.limit)

  if (import.meta.dev) {
    consola.success(`GET /api/admin/accounts/system - Found ${systemAccounts.length} accounts`)
  }

  return {
    success: true,
    data: systemAccounts,
    pagination: {
      total,
      page: Math.floor(validatedQuery.offset / validatedQuery.limit) + 1,
      limit: validatedQuery.limit,
      offset: validatedQuery.offset,
      totalPages,
    },
  }
})

