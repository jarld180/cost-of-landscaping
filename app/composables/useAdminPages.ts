import type { Database } from '~/types/supabase'

type Page = Database['public']['Tables']['pages']['Row']

export interface AdminPagesFilters {
  /**
   * Filter by status
   */
  status?: 'draft' | 'published' | 'archived' | null

  /**
   * Filter by template
   */
  template?: 'hub' | 'spoke' | 'sub-spoke' | 'article' | 'custom' | 'default' | null

  /**
   * Search query (searches title and slug)
   */
  search?: string | null

  /**
   * Current page number (1-based)
   */
  page?: number

  /**
   * Number of items per page
   */
  limit?: number

  /**
   * Sort field
   */
  orderBy?: 'created_at' | 'updated_at' | 'title' | 'depth' | 'full_path'

  /**
   * Sort direction
   */
  orderDirection?: 'asc' | 'desc'
}

export interface AdminPagesResponse {
  success: boolean
  data: Page[]
  pagination: {
    total: number
    page: number
    limit: number
    offset: number
    totalPages: number
  }
}

/**
 * Composable for admin page management
 *
 * Provides methods for:
 * - Listing pages with filters and pagination
 * - Deleting pages
 * - Refreshing page list
 *
 * @example
 * ```ts
 * const { pages, pagination, pending, error, fetchPages, deletePage } = useAdminPages()
 *
 * // Fetch pages with filters
 * await fetchPages({
 *   status: 'published',
 *   template: 'hub',
 *   search: 'landscape',
 *   page: 1,
 *   limit: 20
 * })
 * ```
 */
export function useAdminPages() {
  // State
  const pages = ref<Page[]>([])
  const pagination = ref({
    total: 0,
    page: 1,
    limit: 20,
    offset: 0,
    totalPages: 0
  })
  const pending = ref(false)
  const error = ref<Error | null>(null)

  /**
   * Fetch pages from API with filters
   */
  const fetchPages = async (filters: AdminPagesFilters = {}) => {
    try {
      pending.value = true
      error.value = null

      // Build query parameters
      const query: Record<string, any> = {}

      if (filters.status) {
        query.status = filters.status
      }

      if (filters.template) {
        query.template = filters.template
      }

      // Calculate offset from page number
      const page = filters.page || 1
      const limit = filters.limit || 20
      const offset = (page - 1) * limit

      query.limit = limit
      query.offset = offset

      if (filters.orderBy) {
        query.orderBy = filters.orderBy
      }

      if (filters.orderDirection) {
        query.orderDirection = filters.orderDirection
      }

      // Fetch from API
      const response = await $fetch<AdminPagesResponse>('/api/pages', {
        query
      })

      if (response.success) {
        // Filter by search query on client side (simple implementation)
        // TODO: Move search to server-side for better performance
        let filteredPages = response.data

        if (filters.search && filters.search.trim().length > 0) {
          const searchLower = filters.search.toLowerCase().trim()
          filteredPages = filteredPages.filter(page =>
            page.title.toLowerCase().includes(searchLower) ||
            page.slug.toLowerCase().includes(searchLower) ||
            page.full_path.toLowerCase().includes(searchLower)
          )
        }

        pages.value = filteredPages
        pagination.value = response.pagination
      }
    } catch (err) {
      error.value = err as Error
    } finally {
      pending.value = false
    }
  }

  /**
   * Delete a page by ID
   */
  const deletePage = async (pageId: string): Promise<boolean> => {
    try {
      const response = await $fetch(`/api/pages/${pageId}`, {
        method: 'DELETE'
      })

      return true
    } catch (err) {
      error.value = err as Error
      return false
    }
  }

  /**
   * Refresh the current page list
   */
  const refresh = async (filters: AdminPagesFilters = {}) => {
    await fetchPages(filters)
  }

  return {
    pages: readonly(pages),
    pagination: readonly(pagination),
    pending: readonly(pending),
    error: readonly(error),
    fetchPages,
    deletePage,
    refresh
  }
}

