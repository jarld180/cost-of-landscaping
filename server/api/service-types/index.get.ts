/**
 * GET /api/service-types
 *
 * List service types for category selection (admin only).
 *
 * Query Parameters:
 * - includeDisabled: Include disabled service types (default: false)
 *
 * @returns {Object} List of service types ordered by display_order
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { LookupRepository } from '../../repositories/LookupRepository'
import { requireAdmin } from '../../utils/auth'
import type { Database } from '../../../app/types/supabase'
import { z } from 'zod'

// Query schema
const listServiceTypesQuerySchema = z.object({
  includeDisabled: z.coerce.boolean().optional().default(false),
})

export default defineEventHandler(async (event) => {
  try {
    // Require admin authentication
    const userId = await requireAdmin(event)

    if (import.meta.dev) {
      consola.info('GET /api/service-types - Listing service types', { userId })
    }

    // Get and validate query parameters
    const query = getQuery(event)
    const validatedQuery = listServiceTypesQuerySchema.parse(query)

    if (import.meta.dev) {
      consola.info('GET /api/service-types - Query params:', validatedQuery)
    }

    // Get Supabase client
    const client = await serverSupabaseClient<Database>(event)
    const lookupRepo = new LookupRepository(client)

    // List service types
    const serviceTypes = await lookupRepo.serviceTypes.list(validatedQuery.includeDisabled)

    if (import.meta.dev) {
      consola.success(`GET /api/service-types - Returning ${serviceTypes.length} service types`)
    }

    return {
      success: true,
      data: serviceTypes,
    }
  } catch (error) {
    if (import.meta.dev) {
      consola.error('GET /api/service-types - Error:', error)
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
      message: 'Failed to list service types',
    })
  }
})

