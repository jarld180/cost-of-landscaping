import { ref, computed, watch, nextTick, type Ref, type ComputedRef } from 'vue'
import { consola } from 'consola'

/**
 * Pagination mode
 * - 'client': Client-side pagination (for mock data)
 * - 'server': Server-side pagination (for API calls)
 */
export type PaginationMode = 'client' | 'server'

/**
 * Server-side pagination response interface
 */
export interface PaginationResponse<T> {
  data: T[]
  total: number
  page: number
  totalPages: number
}

/**
 * Pagination options interface
 */
export interface PaginationOptions<T> {
  /**
   * Pagination mode: 'client' for mock data, 'server' for API
   * @default 'client'
   */
  mode?: PaginationMode

  /**
   * Data array for client-side pagination
   * Required when mode is 'client'
   */
  data?: Ref<T[]> | ComputedRef<T[]>

  /**
   * Fetch function for server-side pagination
   * Required when mode is 'server'
   * @param page - Current page number
   * @param limit - Items per page
   * @returns Promise with pagination response
   */
  fetchFn?: (page: number, limit: number) => Promise<PaginationResponse<T>>

  /**
   * Number of items per page
   * @default 10
   */
  itemsPerPage?: number

  /**
   * Sync pagination state with URL query params
   * @default false
   */
  syncUrl?: boolean

  /**
   * Initial page number
   * @default 1
   */
  initialPage?: number

  /**
   * Scroll to top when page changes
   * @default false
   */
  scrollToTop?: boolean

  /**
   * CSS selector for scroll target element
   * @default null (scrolls to top of page)
   */
  scrollTarget?: string | null

  /**
   * Scroll behavior
   * @default 'smooth'
   */
  scrollBehavior?: ScrollBehavior
}

/**
 * Pagination composable return type
 */
export interface UsePaginationReturn<T> {
  paginatedData: ComputedRef<T[]>
  currentPage: Ref<number>
  totalPages: ComputedRef<number>
  totalItems: ComputedRef<number>
  isLoading: Ref<boolean>
  goToPage: (page: number) => void
  nextPage: () => void
  prevPage: () => void
  hasNextPage: ComputedRef<boolean>
  hasPrevPage: ComputedRef<boolean>
}

/**
 * Composable for managing pagination
 * Supports both client-side (mock data) and server-side (API) pagination
 *
 * @param options - Pagination configuration options
 * @returns Object containing pagination state and methods
 *
 * @example
 * ```ts
 * // Client-side pagination (mock data)
 * const { paginatedData, currentPage, totalPages, goToPage } = usePagination({
 *   mode: 'client',
 *   data: filteredResults,
 *   itemsPerPage: 8,
 *   syncUrl: true,
 *   scrollToTop: true,
 *   scrollTarget: '#results-section'
 * })
 *
 * // Server-side pagination (API)
 * const { paginatedData, currentPage, totalPages, isLoading } = usePagination({
 *   mode: 'server',
 *   fetchFn: async (page, limit) => {
 *     return await $fetch('/api/contractors', { query: { page, limit } })
 *   },
 *   itemsPerPage: 8,
 *   syncUrl: true
 * })
 * ```
 */
