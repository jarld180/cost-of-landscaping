/**
 * Menu Repository
 *
 * Data access layer for menus table.
 * Handles all database operations using Supabase client.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/supabase'

type Menu = Database['public']['Tables']['menus']['Row']
type MenuInsert = Database['public']['Tables']['menus']['Insert']
type MenuUpdate = Database['public']['Tables']['menus']['Update']

export class MenuRepository {
  constructor(private client: SupabaseClient<Database>) {}

  /**
   * List all menus (admin view - includes disabled)
   */
  async list(includeDeleted = false) {
    let query = this.client
      .from('menus')
      .select('*')
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })

    if (!includeDeleted) {
      query = query.is('deleted_at', null)
    }

    const { data, error } = await query

    if (error) throw error
    return data as Menu[]
  }

  /**
   * List enabled menus for a specific location (public view)
   */
  async listByLocation(location: 'header' | 'footer') {
    const column = location === 'header' ? 'show_in_header' : 'show_in_footer'

    const { data, error } = await this.client
      .from('menus')
      .select('*')
      .eq(column, true)
      .eq('is_enabled', true)
      .is('deleted_at', null)
      .order('display_order', { ascending: true })

    if (error) throw error
    return data as Menu[]
  }

  /**
   * Find menu currently assigned to a location (enabled menus only)
   * @param location - 'header' or 'footer'
   * @returns Menu or null if no menu assigned to location
   */
  async findByLocation(location: 'header' | 'footer'): Promise<Menu | null> {
    const column = location === 'header' ? 'show_in_header' : 'show_in_footer'

    const { data, error } = await this.client
      .from('menus')
      .select('*')
      .eq(column, true)
      .eq('is_enabled', true)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) {
      throw error
    }

    return data
  }

  /**
   * Unset location for a menu
   * @param menuId - Menu ID
   * @param location - 'header' or 'footer'
   * @param userId - User performing the action
   */
  async unsetLocation(menuId: string, location: 'header' | 'footer', userId: string) {
    const column = location === 'header' ? 'show_in_header' : 'show_in_footer'

    const { data, error } = await this.client
      .from('menus')
      .update({
        [column]: false,
        updated_by: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', menuId)
      .select()
      .single()

    if (error) throw error
    return data as Menu
  }

  /**
   * Get menu by ID
   */
  async getById(id: string) {
    const { data, error } = await this.client
      .from('menus')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) throw error
    return data as Menu
  }

  /**
   * Get menu by slug
   */
  async getBySlug(slug: string) {
    const { data, error } = await this.client
      .from('menus')
      .select('*')
      .eq('slug', slug)
      .is('deleted_at', null)
      .single()

    if (error) throw error
    return data as Menu
  }

  /**
   * Get menu with all its items (nested structure)
   */
  async getMenuWithItems(slug: string) {
    // Get menu
    const menu = await this.getBySlug(slug)

    // Get all items for this menu with page data
    const { data: items, error } = await this.client
      .from('menu_items')
      .select(`
        *,
        page:pages(slug, title, full_path)
      `)
      .eq('menu_id', menu.id)
      .eq('is_enabled', true)
      .is('deleted_at', null)
      .order('display_order', { ascending: true })

    if (error) throw error

    // Build hierarchical structure
    const topLevel = items.filter(item => item.parent_id === null)
    const children = items.filter(item => item.parent_id !== null)

    const itemsWithChildren = topLevel.map(parent => ({
      ...parent,
      children: children.filter(child => child.parent_id === parent.id)
    }))

    return {
      ...menu,
      items: itemsWithChildren
    }
  }

  /**
   * Get first enabled menu for a location with all its items (nested structure)
   * Used for dynamically loading header/footer menus
   */
  async getMenuWithItemsByLocation(location: 'header' | 'footer') {
    const column = location === 'header' ? 'show_in_header' : 'show_in_footer'

    // Get first enabled menu for this location
    const { data: menu, error: menuError } = await this.client
      .from('menus')
      .select('*')
      .eq(column, true)
      .eq('is_enabled', true)
      .is('deleted_at', null)
      .order('display_order', { ascending: true })
      .limit(1)
      .single()

    if (menuError) throw menuError

    // Get all items for this menu with page data
    const { data: items, error: itemsError } = await this.client
      .from('menu_items')
      .select(`
        *,
        page:pages(slug, title, full_path)
      `)
      .eq('menu_id', menu.id)
      .eq('is_enabled', true)
      .is('deleted_at', null)
      .order('display_order', { ascending: true })

    if (itemsError) throw itemsError

    // Build hierarchical structure
    const topLevel = items.filter(item => item.parent_id === null)
    const children = items.filter(item => item.parent_id !== null)

    const itemsWithChildren = topLevel.map(parent => ({
      ...parent,
      children: children.filter(child => child.parent_id === parent.id)
    }))

    return {
      ...menu,
      items: itemsWithChildren
    }
  }

  /**
   * Create new menu
   */
  async create(data: MenuInsert, userId: string) {
    const { data: menu, error } = await this.client
      .from('menus')
      .insert({
        ...data,
        created_by: userId,
        updated_by: userId
      })
      .select()
      .single()

    if (error) throw error
    return menu as Menu
  }

  /**
   * Update existing menu
   */
  async update(id: string, data: MenuUpdate, userId: string) {
    const { data: menu, error } = await this.client
      .from('menus')
      .update({
        ...data,
        updated_by: userId
      })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) throw error
    return menu as Menu
  }

  /**
   * Soft delete menu
   */
  async softDelete(id: string) {
    const { data, error } = await this.client
      .from('menus')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Menu
  }

  /**
   * Check if slug is unique
   */
  async isSlugUnique(slug: string, excludeId?: string) {
    let query = this.client
      .from('menus')
      .select('id')
      .eq('slug', slug)
      .is('deleted_at', null)

    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { data, error } = await query

    if (error) throw error
    return data.length === 0
  }
}

