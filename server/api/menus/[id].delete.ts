/**
 * DELETE /api/menus/[id]
 *
 * Soft delete a menu.
 * Requires admin authentication.
 *
 * @param {string} id - Menu UUID
 * @returns {Object} Success message
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { MenuService } from '../../services/MenuService'
import { requireAdmin } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  try {
    // Require admin authentication
    const userId = await requireAdmin(event)

    // Get menu ID from route params
    const id = getRouterParam(event, 'id')

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Menu ID is required'
      })
    }

    if (import.meta.dev) {
      consola.info(`DELETE /api/menus/${id} - Deleting menu`, { userId })
    }

    // Get Supabase client and create service
    const client = await serverSupabaseClient(event)
    const menuService = new MenuService(client)

    // Soft delete menu
    await menuService.deleteMenu(id)

    if (import.meta.dev) {
      consola.success(`DELETE /api/menus/${id} - Menu deleted`)
    }

    return {
      success: true,
      message: 'Menu deleted successfully'
    }
  } catch (error) {
    if (import.meta.dev) {
      consola.error('DELETE /api/menus/[id] - Error:', error)
    }

    // Re-throw if already an H3Error
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to delete menu'
    })
  }
})

