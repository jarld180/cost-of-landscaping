/**
 * POST /api/menus/[id]/items
 *
 * Create a new menu item for a specific menu.
 * Requires admin authentication.
 *
 * @param {string} id - Menu UUID
 *
 * Request Body:
 * - parent_id: Parent menu item ID (optional, null for top-level)
 * - link_type: 'page' or 'custom' (required)
 * - page_id: Page UUID (required if link_type is 'page')
 * - custom_url: Custom URL (required if link_type is 'custom')
 * - label: Menu item label (required)
 * - description: Menu item description (optional)
 * - open_in_new_tab: Open in new tab (default: false)
 * - is_enabled: Enabled status (default: true)
 * - display_order: Display order (optional, auto-assigned if not provided)
 * - metadata: Additional metadata (optional)
 *
 * @returns {Object} Created menu item data
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { MenuService } from '../../../services/MenuService'
import { createMenuItemSchema } from '../../../schemas/menu.schemas'
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
      consola.info(`POST /api/menus/${menuId}/items - Creating new menu item`, { userId })
    }

    // Get and validate request body
    const body = await readBody(event)

    // Ensure menu_id matches route param
    const dataWithMenuId = { ...body, menu_id: menuId }
    const validatedData = createMenuItemSchema.parse(dataWithMenuId)

    if (import.meta.dev) {
      consola.info(`POST /api/menus/${menuId}/items - Validated data:`, {
        label: validatedData.label,
        link_type: validatedData.link_type,
        parent_id: validatedData.parent_id
      })
    }

    // Get Supabase client and create service
    const client = await serverSupabaseClient(event)
    const menuService = new MenuService(client)

    // Create menu item using service (handles depth enforcement and auto-ordering)
    // Note: link_type is now a database column, so we keep it in the data
    const menuItem = await menuService.createMenuItem(validatedData, userId)

    if (import.meta.dev) {
      consola.success(`POST /api/menus/${menuId}/items - Menu item created:`, {
        id: menuItem.id,
        label: menuItem.label,
        display_order: menuItem.display_order
      })
    }

    return {
      success: true,
      data: menuItem,
      message: 'Menu item created successfully'
    }
  } catch (error) {
    if (import.meta.dev) {
      consola.error('POST /api/menus/[id]/items - Error:', error)
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

    // Handle business logic errors (from MenuService)
    if (error instanceof Error) {
      if (error.message.includes('depth') || error.message.includes('nested')) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Bad Request',
          message: error.message
        })
      }

      // Handle footer dropdown validation error
      if (error.message.includes('dropdown items')) {
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
      message: 'Failed to create menu item'
    })
  }
})

