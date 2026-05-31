import type { Database } from '~/types/supabase'

type Menu = Database['public']['Tables']['menus']['Row']
type MenuInsert = Database['public']['Tables']['menus']['Insert']
type MenuUpdate = Database['public']['Tables']['menus']['Update']

export interface MenuWithItems extends Menu {
  items: Array<{
    id: string
    label: string
    page_id: string | null
    custom_url: string | null
    open_in_new_tab: boolean
    display_order: number
    children: Array<{
      id: string
      label: string
      page_id: string | null
      custom_url: string | null
      open_in_new_tab: boolean
      display_order: number
    }>
  }>
}

/**
 * Composable for menu management
 *
 * Provides methods for:
 * - Fetching menus by location (public)
 * - Fetching menus by slug (public)
 * - Listing all menus (admin)
 * - Creating menus (admin)
 * - Updating menus (admin)
 * - Deleting menus (admin)
 *
 * @example
 * ```ts
 * const { fetchMenuByLocation, fetchMenuBySlug, listMenus, createMenu, updateMenu, deleteMenu } = useMenus()
 *
 * // Fetch menu for header (dynamic - gets first enabled header menu)
 * const headerMenu = await fetchMenuByLocation('header')
 *
 * // Fetch menu by slug (static)
 * const mainNav = await fetchMenuBySlug('main-nav')
 *
 * // List all menus (admin)
 * const allMenus = await listMenus()
 * ```
 */
export function useMenus() {
  /**
   * Fetch the first enabled menu for a location with nested items (public endpoint)
   * This is the recommended method for loading header/footer menus dynamically
   */
  const fetchMenuByLocation = async (location: 'header' | 'footer'): Promise<MenuWithItems | null> => {
    try {
      const response = await $fetch<{ success: boolean; data: MenuWithItems }>(`/api/menus/by-location/${location}`)

      if (response.success) {
        return response.data
      }

      return null
    } catch (err) {
      return null
    }
  }

  /**
   * Fetch a menu by slug with nested items (public endpoint)
   * Use fetchMenuByLocation instead for dynamic header/footer menus
   */
  const fetchMenuBySlug = async (slug: string): Promise<MenuWithItems | null> => {
    try {
      const response = await $fetch<{ success: boolean; data: MenuWithItems }>(`/api/menus/by-slug/${slug}`)

      if (response.success) {
        return response.data
      }

      return null
    } catch (err) {
      return null
    }
  }

  /**
   * List all menus (admin endpoint)
   */
  const listMenus = async (): Promise<Menu[]> => {
    try {
      const response = await $fetch<{ success: boolean; data: Menu[] }>('/api/menus')

      if (response.success) {
        return response.data
      }

      return []
    } catch (err) {
      return []
    }
  }

  /**
   * Create a new menu (admin endpoint)
   * @param menuData - Menu data to create
   * @param force - Force create even if location conflict exists (unsets existing menu)
   */
  const createMenu = async (menuData: MenuInsert, force: boolean = false): Promise<Menu | null> => {
    try {
      const url = force ? '/api/menus?force=true' : '/api/menus'

      const response = await $fetch<{ success: boolean; data: Menu }>(url, {
        method: 'POST',
        body: menuData
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
   * Update an existing menu (admin endpoint)
   * @param id - Menu ID
   * @param menuData - Menu data to update
   * @param force - Force update even if location conflict exists (unsets existing menu)
   * @returns Full response object including menu and optional disabledMenu
   */
  const updateMenu = async (id: string, menuData: MenuUpdate, force: boolean = false): Promise<{ success: boolean; data: Menu; disabledMenu?: Menu } | null> => {
    try {
      const url = force ? `/api/menus/${id}?force=true` : `/api/menus/${id}`

      const response = await $fetch<{ success: boolean; data: Menu; disabledMenu?: Menu }>(url, {
        method: 'PATCH',
        body: menuData
      })

      if (response.success) {
        return response
      }

      return null
    } catch (err) {
      throw err
    }
  }

  /**
   * Delete a menu (admin endpoint)
   */
  const deleteMenu = async (id: string): Promise<boolean> => {
    try {
      const response = await $fetch<{ success: boolean }>(`/api/menus/${id}`, {
        method: 'DELETE'
      })

      return response.success
    } catch (err) {
      return false
    }
  }

  return {
    fetchMenuByLocation,
    fetchMenuBySlug,
    listMenus,
    createMenu,
    updateMenu,
    deleteMenu
  }
}

