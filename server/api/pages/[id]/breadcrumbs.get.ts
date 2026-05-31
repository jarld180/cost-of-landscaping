/**
 * GET /api/pages/[id]/breadcrumbs
 *
 * Get breadcrumb trail for a specific page.
 * Returns an array of pages from root to the current page.
 *
 * @param {string} id - Page UUID
 * @returns {Object} Breadcrumb trail
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { PageService } from '../../../services/PageService'

export default defineEventHandler(async (event) => {
  try {
    // Get page ID from route params
    const id = getRouterParam(event, 'id')

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Page ID is required'
      })
    }

    // Optional authentication - public can view published pages, authenticated users can view all
    const userId = await optionalAuth(event)

    if (import.meta.dev) {
      consola.info(`GET /api/pages/${id}/breadcrumbs - Fetching breadcrumbs`, {
        userId: userId || 'anonymous'
      })
    }

    // Get Supabase client and create service
    const client = await serverSupabaseClient(event)
    const pageService = new PageService(client)

    // First, verify the page exists
    const page = await pageService.repository.findById(id)

    if (!page) {
      if (import.meta.dev) {
        consola.warn(`GET /api/pages/${id}/breadcrumbs - Page not found`)
      }

      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: `Page with ID '${id}' not found`
      })
    }

    // Check if user can view this page
    if (!userId && page.status !== 'published') {
      if (import.meta.dev) {
        consola.warn(`GET /api/pages/${id}/breadcrumbs - Unauthorized access to ${page.status} page`)
      }

      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden',
        message: 'You do not have permission to view this page'
      })
    }

    // Get breadcrumbs
    const breadcrumbs = await pageService.getBreadcrumbs(id)

    // Filter out non-published pages for anonymous users
    const filteredBreadcrumbs = userId
      ? breadcrumbs
      : breadcrumbs.filter(crumb => crumb.status === 'published')

    // Transform breadcrumbs to a simpler format
    const breadcrumbTrail = filteredBreadcrumbs.map(crumb => ({
      id: crumb.id,
      title: crumb.title,
      slug: crumb.slug,
      full_path: crumb.full_path,
      depth: crumb.depth
    }))

    if (import.meta.dev) {
      consola.success(`GET /api/pages/${id}/breadcrumbs - Returning ${breadcrumbTrail.length} breadcrumbs`)
    }

    return {
      success: true,
      data: breadcrumbTrail,
      total: breadcrumbTrail.length,
      currentPage: {
        id: page.id,
        title: page.title,
        full_path: page.full_path,
        depth: page.depth
      }
    }
  } catch (error) {
    if (import.meta.dev) {
      consola.error('GET /api/pages/[id]/breadcrumbs - Error:', error)
    }

    // Re-throw if already an H3Error
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to fetch breadcrumbs'
    })
  }
})

