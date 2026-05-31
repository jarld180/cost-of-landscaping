import type { Database } from '~/types/supabase'

type MenuItem = Database['public']['Tables']['menu_items']['Row']
type MenuItemInsert = Database['public']['Tables']['menu_items']['Insert']
type MenuItemUpdate = Database['public']['Tables']['menu_items']['Update']

export interface ReorderItem {
  id: string
  display_order: number
}

/**
 * Composable for menu item management
 *
 * Provides methods for:
 * - Creating menu items (admin)
 * - Updating menu items (admin)
 * - Deleting menu items (admin)
 * - Reordering menu items (admin)
 *
 * @example
 * ```ts
 * const { createMenuItem, updateMenuItem, deleteMenuItem, reorderMenuItems } = useMenuItems()
 *
 * // Create a new menu item
 * const newItem = await createMenuItem('menu-id', {
 *   link_type: 'page',
 *   page_id: 'page-id',
 *   label: 'Home',
 *   is_enabled: true
 * })
 *
 * // Reorder items
 * await reorderMenuItems([
 *   { id: 'item-1', display_order: 0 },
 *   { id: 'item-2', display_order: 1 }
 * ])
 * ```
 */
export function useMenuItems() {
  /**
   * Create a new menu item (admin endpoint)
   */
  const createMenuItem = async (menuId: string, itemData: Omit<MenuItemInsert, 'menu_id'>): Promise<MenuItem | null> => {
    try {
      const response = await $fetch<{ success: boolean; data: MenuItem }>(`/api/menus/${menuId}/items`, {
        method: 'POST',
        body: itemData
      })
      
      if (response.success) {
        return response.data
      }
      
      return null
    } catch (err) {
      throw err
    }
  }

  /**
   * Update an existing menu item (admin endpoint)
   */
  const updateMenuItem = async (id: string, itemData: MenuItemUpdate): Promise<MenuItem | null> => {
    try {
      const response = await $fetch<{ success: boolean; data: MenuItem }>(`/api/menu-items/${id}`, {
        method: 'PATCH',
        body: itemData
      })
      
      if (response.success) {
        return response.data
      }
      
      return null
    } catch (err) {
      throw err
    }
  }

  /**
   * Delete a menu item (admin endpoint)
   */
  const deleteMenuItem = async (id: string): Promise<boolean> => {
    try {
      const response = await $fetch<{ success: boolean }>(`/api/menu-items/${id}`, {
        method: 'DELETE'
      })
      
      return response.success
    } catch (err) {
      return false
    }
  }

  /**
   * Reorder menu items (admin endpoint)
   * 
   * All items must belong to the same menu and have the same parent.
   */
  const reorderMenuItems = async (items: ReorderItem[]): Promise<boolean> => {
    try {
      const response = await $fetch<{ success: boolean }>('/api/menu-items/reorder', {
        method: 'PATCH',
        body: { items }
      })
      
      return response.success
    } catch (err) {
      throw err
    }
  }

  return {
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    reorderMenuItems
  }
}

