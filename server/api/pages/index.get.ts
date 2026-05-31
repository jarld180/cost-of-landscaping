/**
 * GET /api/pages
 *
 * List pages with optional filtering and pagination (admin only).
 *
 * Query Parameters:
 * - status: Filter by status (draft, published, archived)
 * - template: Filter by template type
 * - parentId: Filter by parent ID (null for root pages)
 * - depth: Filter by depth level
 * - includeDeleted: Include soft-deleted pages
 * - limit: Number of results (default: 50, max: 100)
 * - offset: Offset for pagination (default: 0)
 * - orderBy: Sort field (default: created_at)
 * - orderDirection: Sort direction (asc/desc, default: desc)
 *
 * @returns {Object} Paginated list of pages
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { PageService } from '../../services/PageService'
import { listPagesQuerySchema } from '../../schemas/page.schemas'
import { requireAdmin } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  try {
    // Require admin authentication - only admins can list pages via this endpoint
    const userId = await requireAdmin(event)

    if (import.meta.dev) {
      consola.info('GET /api/pages - Listing pages', { userId })
    }

    // Get and validate query parameters
    const query = getQuery(event)
    const validatedQuery = listPagesQuerySchema.parse(query)

    if (import.meta.dev) {
      consola.info('GET /api/pages - Query params:', validatedQuery)
    }

    // Get Supabase client and create service
    const client = await serverSupabaseClient(event)
    const pageService = new PageService(client)

    // List pages using repository
    const { pages, total } = await pageService.repository.list({
      status: validatedQuery.status,
      template: validatedQuery.template,
      parentId: validatedQuery.parentId,
      depth: validatedQuery.depth,
      includeDeleted: validatedQuery.includeDeleted,
      limit: validatedQuery.limit,
      offset: validatedQuery.offset,
      orderBy: validatedQuery.orderBy,
      orderDirection: validatedQuery.orderDirection
    })

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / validatedQuery.limit)
    const currentPage = Math.floor(validatedQuery.offset / validatedQuery.limit) + 1

    if (import.meta.dev) {
      consola.success(`GET /api/pages - Returning ${pages.length} of ${total} pages`)
    }

    return {
      success: true,
      data: pages,
      pagination: {
        total,
        page: currentPage,
        limit: validatedQuery.limit,
        offset: validatedQuery.offset,
        totalPages
      }
    }
  } catch (error) {
    if (import.meta.dev) {
      consola.error('GET /api/pages - Error:', error)
    }

    // Handle validation errors
    if (error && typeof error === 'object' && 'issues' in error) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Invalid query parameters',
        data: error.issues
      })
    }

    // Re-throw if already an H3Error
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to list pages'
    })
  }
})

