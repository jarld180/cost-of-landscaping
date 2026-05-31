/**
 * GET /api/contractors
 *
 * List contractors with optional filtering and pagination (admin only).
 *
 * Query Parameters:
 * - cityId: Filter by city UUID
 * - category: Filter by category slug (searches metadata.categories[])
 * - status: Filter by status (pending, active, suspended)
 * - search: Search by company name
 * - imagesProcessed: Filter by image processing status
 * - includeDeleted: Include soft-deleted contractors
 * - limit: Number of results (default: 50, max: 100)
 * - offset: Offset for pagination (default: 0)
 * - orderBy: Sort field (default: company_name)
 * - orderDirection: Sort direction (asc/desc, default: asc)
 *
 * @returns {Object} Paginated list of contractors with city data
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { listContractorsQuerySchema } from '../../schemas/contractor.schemas'
import { requireAdmin } from '../../utils/auth'
import type { Database } from '../../../app/types/supabase'

export default defineEventHandler(async (event) => {
  try {
    // Require admin authentication
    const userId = await requireAdmin(event)

    if (import.meta.dev) {
      consola.info('GET /api/contractors - Listing contractors', { userId })
    }

    // Get and validate query parameters
    const query = getQuery(event)
    const validatedQuery = listContractorsQuerySchema.parse(query)

    if (import.meta.dev) {
      consola.info('GET /api/contractors - Query params:', validatedQuery)
    }

    // Get Supabase client
    const client = await serverSupabaseClient<Database>(event)

    // Build query with city join
    let dbQuery = client
      .from('contractors')
      .select(`
        *,
        city:cities!contractors_city_id_fkey (
          id,
          name,
          slug,
          state_code
        )
      `, { count: 'exact' })

    // Apply filters
    if (validatedQuery.cityId) {
      dbQuery = dbQuery.eq('city_id', validatedQuery.cityId)
    }

    if (validatedQuery.status) {
      dbQuery = dbQuery.eq('status', validatedQuery.status)
    }

    if (validatedQuery.imagesProcessed !== undefined) {
      dbQuery = dbQuery.eq('images_processed', validatedQuery.imagesProcessed)
    }

    if (!validatedQuery.includeDeleted) {
      dbQuery = dbQuery.is('deleted_at', null)
    }

    // Category filter (JSONB contains)
    if (validatedQuery.category) {
      dbQuery = dbQuery.contains('metadata', { categories: [validatedQuery.category] })
    }

    // Enrichment status filter
    if (validatedQuery.enrichmentStatus) {
      if (validatedQuery.enrichmentStatus === 'not_started') {
        // Not started = no enrichment status in metadata OR null
        dbQuery = dbQuery.or('metadata->enrichment->>status.is.null,metadata->enrichment.is.null')
      } else {
        dbQuery = dbQuery.eq('metadata->enrichment->>status', validatedQuery.enrichmentStatus)
      }
    }

    // Has website filter
    if (validatedQuery.hasWebsite !== undefined) {
      if (validatedQuery.hasWebsite) {
        dbQuery = dbQuery.not('website', 'is', null).neq('website', '')
      } else {
        dbQuery = dbQuery.or('website.is.null,website.eq.')
      }
    }

    // Has Google CID filter (for review enrichment)
    if (validatedQuery.hasGoogleCid !== undefined) {
      if (validatedQuery.hasGoogleCid) {
        dbQuery = dbQuery.not('google_cid', 'is', null)
      } else {
        dbQuery = dbQuery.is('google_cid', null)
      }
    }

    // Has reviews filter
    if (validatedQuery.hasReviews !== undefined) {
      if (validatedQuery.hasReviews) {
        dbQuery = dbQuery.gt('review_count', 0)
      } else {
        dbQuery = dbQuery.or('review_count.is.null,review_count.eq.0')
      }
    }

    // Review enrichment status filter
    if (validatedQuery.reviewEnrichmentStatus) {
      if (validatedQuery.reviewEnrichmentStatus === 'not_started') {
        // Not started = no reviews_enrichment in metadata OR status is null
        dbQuery = dbQuery.or('metadata->reviews_enrichment.is.null,metadata->reviews_enrichment->>status.is.null')
      } else {
        dbQuery = dbQuery.eq('metadata->reviews_enrichment->>status', validatedQuery.reviewEnrichmentStatus)
      }
    }

    // Search by company name (case-insensitive)
    if (validatedQuery.search) {
      dbQuery = dbQuery.ilike('company_name', `%${validatedQuery.search}%`)
    }

    // Apply ordering and pagination
    dbQuery = dbQuery
      .order(validatedQuery.orderBy, { ascending: validatedQuery.orderDirection === 'asc' })
      .range(validatedQuery.offset, validatedQuery.offset + validatedQuery.limit - 1)

    const { data, error, count } = await dbQuery

    if (error) {
      consola.error('GET /api/contractors - Database error:', error)
      throw error
    }

    // Calculate pagination metadata
    const total = count || 0
    const totalPages = Math.ceil(total / validatedQuery.limit)
    const currentPage = Math.floor(validatedQuery.offset / validatedQuery.limit) + 1

    if (import.meta.dev) {
      consola.success(`GET /api/contractors - Returning ${data?.length || 0} of ${total} contractors`)
    }

    return {
      success: true,
      data: data || [],
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
      consola.error('GET /api/contractors - Error:', error)
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
      message: 'Failed to list contractors',
    })
  }
})

