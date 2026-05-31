/**
 * GET /api/menus/[id]/items
 *
 * Get all menu items for a specific menu (admin only).
 * Returns items in hierarchical order (parents first, then children).
 *
 * @param {string} id - Menu UUID
 *
 * @returns {Object} Array of menu items
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { MenuItemRepository } from '../../../repositories/MenuItemRepository'
import { requireAdmin } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  try {
    // Require admin authentication
    const userId = await requireAdmin(event)

    // Get menu ID from route params
    const menuId = getRouterParam(event, 'id')

    if (!menuId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Menu ID is required'
      })
    }

    if (import.meta.dev) {
      consola.info(`GET /api/menus/${menuId}/items - Fetching menu items`, { userId })
    }

    // Get Supabase client and create repository
    const client = await serverSupabaseClient(event)
    const menuItemRepo = new MenuItemRepository(client)

    // Get all menu items for this menu
    const menuItems = await menuItemRepo.listByMenu(menuId)

    if (import.meta.dev) {
      consola.success(`GET /api/menus/${menuId}/items - Found ${menuItems.length} items`)
    }

    return {
      success: true,
      data: menuItems,
      message: 'Menu items retrieved successfully'
    }
  } catch (error) {
    if (import.meta.dev) {
      consola.error('GET /api/menus/[id]/items - Error:', error)
    }

    // Re-throw if already an H3Error
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to fetch menu items'
    })
  }
})

