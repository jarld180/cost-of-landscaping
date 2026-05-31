/**
 * GET /api/contractors/count
 *
 * Count contractors matching optional filters (admin only).
 *
 * Query Parameters:
 * - cityId: Filter by city UUID
 * - category: Filter by category slug (searches metadata.categories[])
 * - status: Filter by status (pending, active, suspended)
 * - search: Search by company name
 *
 * @returns {Object} Count of matching contractors
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { countContractorQuerySchema } from '../../schemas/contractor.schemas'
import { requireAdmin } from '../../utils/auth'
import { applyContractorFilters } from '../../utils/contractorFilters'
import type { Database } from '../../../app/types/supabase'

export default defineEventHandler(async (event) => {
  try {
    // Require admin authentication
    const userId = await requireAdmin(event)

    if (import.meta.dev) {
      consola.info('GET /api/contractors/count - Counting contractors', { userId })
    }

    // Get and validate query parameters
    const query = getQuery(event)
    const validatedQuery = countContractorQuerySchema.parse(query)

    if (import.meta.dev) {
      consola.info('GET /api/contractors/count - Query params:', validatedQuery)
    }

    // Get Supabase client
    const client = await serverSupabaseClient<Database>(event)

    // Build count query
    let dbQuery = client
      .from('contractors')
      .select('id', { count: 'exact', head: true })

    // Apply filters
    dbQuery = applyContractorFilters(dbQuery, validatedQuery)

    const { count, error } = await dbQuery

    if (error) {
      consola.error('GET /api/contractors/count - Database error:', error)
      throw error
    }

    if (import.meta.dev) {
      consola.success(`GET /api/contractors/count - Returning count: ${count ?? 0}`)
    }

    return {
      success: true,
      count: count ?? 0,
    }
  } catch (error) {
    if (import.meta.dev) {
      consola.error('GET /api/contractors/count - Error:', error)
    }

    // Handle validation errors
    if (error && typeof error === 'object' && 'issues' in error) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Invalid query parameters',
        data: (error as { issues: unknown }).issues,
      })
    }

    // Re-throw if already an H3Error
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to count contractors',
    })
  }
})
