import type { Database } from '~/types/supabase'

type Page = Database['public']['Tables']['pages']['Row']

interface Breadcrumb {
  id: string
  title: string
  full_path: string
}

interface UsePageOptions {
  /**
   * Whether to fetch child pages
   * @default false
   */
  fetchChildren?: boolean

  /**
   * Whether to fetch breadcrumbs
   * @default true
   */
  fetchBreadcrumbs?: boolean

  /**
   * Whether to include descendants (all children recursively)
   * Only applies if fetchChildren is true
   * @default false
   */
  includeDescendants?: boolean
}

interface UsePageReturn {
  page: Ref<Page | null>
  children: Ref<Page[] | null>
  breadcrumbs: Ref<Breadcrumb[] | null>
  pending: Ref<boolean>
  error: Ref<Error | null>
  refresh: () => Promise<void>
}

/**
 * Composable for fetching page data from the database
 * 
 * Features:
 * - Fetches page by full_path from /api/pages/by-path
 * - Optionally fetches child pages from /api/pages/[id]/children
 * - Optionally fetches breadcrumbs from /api/pages/[id]/breadcrumbs
 * - Handles loading states and errors
 * - SSR-compatible using useFetch
 * - Reactive data that updates on route changes
 * 
 * @param path - Full path of the page (e.g., '/staining-landscape/cost-guide')
 * @param options - Options for fetching related data
 * @returns Object with page data, children, breadcrumbs, loading state, and error
 * 
 * @example
 * ```ts
 * const { page, children, breadcrumbs, pending, error } = await usePage('/staining-landscape', {
 *   fetchChildren: true,
 *   fetchBreadcrumbs: true
 * })
 * ```
 */
export async function usePage(
  path: string | Ref<string>,
  options: UsePageOptions = {}
): Promise<UsePageReturn> {
  const {
    fetchChildren = false,
    fetchBreadcrumbs = true,
    includeDescendants = false
  } = options

  // Reactive path
  const pathRef = typeof path === 'string' ? ref(path) : path

  // Fetch page data
  const { data: pageResponse, pending: pagePending, error: pageError, refresh: refreshPage } = await useFetch(
    '/api/pages/by-path',
    {
      query: { path: pathRef },
      key: `page-${pathRef.value}`,
      // Transform response to extract data
      transform: (response: any) => response.data || null
    }
  )

  // Create refs for children and breadcrumbs
  const children = ref<Page[] | null>(null)
  const breadcrumbs = ref<Breadcrumb[] | null>(null)
  const childrenPending = ref(false)
  const breadcrumbsPending = ref(false)
  const childrenError = ref<Error | null>(null)
  const breadcrumbsError = ref<Error | null>(null)

  // Fetch children if requested and page is loaded
  const fetchChildrenData = async () => {
    if (!fetchChildren || !pageResponse.value?.id) {
      return
    }

    childrenPending.value = true
    childrenError.value = null

    try {
      const response = await $fetch(`/api/pages/${pageResponse.value.id}/children`, {
        query: { include_descendants: includeDescendants }
      })
      children.value = (response as any).data || []
    } catch (err) {
      childrenError.value = err as Error
      if (import.meta.dev) {
        console.error('Error fetching children:', err)
      }
    } finally {
      childrenPending.value = false
    }
  }

  // Fetch breadcrumbs if requested and page is loaded
  const fetchBreadcrumbsData = async () => {
    if (!fetchBreadcrumbs || !pageResponse.value?.id) {
      return
    }

    breadcrumbsPending.value = true
    breadcrumbsError.value = null

    try {
      const response = await $fetch(`/api/pages/${pageResponse.value.id}/breadcrumbs`)
      breadcrumbs.value = (response as any).data || []
    } catch (err) {
      breadcrumbsError.value = err as Error
      if (import.meta.dev) {
        console.error('Error fetching breadcrumbs:', err)
      }
    } finally {
      breadcrumbsPending.value = false
    }
  }

  // Watch for page data and fetch related data
  watch(pageResponse, async (newPage) => {
    if (newPage) {
      await Promise.all([
        fetchChildrenData(),
        fetchBreadcrumbsData()
      ])
    }
  }, { immediate: true })

  // Combined pending state
  const pending = computed(() => 
    pagePending.value || childrenPending.value || breadcrumbsPending.value
  )

  // Combined error state (prioritize page error)
  const error = computed(() => 
    pageError.value || childrenError.value || breadcrumbsError.value
  )

  // Refresh function to reload all data
  const refresh = async () => {
    await refreshPage()
    if (pageResponse.value) {
      await Promise.all([
        fetchChildrenData(),
        fetchBreadcrumbsData()
      ])
    }
  }

  return {
    page: pageResponse as Ref<Page | null>,
    children,
    breadcrumbs,
    pending,
    error,
    refresh
  }
}

