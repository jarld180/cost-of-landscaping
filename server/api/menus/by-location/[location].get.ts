/**
 * GET /api/menus/by-location/[location]
 *
 * Get the first enabled menu for a specific location (header or footer) with all its items.
 * Public endpoint - returns only enabled menus and items.
 *
 * @param {string} location - 'header' or 'footer'
 * @returns {Object} Menu with nested items
 */

import { consola } from 'consola'
import { serverSupabaseServiceRole } from '#supabase/server'
import { MenuRepository } from '../../../repositories/MenuRepository'

export default defineEventHandler(async (event) => {
  try {
    // Get location from route params
    const location = getRouterParam(event, 'location')

    // Validate location parameter
    if (!location || (location !== 'header' && location !== 'footer')) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Location must be either "header" or "footer"'
      })
    }

    if (import.meta.dev) {
      consola.info(`GET /api/menus/by-location/${location} - Fetching menu with items`)
    }

    // Get Supabase service role client (bypasses RLS for public read)
    const client = serverSupabaseServiceRole(event)
    const menuRepo = new MenuRepository(client)

    // Get menu with nested items by location
    const menuWithItems = await menuRepo.getMenuWithItemsByLocation(location as 'header' | 'footer')

    if (import.meta.dev) {
      consola.success(`GET /api/menus/by-location/${location} - Retrieved menu:`, {
        id: menuWithItems.id,
        name: menuWithItems.name,
        itemCount: menuWithItems.items.length
      })
    }

    return {
      success: true,
      data: menuWithItems,
      message: 'Menu retrieved successfully'
    }
  } catch (error) {
    if (import.meta.dev) {
      consola.error('GET /api/menus/by-location/[location] - Error:', error)
    }

    // Handle not found errors
    if (error && typeof error === 'object' && 'code' in error && error.code === 'PGRST116') {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: `No enabled menu found for location '${getRouterParam(event, 'location')}'`
      })
    }

    // Re-throw if already an H3Error
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to retrieve menu'
    })
  }
})

