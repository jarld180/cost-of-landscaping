/**
 * GET /api/menus/by-slug/[slug]
 *
 * Get menu with all its items (nested structure).
 * Public endpoint - returns only enabled menus and items.
 *
 * @param {string} slug - Menu slug
 * @returns {Object} Menu with nested items
 */

import { consola } from 'consola'
import { serverSupabaseServiceRole } from '#supabase/server'
import { MenuRepository } from '../../../repositories/MenuRepository'

export default defineEventHandler(async (event) => {
  try {
    // Get slug from route params
    const slug = getRouterParam(event, 'slug')

    if (!slug) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Menu slug is required'
      })
    }

    if (import.meta.dev) {
      consola.info(`GET /api/menus/by-slug/${slug} - Fetching menu with items`)
    }

    // Get Supabase service role client (bypasses RLS for public read)
    const client = serverSupabaseServiceRole(event)
    const menuRepo = new MenuRepository(client)

    // Get menu with nested items
    const menuWithItems = await menuRepo.getMenuWithItems(slug)

    if (import.meta.dev) {
      consola.success(`GET /api/menus/by-slug/${slug} - Retrieved menu:`, {
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
      consola.error('GET /api/menus/by-slug/[slug] - Error:', error)
    }

    // Handle not found errors
    if (error && typeof error === 'object' && 'code' in error && error.code === 'PGRST116') {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: `Menu with slug '${getRouterParam(event, 'slug')}' not found`
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

