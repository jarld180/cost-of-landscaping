/**
 * GET /api/pages/[id]/children
 *
 * Get child pages of a specific page.
 *
 * @param {string} id - Parent page UUID
 *
 * Query Parameters:
 * - includeDescendants: Include all descendants (recursive), default: false
 *
 * @returns {Object} List of child pages
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { PageService } from '../../../services/PageService'
import { getChildrenQuerySchema } from '../../../schemas/page.schemas'

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

    // Get and validate query parameters
    const query = getQuery(event)
    const { includeDescendants } = getChildrenQuerySchema.parse(query)

    // Optional authentication - public can view published pages, authenticated users can view all
    const userId = await optionalAuth(event)

    if (import.meta.dev) {
      consola.info(`GET /api/pages/${id}/children - Fetching children`, {
        userId: userId || 'anonymous',
        includeDescendants
      })
    }

    // Get Supabase client and create service
    const client = await serverSupabaseClient(event)
    const pageService = new PageService(client)

    // First, verify the parent page exists
    const parentPage = await pageService.repository.findById(id)

    if (!parentPage) {
      if (import.meta.dev) {
        consola.warn(`GET /api/pages/${id}/children - Parent page not found`)
      }

      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: `Parent page with ID '${id}' not found`
      })
    }

    // Check if user can view the parent page
    if (!userId && parentPage.status !== 'published') {
      if (import.meta.dev) {
        consola.warn(`GET /api/pages/${id}/children - Unauthorized access to ${parentPage.status} page`)
      }

      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden',
        message: 'You do not have permission to view this page'
      })
    }

    // Get children
    const children = await pageService.getChildren(id, includeDescendants)

    // Filter out non-published pages for anonymous users
    const filteredChildren = userId
      ? children
      : children.filter(child => child.status === 'published')

    if (import.meta.dev) {
      consola.success(`GET /api/pages/${id}/children - Returning ${filteredChildren.length} children`)
    }

    return {
      success: true,
      data: filteredChildren,
      total: filteredChildren.length,
      parent: {
        id: parentPage.id,
        title: parentPage.title,
        full_path: parentPage.full_path
      }
    }
  } catch (error) {
    if (import.meta.dev) {
      consola.error('GET /api/pages/[id]/children - Error:', error)
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
      message: 'Failed to fetch child pages'
    })
  }
})