export function usePagination<T>(options: PaginationOptions<T>): UsePaginationReturn<T> {
  const {
    mode = 'client',
    data,
    fetchFn,
    itemsPerPage = 10,
    syncUrl = false,
    initialPage = 1,
    scrollToTop = false,
    scrollTarget = null,
    scrollBehavior = 'smooth'
  } = options

  // Nuxt auto-imports
  const route = useRoute()
  const router = useRouter()

  // State
  const currentPage = ref<number>(initialPage)
  const isLoading = ref<boolean>(false)
  const serverData = ref<T[]>([])
  const serverTotal = ref<number>(0)
  const serverTotalPages = ref<number>(0)

  // Initialize page from URL if syncUrl is enabled
  if (syncUrl && route.query.page) {
    const pageFromUrl = Number(route.query.page)
    if (!isNaN(pageFromUrl) && pageFromUrl > 0) {
      currentPage.value = pageFromUrl

      if (import.meta.dev) {
        consola.info('Pagination: Initialized from URL', {
          page: currentPage.value,
          url: route.fullPath
        })
      }
    }
  }

  /**
   * Computed: Total number of items
   */
  const totalItems = computed(() => {
    if (mode === 'server') {
      return serverTotal.value
    }
    return data?.value.length || 0
  })

  /**
   * Computed: Total number of pages
   */
  const totalPages = computed(() => {
    if (mode === 'server') {
      return serverTotalPages.value
    }
    return Math.ceil(totalItems.value / itemsPerPage)
  })

  /**
   * Computed: Paginated data for current page
   */
  const paginatedData = computed(() => {
    if (mode === 'server') {
      return serverData.value
    }

    if (!data?.value) return []

    const start = (currentPage.value - 1) * itemsPerPage
    const end = start + itemsPerPage
    return data.value.slice(start, end)
  })

  /**
   * Computed: Check if there's a next page
   */
  const hasNextPage = computed(() => {
    return currentPage.value < totalPages.value
  })

  /**
   * Computed: Check if there's a previous page
   */
  const hasPrevPage = computed(() => {
    return currentPage.value > 1
  })

  // Watch for currentPage changes (from v-model binding) and trigger scroll + URL update
  // This is needed because v-model updates currentPage directly, bypassing goToPage()
  let isInternalChange = false
  watch(currentPage, async (newPage, oldPage) => {
    // Skip if this is an internal change from goToPage
    if (isInternalChange) {
      isInternalChange = false
      return
    }

    // Skip if page hasn't actually changed
    if (newPage === oldPage) return

    // Skip if this is the initial page load from URL
    if (oldPage === initialPage && newPage === initialPage) return

    if (import.meta.dev) {
      consola.info('Pagination: Page changed via v-model', {
        from: oldPage,
        to: newPage
      })
    }

    // Trigger scroll and URL update
    await scrollToElement()
    updateUrl(newPage)
  })

  /**
   * Scroll to target element or top of page
   * Uses nextTick and setTimeout to ensure DOM has updated before scrolling
   */
  const scrollToElement = async () => {
    if (!scrollToTop) return

    // Wait for DOM to update
    await nextTick()

    // Add a small delay to ensure everything is rendered
    setTimeout(() => {
      if (scrollTarget) {
        const element = document.querySelector(scrollTarget)

        if (import.meta.dev) {
          consola.info('Pagination: Looking for scroll target', {
            target: scrollTarget,
            found: !!element
          })
        }

        if (element) {
          element.scrollIntoView({ behavior: scrollBehavior, block: 'start' })

          if (import.meta.dev) {
            consola.success('Pagination: Scrolled to target', {
              target: scrollTarget,
              behavior: scrollBehavior,
              elementTop: element.getBoundingClientRect().top
            })
          }
        } else {
          if (import.meta.dev) {
            consola.warn('Pagination: Scroll target not found', {
              target: scrollTarget
            })
          }
        }
      } else {
        window.scrollTo({ top: 0, behavior: scrollBehavior })

        if (import.meta.dev) {
          consola.success('Pagination: Scrolled to top', {
            behavior: scrollBehavior
          })
        }
      }
    }, 100)
  }

  /**
   * Update URL with current page
   * Uses replace instead of push to avoid scroll interference
   */
  const updateUrl = (page: number) => {
    if (!syncUrl) return

    router.replace({
      query: {
        ...route.query,
        page: page > 1 ? page.toString() : undefined // Remove page param if page is 1
      }
    })

    if (import.meta.dev) {
      consola.info('Pagination: URL synced', {
        page,
        query: { ...route.query, page: page > 1 ? page : undefined }
      })
    }
  }

  /**
   * Fetch data from server (for server-side pagination)
   */
  const fetchData = async (page: number) => {
    if (mode !== 'server' || !fetchFn) return

    isLoading.value = true

    try {
      const response = await fetchFn(page, itemsPerPage)
      serverData.value = response.data
      serverTotal.value = response.total
      serverTotalPages.value = response.totalPages

      if (import.meta.dev) {
        consola.success('Pagination: Data fetched', {
          page,
          itemsPerPage,
          total: response.total,
          totalPages: response.totalPages
        })
      }
    } catch (error) {
      if (import.meta.dev) {
        consola.error('Pagination: Fetch error', error)
      }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Navigate to a specific page
   */
  const goToPage = async (page: number) => {
    // Validate page number
    if (page < 1 || page > totalPages.value) {
      if (import.meta.dev) {
        consola.warn('Pagination: Invalid page number', {
          requested: page,
          min: 1,
          max: totalPages.value
        })
      }
      return
    }

    // Mark as internal change to prevent watcher from triggering
    isInternalChange = true
    currentPage.value = page

    // Fetch data for server-side pagination first
    if (mode === 'server') {
      fetchData(page)
    }

    // Wait for scroll to complete BEFORE updating URL
    // This prevents router navigation from interfering with scroll
    await scrollToElement()

    // Update URL after scroll
    updateUrl(page)

    if (import.meta.dev) {
      consola.info('Pagination: Navigated to page', {
        page,
        itemsPerPage,
        totalPages: totalPages.value
      })
    }
  }

  /**
   * Navigate to next page
   */
  const nextPage = () => {
    if (hasNextPage.value) {
      goToPage(currentPage.value + 1)
    }
  }

  /**
   * Navigate to previous page
   */
  const prevPage = () => {
    if (hasPrevPage.value) {
      goToPage(currentPage.value - 1)
    }
  }

  // Watch for data changes (client-side mode only)
  // Reset to page 1 when data changes (e.g., filters applied)
  if (mode === 'client' && data) {
    watch(
      () => data.value.length,
      (newLength, oldLength) => {
        if (newLength !== oldLength && currentPage.value > 1) {
          currentPage.value = 1
          updateUrl(1)

          if (import.meta.dev) {
            consola.info('Pagination: Reset to page 1 (data changed)', {
              oldLength,
              newLength,
              newTotalPages: totalPages.value
            })
          }
        }
      }
    )
  }

  // Initial fetch for server-side pagination
  if (mode === 'server') {
    fetchData(currentPage.value)
  }

  return {
    paginatedData,
    currentPage,
    totalPages,
    totalItems,
    isLoading,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage,
    hasPrevPage
  }
}

