/**
 * Menu Item Repository
 *
 * Data access layer for menu_items table.
 * Handles all database operations using Supabase client.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/supabase'

type MenuItem = Database['public']['Tables']['menu_items']['Row']
type MenuItemInsert = Database['public']['Tables']['menu_items']['Insert']
type MenuItemUpdate = Database['public']['Tables']['menu_items']['Update']

export class MenuItemRepository {
  constructor(private client: SupabaseClient<Database>) {}

  /**
   * List all items for a menu in hierarchical order
   * (parents followed by their children)
   */
  async listByMenu(menuId: string, includeDeleted = false) {
    let query = this.client
      .from('menu_items')
      .select('*')
      .eq('menu_id', menuId)

    if (!includeDeleted) {
      query = query.is('deleted_at', null)
    }

    const { data, error } = await query

    if (error) throw error

    const items = data as MenuItem[]

    // Separate parents and children
    const parents = items
      .filter(item => item.parent_id === null)
      .sort((a, b) => a.display_order - b.display_order)

    const children = items.filter(item => item.parent_id !== null)

    // Build hierarchical array: [parent1, child1a, child1b, parent2, child2a, ...]
    const hierarchical: MenuItem[] = []

    for (const parent of parents) {
      // Add parent
      hierarchical.push(parent)

      // Add children of this parent (sorted by display_order)
      const parentChildren = children
        .filter(child => child.parent_id === parent.id)
        .sort((a, b) => a.display_order - b.display_order)

      hierarchical.push(...parentChildren)
    }

    return hierarchical
  }

  /**
   * Get menu item by ID
   */
  async getById(id: string) {
    const { data, error } = await this.client
      .from('menu_items')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) throw error
    return data as MenuItem
  }

  /**
   * Get children of a parent item
   */
  async getChildren(parentId: string) {
    const { data, error } = await this.client
      .from('menu_items')
      .select('*')
      .eq('parent_id', parentId)
      .eq('is_enabled', true)
      .is('deleted_at', null)
      .order('display_order', { ascending: true })

    if (error) throw error
    return data as MenuItem[]
  }

  /**
   * Create new menu item
   */
  async create(data: MenuItemInsert, userId: string) {
    const { data: item, error } = await this.client
      .from('menu_items')
      .insert({
        ...data,
        created_by: userId,
        updated_by: userId
      })
      .select()
      .single()

    if (error) throw error
    return item as MenuItem
  }

  /**
   * Update existing menu item
   */
  async update(id: string, data: MenuItemUpdate, userId: string) {
    const { data: item, error } = await this.client
      .from('menu_items')
      .update({
        ...data,
        updated_by: userId
      })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) throw error
    return item as MenuItem
  }

  /**
   * Soft delete menu item
   */
  async softDelete(id: string) {
    const { data, error } = await this.client
      .from('menu_items')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as MenuItem
  }

  /**
   * Reorder menu items (for drag-and-drop)
   */
  async reorder(items: Array<{ id: string; display_order: number }>) {
    // Two-phase update to avoid unique constraint violations
    // Phase 1: Set all items to negative display_order values
    // Phase 2: Set items to their final positive display_order values
    const errors = []
    const successes = []

    console.log('[MenuItemRepository] Starting reorder for items:', JSON.stringify(items, null, 2))

    // Phase 1: Set to negative values to avoid conflicts
    console.log('[MenuItemRepository] Phase 1: Setting temporary negative values')
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (!item) continue
      const tempOrder = -(i + 1) // -1, -2, -3, etc.

      console.log(`[MenuItemRepository] Phase 1: Updating item ${item.id} to temporary display_order ${tempOrder}`)

      const { error } = await this.client
        .from('menu_items')
        .update({ display_order: tempOrder })
        .eq('id', item.id)
        .select()

      if (error) {
        console.error(`[MenuItemRepository] Phase 1 ERROR for item ${item.id}:`, JSON.stringify(error, null, 2))
        errors.push({ id: item.id, error, phase: 1 })
      }
    }

    // If Phase 1 had errors, abort
    if (errors.length > 0) {
      console.error('[MenuItemRepository] Phase 1 failed, aborting. Errors:', errors)
      throw errors[0]!.error
    }

    // Phase 2: Set to final positive values
    console.log('[MenuItemRepository] Phase 2: Setting final positive values')
    for (const item of items) {
      console.log(`[MenuItemRepository] Phase 2: Updating item ${item.id} to final display_order ${item.display_order}`)

      const { data, error } = await this.client
        .from('menu_items')
        .update({ display_order: item.display_order })
        .eq('id', item.id)
        .select()

      if (error) {
        console.error(`[MenuItemRepository] Phase 2 ERROR for item ${item.id}:`, JSON.stringify(error, null, 2))
        errors.push({ id: item.id, error, phase: 2 })
      } else {
        console.log(`[MenuItemRepository] Phase 2 SUCCESS for item ${item.id}`)
        successes.push(item.id)
      }
    }

    console.log(`[MenuItemRepository] Reorder complete. Successes: ${successes.length}, Errors: ${errors.length}`)

    if (errors.length > 0) {
      console.error('[MenuItemRepository] Throwing first error:', errors[0]!.error)
      throw errors[0]!.error
    }

    return true
  }




  /**
   * Get next display order for a parent or child item
   * Returns the next available display_order within the same parent scope
   */
  async getNextDisplayOrder(menuId: string, parentId: string | null) {
    // Build query to get items with the same parent_id
    let query = this.client
      .from('menu_items')
      .select('display_order')
      .eq('menu_id', menuId)
      .is('deleted_at', null)

    // Filter by parent_id (null for top-level items, specific ID for children)
    if (parentId === null) {
      query = query.is('parent_id', null)
    } else {
      query = query.eq('parent_id', parentId)
    }

    const { data, error } = await query

    if (error) throw error

    // If no items exist at this level, start at 0
    if (!data || data.length === 0) return 0

    // Get the max display_order and add 1
    const maxOrder = Math.max(...data.map(item => item.display_order))
    return maxOrder + 1
  }
}
