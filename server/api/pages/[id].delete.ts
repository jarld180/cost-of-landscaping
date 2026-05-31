/**
 * DELETE /api/pages/[id]
 *
 * Soft delete a page.
 * Requires admin authentication.
 *
 * Note: This performs a soft delete (sets deleted_at timestamp).
 * Child pages will be cascade deleted due to database constraints.
 *
 * @param {string} id - Page UUID
 * @returns {Object} Success message
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { PageService } from '../../services/PageService'
import { requireAdmin } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  try {
    // Require admin authentication for deletes
    const userId = await requireAdmin(event)

    // Get page ID from route params
    const id = getRouterParam(event, 'id')

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Page ID is required'
      })
    }

    if (import.meta.dev) {
      consola.info(`DELETE /api/pages/${id} - Deleting page`, { userId })
    }

    // Get Supabase client and create service
    const client = await serverSupabaseClient(event)
    const pageService = new PageService(client)

    // Verify page exists before deleting
    const existingPage = await pageService.repository.findById(id)

    if (!existingPage) {
      if (import.meta.dev) {
        consola.warn(`DELETE /api/pages/${id} - Page not found`)
      }

      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: `Page with ID '${id}' not found`
      })
    }

    // Check if page has children (warn user)
    const children = await pageService.getChildren(id, false)
    const hasChildren = children.length > 0

    if (hasChildren && import.meta.dev) {
      consola.warn(`DELETE /api/pages/${id} - Page has ${children.length} children that will be cascade deleted`)
    }

    // Soft delete the page
    await pageService.deletePage(id)

    if (import.meta.dev) {
      consola.success(`DELETE /api/pages/${id} - Page deleted:`, {
        id: existingPage.id,
        title: existingPage.title,
        childrenDeleted: hasChildren ? children.length : 0
      })
    }

    return {
      success: true,
      message: 'Page deleted successfully',
      data: {
        id: existingPage.id,
        title: existingPage.title,
        full_path: existingPage.full_path,
        childrenDeleted: hasChildren ? children.length : 0
      }
    }
  } catch (error) {
    if (import.meta.dev) {
      consola.error('DELETE /api/pages/[id] - Error:', error)
    }

    // Re-throw if already an H3Error
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to delete page'
    })
  }
})

