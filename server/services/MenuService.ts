/**
 * Menu Service
 *
 * Business logic layer for menu management.
 * Handles slug validation, depth enforcement, and display order management.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/supabase'
import { MenuRepository } from '../repositories/MenuRepository'
import { MenuItemRepository } from '../repositories/MenuItemRepository'

type Menu = Database['public']['Tables']['menus']['Row']
type MenuInsert = Database['public']['Tables']['menus']['Insert']
type MenuUpdate = Database['public']['Tables']['menus']['Update']
type MenuItemInsert = Database['public']['Tables']['menu_items']['Insert']
type MenuItemUpdate = Database['public']['Tables']['menu_items']['Update']

export interface MenuUpdateResult {
  menu: Menu
  disabledMenu?: Menu
}

export class MenuService {
  private menuRepo: MenuRepository
  private menuItemRepo: MenuItemRepository

  constructor(private client: SupabaseClient<Database>) {
    this.menuRepo = new MenuRepository(client)
    this.menuItemRepo = new MenuItemRepository(client)
  }

  /**
   * Create a new menu
   */
  async createMenu(data: MenuInsert, userId: string, force: boolean = false) {
    // Validate slug is unique
    const isUnique = await this.menuRepo.isSlugUnique(data.slug)
    if (!isUnique) {
      throw createError({
        statusCode: 400,
        message: `Menu with slug "${data.slug}" already exists`
      })
    }

    // Check if location is being set
    const isSettingHeader = data.show_in_header === true
    const isSettingFooter = data.show_in_footer === true

    // Validate: Footer menus cannot have dropdown items (will be validated when items are added)

    // Check for location conflicts
    if (isSettingHeader || isSettingFooter) {
      const location = isSettingHeader ? 'header' : 'footer'
      const existingMenu = await this.menuRepo.findByLocation(location)

      // If another menu is already in this location
      if (existingMenu) {
        if (!force) {
          // Return conflict error with existing menu info
          throw createError({
            statusCode: 409,
            statusMessage: 'Location Conflict',
            message: `Menu "${existingMenu.name}" is currently assigned to ${location}`,
            data: {
              conflictingMenu: {
                id: existingMenu.id,
                name: existingMenu.name
              }
            }
          })
        }

        // Force flag is true - disable the existing menu (keep location assignment)
        await this.menuRepo.update(existingMenu.id, { is_enabled: false }, userId)
      }
    }

    return await this.menuRepo.create(data, userId)
  }

  /**
   * Update an existing menu
   */
  async updateMenu(id: string, data: MenuUpdate, userId: string, force: boolean = false): Promise<MenuUpdateResult> {
    // If slug is being updated, validate uniqueness
    if (data.slug) {
      const isUnique = await this.menuRepo.isSlugUnique(data.slug, id)
      if (!isUnique) {
        throw createError({
          statusCode: 400,
          message: `Menu with slug "${data.slug}" already exists`
        })
      }
    }

    // Get current menu state to check for location conflicts
    const currentMenu = await this.menuRepo.getById(id)
    if (!currentMenu) {
      throw createError({
        statusCode: 404,
        message: 'Menu not found'
      })
    }

    // Check if location is being changed
    const isChangingToHeader = data.show_in_header === true
    const isChangingToFooter = data.show_in_footer === true

    // Check if enabling a menu that already has a location set
    const isEnablingWithHeader = data.is_enabled === true && currentMenu.is_enabled === false && currentMenu.show_in_header === true
    const isEnablingWithFooter = data.is_enabled === true && currentMenu.is_enabled === false && currentMenu.show_in_footer === true

    // Detect if we're ONLY toggling is_enabled (no location fields being changed)
    const isToggleOnly = data.is_enabled !== undefined &&
      data.show_in_header === undefined &&
      data.show_in_footer === undefined

    // Validate: Footer menus cannot have dropdown items
    if (isChangingToFooter) {
      const items = await this.menuItemRepo.listByMenu(id)
      const hasDropdowns = items.some(item => item.link_type === 'dropdown')

      if (hasDropdowns) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Bad Request',
          message: 'Cannot assign menu to footer because it contains dropdown items. Footer menus can only contain page links and custom links. Please remove dropdown items first.'
        })
      }
    }

    // Track disabled menu for return value
    let disabledMenu: Menu | undefined

    // Check for location conflicts when:
    // 1. Changing location (show_in_header or show_in_footer)
    // 2. Enabling a menu that already has a location set
    if (isChangingToHeader || isChangingToFooter || isEnablingWithHeader || isEnablingWithFooter) {
      const location = (isChangingToHeader || isEnablingWithHeader) ? 'header' : 'footer'
      const existingMenu = await this.menuRepo.findByLocation(location)

      // If another menu is already enabled in this location
      if (existingMenu && existingMenu.id !== id) {
        // In toggle-only context, auto-disable conflicting menu without requiring force flag
        if (isToggleOnly) {
          disabledMenu = await this.menuRepo.update(existingMenu.id, { is_enabled: false }, userId)
        } else if (!force) {
          // For edit/create forms, show conflict dialog
          throw createError({
            statusCode: 409,
            statusMessage: 'Location Conflict',
            message: `Menu "${existingMenu.name}" is currently assigned to ${location}`,
            data: {
              conflictingMenu: {
                id: existingMenu.id,
                name: existingMenu.name
              }
            }
          })
        } else {
          // Force flag is true - disable the existing menu
          disabledMenu = await this.menuRepo.update(existingMenu.id, { is_enabled: false }, userId)
        }
      }
    }

    const updatedMenu = await this.menuRepo.update(id, data, userId)

    return {
      menu: updatedMenu,
      disabledMenu
    }
  }

  /**
   * Delete a menu (soft delete)
   */
  async deleteMenu(id: string) {
    return await this.menuRepo.softDelete(id)
  }

  /**
   * Create a new menu item
   */
  async createMenuItem(data: MenuItemInsert, userId: string) {
    // Validate: Footer menus cannot have dropdown items
    if (data.link_type === 'dropdown') {
      const menu = await this.menuRepo.getById(data.menu_id)

      if (menu.show_in_footer) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Bad Request',
          message: 'Footer menus cannot contain dropdown items. Only page links and custom links are allowed in footer menus.'
        })
      }
    }

    // Enforce 1-level depth rule
    if (data.parent_id) {
      const parent = await this.menuItemRepo.getById(data.parent_id)

      // Check if parent already has a parent (would create 2-level depth)
      if (parent.parent_id !== null) {
        throw createError({
          statusCode: 400,
          message: 'Cannot create nested menu items more than 1 level deep. Child items cannot have children.'
        })
      }
    }

    // Auto-assign display_order if not provided
    if (data.display_order === undefined || data.display_order === null) {
      data.display_order = await this.menuItemRepo.getNextDisplayOrder(
        data.menu_id,
        data.parent_id || null
      )
    }

    return await this.menuItemRepo.create(data, userId)
  }

  /**
   * Update an existing menu item
   */
  async updateMenuItem(id: string, data: MenuItemUpdate, userId: string) {
    // Get item once if needed for validation
    let item: any = null

    // Validate: Footer menus cannot have dropdown items
    if (data.link_type === 'dropdown') {
      item = await this.menuItemRepo.getById(id)
      const menu = await this.menuRepo.getById(item.menu_id)

      if (menu.show_in_footer) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Bad Request',
          message: 'Footer menus cannot contain dropdown items. Only page links and custom links are allowed in footer menus.'
        })
      }
    }

    // If parent_id is being updated, enforce 1-level depth rule
    if (data.parent_id !== undefined) {
      // Reuse item if already fetched, otherwise fetch it
      if (!item) {
        item = await this.menuItemRepo.getById(id)
      }

      // Check if this item has children
      const children = await this.menuItemRepo.getChildren(id)
      if (children.length > 0 && data.parent_id !== null) {
        throw createError({
          statusCode: 400,
          message: 'Cannot make this item a child because it has children of its own. Remove children first.'
        })
      }

      // If setting a parent, check parent doesn't have a parent
      if (data.parent_id) {
        const parent = await this.menuItemRepo.getById(data.parent_id)
        if (parent.parent_id !== null) {
          throw createError({
            statusCode: 400,
            message: 'Cannot create nested menu items more than 1 level deep.'
          })
        }
      }
    }

    return await this.menuItemRepo.update(id, data, userId)
  }

  /**
   * Delete a menu item (soft delete)
   */
  async deleteMenuItem(id: string) {
    return await this.menuItemRepo.softDelete(id)
  }

  /**
   * Reorder menu items
   */
  async reorderMenuItems(items: Array<{ id: string; display_order: number }>) {
    if (import.meta.dev) {
      console.log('[MenuService] reorderMenuItems called with:', items)
    }

    // Validate all items belong to same menu and parent
    const itemDetails = await Promise.all(
      items.map(item => this.menuItemRepo.getById(item.id))
    )

    if (import.meta.dev) {
      console.log('[MenuService] Item details fetched:', itemDetails.map(i => ({ id: i.id, label: i.label, parent_id: i.parent_id, menu_id: i.menu_id })))
    }

    const menuIds = new Set(itemDetails.map(item => item.menu_id))
    const parentIds = new Set(itemDetails.map(item => item.parent_id))

    if (menuIds.size > 1) {
      throw createError({
        statusCode: 400,
        message: 'All items must belong to the same menu'
      })
    }

    if (parentIds.size > 1) {
      throw createError({
        statusCode: 400,
        message: 'All items must have the same parent (or all be top-level)'
      })
    }

    if (import.meta.dev) {
      console.log('[MenuService] Validation passed, calling repository.reorder')
    }

    const result = await this.menuItemRepo.reorder(items)

    if (import.meta.dev) {
      console.log('[MenuService] Repository.reorder returned:', result)
    }

    return result
  }
}

