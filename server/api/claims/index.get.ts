/**
 * GET /api/claims
 *
 * List business claims with filters and pagination (admin only).
 *
 * Query Parameters:
 * - status: Filter by claim status (pending, approved, rejected)
 * - search: Search by claimant name or email
 * - limit: Number of results (default: 20, max: 100)
 * - offset: Pagination offset (default: 0)
 * - orderBy: Sort field (created_at, updated_at)
 * - orderDirection: Sort direction (asc, desc)
 *
 * @returns {Object} List of claims with contractor and pagination info
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { requireAdmin } from '../../utils/auth'
import type { Database } from '../../../app/types/supabase'
import { z } from 'zod'

// Valid claim statuses matching database constraint
const CLAIM_STATUSES = ['unverified', 'pending', 'approved', 'rejected', 'completed'] as const

// Query schema
const listClaimsQuerySchema = z.object({
  status: z.enum([...CLAIM_STATUSES, 'all']).optional().default('pending'),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  orderBy: z.enum(['created_at', 'updated_at']).optional().default('created_at'),
  orderDirection: z.enum(['asc', 'desc']).optional().default('desc'),
})

export default defineEventHandler(async (event) => {
  try {
    // Require admin authentication
    const userId = await requireAdmin(event)

    if (import.meta.dev) {
      consola.info('GET /api/claims - Listing claims', { userId })
    }

    // Get and validate query parameters
    const query = getQuery(event)
    const validatedQuery = listClaimsQuerySchema.parse(query)

    if (import.meta.dev) {
      consola.info('GET /api/claims - Query params:', validatedQuery)
    }

    // Get Supabase client
    const client = await serverSupabaseClient<Database>(event)

    // Build query with contractor join
    let dbQuery = client
      .from('business_claims')
      .select(`
        *,
        contractor:contractors!business_claims_contractor_id_fkey (
          id,
          company_name,
          slug,
          email,
          phone
        )
      `, { count: 'exact' })

    // Apply status filter (default is 'pending', 'all' shows everything)
    if (validatedQuery.status && validatedQuery.status !== 'all') {
      dbQuery = dbQuery.eq('status', validatedQuery.status)
    }

    // Apply search filter (claimant name or email)
    if (validatedQuery.search) {
      dbQuery = dbQuery.or(`claimant_name.ilike.%${validatedQuery.search}%,claimant_email.ilike.%${validatedQuery.search}%`)
    }

    // Apply ordering
    dbQuery = dbQuery.order(validatedQuery.orderBy, { ascending: validatedQuery.orderDirection === 'asc' })

    // Apply pagination
    dbQuery = dbQuery.range(validatedQuery.offset, validatedQuery.offset + validatedQuery.limit - 1)

    const { data: claims, error, count } = await dbQuery

    if (error) {
      consola.error('GET /api/claims - Database error:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Internal Server Error',
        message: 'Failed to fetch claims',
      })
    }

    const total = count || 0
    const totalPages = Math.ceil(total / validatedQuery.limit)

    if (import.meta.dev) {
      consola.success('GET /api/claims - Retrieved claims:', { count: claims?.length, total })
    }

    return {
      success: true,
      data: claims || [],
      pagination: {
        total,
        page: Math.floor(validatedQuery.offset / validatedQuery.limit) + 1,
        limit: validatedQuery.limit,
        offset: validatedQuery.offset,
        totalPages,
      },
    }
  } catch (error) {
    if (import.meta.dev) {
      consola.error('GET /api/claims - Error:', error)
    }

    // Re-throw HTTP errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Invalid query parameters',
        data: error.errors,
      })
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'An unexpected error occurred',
    })
  }
})

