/**
 * PATCH /api/menu-items/[id]
 *
 * Update an existing menu item.
 * Requires admin authentication.
 *
 * @param {string} id - Menu item UUID
 *
 * Request Body (all fields optional):
 * - parent_id: Parent menu item ID
 * - link_type: 'page' or 'custom'
 * - page_id: Page UUID
 * - custom_url: Custom URL
 * - label: Menu item label
 * - description: Menu item description
 * - open_in_new_tab: Open in new tab
 * - is_enabled: Enabled status
 * - display_order: Display order
 * - metadata: Additional metadata
 *
 * @returns {Object} Updated menu item data
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { MenuService } from '../../services/MenuService'
import { updateMenuItemSchema } from '../../schemas/menu.schemas'
import { requireAdmin } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  try {
    // Require admin authentication
    const userId = await requireAdmin(event)

    // Get menu item ID from route params
    const id = getRouterParam(event, 'id')

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Menu item ID is required'
      })
    }

    if (import.meta.dev) {
      consola.info(`PATCH /api/menu-items/${id} - Updating menu item`, { userId })
    }

    // Get and validate request body
    const body = await readBody(event)
    const validatedData = updateMenuItemSchema.parse(body)

    if (import.meta.dev) {
      consola.info(`PATCH /api/menu-items/${id} - Validated data:`, validatedData)
    }

    // Get Supabase client and create service
    const client = await serverSupabaseClient(event)
    const menuService = new MenuService(client)

    // Update menu item using service (handles depth enforcement)
    const updatedMenuItem = await menuService.updateMenuItem(id, validatedData, userId)

    if (import.meta.dev) {
      consola.success(`PATCH /api/menu-items/${id} - Menu item updated:`, {
        id: updatedMenuItem.id,
        label: updatedMenuItem.label
      })
    }

    return {
      success: true,
      data: updatedMenuItem,
      message: 'Menu item updated successfully'
    }
  } catch (error) {
    if (import.meta.dev) {
      consola.error('PATCH /api/menu-items/[id] - Error:', error)
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
      if (error.message.includes('depth') || error.message.includes('nested') || error.message.includes('children')) {
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
      message: 'Failed to update menu item'
    })
  }
})

