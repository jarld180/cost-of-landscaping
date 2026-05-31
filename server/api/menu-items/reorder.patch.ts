/**
 * PATCH /api/menu-items/reorder
 *
 * Reorder menu items (batch update display_order).
 * Requires admin authentication.
 *
 * Request Body:
 * - items: Array of { id: string, display_order: number }
 *
 * All items must belong to the same menu and have the same parent.
 *
 * @returns {Object} Success message
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { MenuService } from '../../services/MenuService'
import { reorderMenuItemsSchema } from '../../schemas/menu.schemas'
import { requireAdmin } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  try {
    // Require admin authentication
    const userId = await requireAdmin(event)

    if (import.meta.dev) {
      consola.info('PATCH /api/menu-items/reorder - Reordering menu items', { userId })
    }

    // Get and validate request body
    const body = await readBody(event)
    const validatedData = reorderMenuItemsSchema.parse(body)

    if (import.meta.dev) {
      consola.info('PATCH /api/menu-items/reorder - Validated data:', {
        itemCount: validatedData.items.length,
        items: validatedData.items
      })
    }

    // Get Supabase client and create service
    const client = await serverSupabaseClient(event)
    const menuService = new MenuService(client)

    if (import.meta.dev) {
      consola.info('PATCH /api/menu-items/reorder - Calling menuService.reorderMenuItems')
    }

    // Reorder menu items using service (validates same menu/parent)
    const result = await menuService.reorderMenuItems(validatedData.items)

    if (import.meta.dev) {
      consola.success('PATCH /api/menu-items/reorder - Menu items reordered successfully', { result })
    }

    return {
      success: true,
      message: 'Menu items reordered successfully'
    }
  } catch (error) {
    if (import.meta.dev) {
      consola.error('PATCH /api/menu-items/reorder - Error:', error)
    }

    // Handle validation errors
    if (error && typeof error === 'object' && 'issues' in error) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Invalid request data',
        data: error.issues
      })
    }

    // Handle business logic errors
    if (error instanceof Error) {
      if (error.message.includes('same menu') || error.message.includes('same parent')) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Bad Request',
          message: error.message
        })
      }
    }

    // Re-throw if already an H3Error
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to reorder menu items'
    })
  }
})

