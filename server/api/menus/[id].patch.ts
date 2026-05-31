/**
 * PATCH /api/menus/[id]
 *
 * Update an existing menu.
 * Requires admin authentication.
 *
 * @param {string} id - Menu UUID
 *
 * Query Parameters:
 * - force: Set to 'true' to bypass location conflicts and unset existing menu
 *
 * Request Body (all fields optional):
 * - name: Menu name
 * - slug: Menu slug
 * - description: Menu description
 * - show_in_header: Show in header
 * - show_in_footer: Show in footer
 * - is_enabled: Enabled status
 * - display_order: Display order
 * - metadata: Additional metadata
 *
 * @returns {Object} Updated menu data
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { MenuService } from '../../services/MenuService'
import { updateMenuSchema } from '../../schemas/menu.schemas'
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

    // Get force flag from query params
    const query = getQuery(event)
    const force = query.force === 'true'

    if (import.meta.dev) {
      consola.info(`PATCH /api/menus/${id} - Updating menu`, { userId, force })
    }

    // Get and validate request body
    const body = await readBody(event)
    const validatedData = updateMenuSchema.parse(body)

    if (import.meta.dev) {
      consola.info(`PATCH /api/menus/${id} - Validated data:`, validatedData)
    }

    // Get Supabase client and create service
    const client = await serverSupabaseClient(event)
    const menuService = new MenuService(client)

    // Update menu using service (handles location conflicts and footer dropdown validation)
    const result = await menuService.updateMenu(id, validatedData, userId, force)

    if (import.meta.dev) {
      consola.success(`PATCH /api/menus/${id} - Menu updated:`, {
        id: result.menu.id,
        name: result.menu.name,
        slug: result.menu.slug,
        location: result.menu.show_in_header ? 'header' : result.menu.show_in_footer ? 'footer' : 'none',
        disabledMenu: result.disabledMenu ? result.disabledMenu.name : null
      })
    }

    return {
      success: true,
      data: result.menu,
      disabledMenu: result.disabledMenu,
      message: 'Menu updated successfully'
    }
  } catch (error) {
    if (import.meta.dev) {
      consola.error('PATCH /api/menus/[id] - Error:', error)
    }

    // Handle validation errors (Zod)
    if (error && typeof error === 'object' && 'issues' in error) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Invalid request data',
        data: error.issues
      })
    }

    // Handle location conflict (409) - pass through with conflict data
    if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 409) {
      throw error
    }

    // Handle footer dropdown validation error (400)
    if (error instanceof Error && error.message.includes('dropdown items')) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: error.message
      })
    }

    // Handle slug uniqueness errors
    if (error instanceof Error && (error.message.includes('already exists') || error.message.includes('slug'))) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Conflict',
        message: error.message
      })
    }

    // Re-throw if already an H3Error
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to update menu'
    })
  }
})

