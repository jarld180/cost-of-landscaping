/**
 * Agent metadata interface matching API response structure
 */
export interface AgentMetadata {
  agentType: string
  label: string
  icon: string
  color: string
  order: number
  isOptional: boolean
  isRegistered: boolean
}

// Module-level cache (shared across all component instances)
const agentMetadataCache = ref<AgentMetadata[] | null>(null)
const isLoading = ref(false)
const error = ref<Error | null>(null)

/**
 * Composable for fetching and caching agent metadata from API
 *
 * Provides centralized access to agent metadata with automatic caching.
 * Fetches from /api/ai/agents/metadata on first call, then returns cached data.
 * Falls back to hardcoded metadata if API fails.
 *
 * @example
 * ```ts
 * const { fetchMetadata, AGENT_ORDER, AGENT_INFO, AGENT_COLORS, isLoading } = useAgentMetadata()
 *
 * // Fetch metadata (only fetches once, then cached)
 * await fetchMetadata()
 *
 * // Use computed properties
 * console.log(AGENT_ORDER.value) // ['research', 'outline', 'writer', ...]
 * console.log(AGENT_INFO.value.research) // { label: 'Research', icon: '...', color: '...' }
 * console.log(AGENT_COLORS.value.research) // '#3b82f6'
 * ```
 */
export function useAgentMetadata() {
  /**
   * Fetch agent metadata from API (with caching)
   * Returns cached data if already fetched, otherwise makes API call
   */
  const fetchMetadata = async (): Promise<AgentMetadata[]> => {
    // Return cached if available
    if (agentMetadataCache.value) {
      return agentMetadataCache.value
    }

    // Return if fetch already in progress (wait for it)
    if (isLoading.value) {
      // Wait for the current fetch to complete
      await new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!isLoading.value) {
            clearInterval(checkInterval)
            resolve(undefined)
          }
        }, 50)
      })
      return agentMetadataCache.value || getFallbackMetadata()
    }

    isLoading.value = true
    error.value = null

    try {
      // Use $fetch instead of useFetch since we're inside an async function
      const data = await $fetch<AgentMetadata[]>('/api/ai/agents/metadata')
      
      agentMetadataCache.value = data || getFallbackMetadata()
      return agentMetadataCache.value
    }
    catch (e) {
      error.value = e as Error
      agentMetadataCache.value = getFallbackMetadata()
      return agentMetadataCache.value
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Computed: Array of agent types in pipeline order
   * @example ['research', 'outline', 'writer', 'seo', 'qa', 'project_manager', 'image_generator']
   */
  const AGENT_ORDER = computed(() =>
    agentMetadataCache.value?.map(a => a.agentType) || [],
  )

  /**
   * Computed: Map of agent type to display info (label, icon, color)
   * @example { research: { label: 'Research', icon: 'i-lucide-search', color: '#3b82f6' }, ... }
   */
  const AGENT_INFO = computed(() =>
    Object.fromEntries(
      agentMetadataCache.value?.map(a => [
        a.agentType,
        { label: a.label, icon: a.icon, color: a.color },
      ]) || [],
    ),
  )

  /**
   * Computed: Map of agent type to color hex value
   * @example { research: '#3b82f6', outline: '#8b5cf6', ... }
   */
  const AGENT_COLORS = computed(() =>
    Object.fromEntries(
      agentMetadataCache.value?.map(a => [a.agentType, a.color]) || [],
    ),
  )

  return {
    // Methods
    fetchMetadata,

    // Reactive state (readonly to prevent external mutation)
    agentMetadata: readonly(agentMetadataCache),
    isLoading: readonly(isLoading),
    error: readonly(error),

    // Computed properties
    AGENT_ORDER,
    AGENT_INFO,
    AGENT_COLORS,
  }
}

/**
 * Fallback metadata matching API response structure
 * Used when API fetch fails to ensure UI can still render
 */
function getFallbackMetadata(): AgentMetadata[] {
  return [
    {
      agentType: 'research',
      label: 'Research',
      icon: 'i-lucide-search',
      color: '#3b82f6',
      order: 0,
      isOptional: false,
      isRegistered: true,
    },
    {
      agentType: 'outline',
      label: 'Outline',
      icon: 'i-lucide-list-tree',
      color: '#8b5cf6',
      order: 1,
      isOptional: false,
      isRegistered: true,
    },
    {
      agentType: 'writer',
      label: 'Writer',
      icon: 'i-lucide-pen-tool',
      color: '#a855f7',
      order: 2,
      isOptional: false,
      isRegistered: true,
    },
    {
      agentType: 'seo',
      label: 'SEO',
      icon: 'i-lucide-target',
      color: '#22c55e',
      order: 3,
      isOptional: false,
      isRegistered: true,
    },
    {
      agentType: 'qa',
      label: 'QA',
      icon: 'i-lucide-check-circle',
      color: '#f97316',
      order: 4,
      isOptional: false,
      isRegistered: true,
    },
    {
      agentType: 'project_manager',
      label: 'Proj. Manager',
      icon: 'i-lucide-folder-kanban',
      color: '#6366f1',
      order: 5,
      isOptional: false,
      isRegistered: true,
    },
    {
      agentType: 'image_generator',
      label: 'Image Generator',
      icon: 'i-lucide-image',
      color: '#ec4899',
      order: 6,
      isOptional: true,
      isRegistered: true,
    },
  ]
}
