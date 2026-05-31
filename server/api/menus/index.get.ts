/**
 * GET /api/menus
 *
 * List all menus (admin view - includes disabled menus).
 * Requires admin authentication.
 *
 * @returns {Object} List of all menus
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { MenuRepository } from '../../repositories/MenuRepository'
import { requireAdmin } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  try {
    // Require admin authentication
    const userId = await requireAdmin(event)

    if (import.meta.dev) {
      consola.info('GET /api/menus - Listing all menus', { userId })
    }

    // Get Supabase client and create repository
    const client = await serverSupabaseClient(event)
    const menuRepo = new MenuRepository(client)

    // Get all menus (including disabled)
    const menus = await menuRepo.list(false)

    if (import.meta.dev) {
      consola.success('GET /api/menus - Retrieved menus:', { count: menus.length })
    }

    return {
      success: true,
      data: menus,
      message: 'Menus retrieved successfully'
    }
  } catch (error) {
    if (import.meta.dev) {
      consola.error('GET /api/menus - Error:', error)
    }

    // Re-throw if already an H3Error
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to retrieve menus'
    })
  }
})

