/**
 * GET /api/pages/by-path
 *
 * Get a page by its full path.
 * This is the primary endpoint for dynamic routing.
 *
 * Query Parameters:
 * - path: Full path of the page (e.g., /category/sub-page)
 *
 * @returns {Object} Page data
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { PageService } from '../../services/PageService'
import { getPageByPathQuerySchema } from '../../schemas/page.schemas'

export default defineEventHandler(async (event) => {
  try {
    // Get and validate query parameters
    const query = getQuery(event)
    const { path } = getPageByPathQuerySchema.parse(query)

    // Optional authentication - public can view published pages, authenticated users can view all
    const userId = await optionalAuth(event)

    if (import.meta.dev) {
      consola.info(`GET /api/pages/by-path - Fetching page by path: ${path}`, { userId: userId || 'anonymous' })
    }

    // Get Supabase client and create service
    const client = await serverSupabaseClient(event)
    const pageService = new PageService(client)

    // Get page by path
    const page = await pageService.getPageByPath(path)

    if (!page) {
      if (import.meta.dev) {
        consola.warn(`GET /api/pages/by-path - Page not found: ${path}`)
      }

      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: `Page with path '${path}' not found`
      })
    }

    // Check if user can view this page
    // Public users can only view published pages
    if (!userId && page.status !== 'published') {
      if (import.meta.dev) {
        consola.warn(`GET /api/pages/by-path - Unauthorized access to ${page.status} page: ${path}`)
      }

      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden',
        message: 'You do not have permission to view this page'
      })
    }

    if (import.meta.dev) {
      consola.success(`GET /api/pages/by-path - Returning page: ${page.title} (${path})`)
    }

    return {
      success: true,
      data: page
    }
  } catch (error) {
    if (import.meta.dev) {
      consola.error('GET /api/pages/by-path - Error:', error)
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
      message: 'Failed to fetch page by path'
    })
  }
})

