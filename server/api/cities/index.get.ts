/**
 * GET /api/cities
 *
 * List cities for dropdown/filter selection (admin only).
 *
 * Query Parameters:
 * - stateCode: Filter by state code (e.g., 'NC')
 * - limit: Number of results (default: 100, max: 500)
 * - offset: Offset for pagination (default: 0)
 *
 * @returns {Object} Paginated list of cities
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { LookupRepository } from '../../repositories/LookupRepository'
import { requireAdmin } from '../../utils/auth'
import type { Database } from '../../../app/types/supabase'
import { z } from 'zod'

// Query schema
const listCitiesQuerySchema = z.object({
  stateCode: z.string().length(2).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
  offset: z.coerce.number().int().min(0).optional().default(0),
})

export default defineEventHandler(async (event) => {
  try {
    // Require admin authentication
    const userId = await requireAdmin(event)

    if (import.meta.dev) {
      consola.info('GET /api/cities - Listing cities', { userId })
    }

    // Get and validate query parameters
    const query = getQuery(event)
    const validatedQuery = listCitiesQuerySchema.parse(query)

    if (import.meta.dev) {
      consola.info('GET /api/cities - Query params:', validatedQuery)
    }

    // Get Supabase client
    const client = await serverSupabaseClient<Database>(event)
    const lookupRepo = new LookupRepository(client)

    // List cities
    const { cities, total } = await lookupRepo.cities.list({
      stateCode: validatedQuery.stateCode,
      limit: validatedQuery.limit,
      offset: validatedQuery.offset,
    })

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / validatedQuery.limit)
    const currentPage = Math.floor(validatedQuery.offset / validatedQuery.limit) + 1

    if (import.meta.dev) {
      consola.success(`GET /api/cities - Returning ${cities.length} of ${total} cities`)
    }

    return {
      success: true,
      data: cities,
      pagination: {
        total,
        page: currentPage,
        limit: validatedQuery.limit,
        offset: validatedQuery.offset,
        totalPages,
      },
    }
  } catch (error) {
    if (import.meta.dev) {
      consola.error('GET /api/cities - Error:', error)
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
      message: 'Failed to list cities',
    })
  }
})

