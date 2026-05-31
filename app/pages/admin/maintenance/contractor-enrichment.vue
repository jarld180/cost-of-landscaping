<script setup lang="ts">
/**
 * Contractor Enrichment Page
 *
 * Queue background jobs for AI-powered contractor profile enrichment.
 * Crawls contractor websites and extracts structured data using GPT-4.
 */
import { vAutoAnimate } from '@formkit/auto-animate/vue'
import CountUp from 'vue-countup-v3'
import type { EnrichmentStatus, ContractorEnrichmentFilters } from '~/composables/useContractorEnrichment'

definePageMeta({
  layout: 'admin',
})

useSeoMeta({
  title: 'Contractor Enrichment',
})

// =====================================================
// STATE
// =====================================================

const {
  contractors,
  pagination,
  stats,
  activeJob,
  pending,
  hasActiveJob,
  sseConnected,
  eventSource,
  fetchContractors,
  fetchStats,
  fetchActiveJob,
  queueEnrichmentJobs,
} = useContractorEnrichment()

const isLoading = ref(false)
const isQueuing = ref(false)
const errorMessage = ref<string | null>(null)
const selectedIds = ref<Set<string>>(new Set())

// Filters
const selectedEnrichmentStatus = ref<string>('not_started')
const selectedCity = ref<string>('all')
const selectedHasWebsite = ref<string>('yes')
const searchQuery = ref<string>('')

// Cities for dropdown
interface City {
  id: string
  name: string
  state_code: string
}
const cities = ref<City[]>([])

// Polling
let pollInterval: ReturnType<typeof setInterval> | null = null
const POLL_INTERVAL_MS = 5000

// SSE throttle
let lastStatsFetch = 0
const STATS_THROTTLE_MS = 2000
let disconnectTimeout: ReturnType<typeof setTimeout> | null = null

// =====================================================
// COMPUTED
// =====================================================

const cityOptions = computed(() => [
  { value: 'all', label: 'All Cities' },
  ...cities.value.map(city => ({
    value: city.id,
    label: `${city.name}, ${city.state_code}`,
  })),
])

const enrichmentStatusOptions = [
  { value: 'all', label: 'All Statuses', icon: 'heroicons:funnel' },
  { value: 'not_started', label: 'Not Started', icon: 'heroicons:clock' },
  { value: 'completed', label: 'Completed', icon: 'heroicons:check-circle' },
  { value: 'failed', label: 'Failed', icon: 'heroicons:x-circle' },
  { value: 'not_applicable', label: 'No Website', icon: 'heroicons:globe-alt' },
]

const hasWebsiteOptions = [
  { value: 'all', label: 'All', icon: 'heroicons:globe-alt' },
  { value: 'yes', label: 'Has Website', icon: 'heroicons:check-circle' },
  { value: 'no', label: 'No Website', icon: 'heroicons:x-circle' },
]

// Rows per page options
const rowsPerPageOptions = [10, 25, 50, 100]
const rowsPerPage = ref<string>('10')

const selectedCount = computed(() => selectedIds.value.size)

const canQueueJob = computed(() => {
  return selectedCount.value > 0 && !isQueuing.value && !hasActiveJob.value
})

const allSelected = computed(() => {
  return contractors.value.length > 0 && contractors.value.every(c => selectedIds.value.has(c.id))
})

const isSelected = (id: string) => selectedIds.value.has(id)

// =====================================================
// METHODS
// =====================================================

const buildFilters = (): ContractorEnrichmentFilters => ({
  enrichmentStatus: selectedEnrichmentStatus.value === 'all'
    ? null
    : selectedEnrichmentStatus.value as EnrichmentStatus,
  cityId: selectedCity.value === 'all' ? null : selectedCity.value,
  hasWebsite: selectedHasWebsite.value === 'all'
    ? null
    : selectedHasWebsite.value === 'yes',
  search: searchQuery.value.trim() || null,
  page: pagination.value.page,
  limit: pagination.value.limit,
})

const fetchCities = async () => {
  try {
    const response = await $fetch<{ success: boolean; data: City[] }>('/api/cities', {
      query: { limit: 500 },
    })
    if (response.success) {
      cities.value = response.data
    }
  } catch {
    // Silently fail
  }
}

const refreshData = async (options: { showLoading?: boolean } = {}) => {
  const { showLoading = true } = options
  if (showLoading) isLoading.value = true
  await Promise.all([
    fetchContractors(buildFilters()),
    fetchStats(),
    fetchActiveJob(),
  ])
  if (showLoading) isLoading.value = false
}

const handleFilterChange = async () => {
  pagination.value.page = 1
  selectedIds.value = new Set()
  await fetchContractors(buildFilters())
}

const handlePageChange = async (newPage: number) => {
  pagination.value.page = newPage
  selectedIds.value = new Set()
  await fetchContractors(buildFilters())
}

const handleRowsPerPageChange = async (value: string) => {
  pagination.value.limit = Number.parseInt(value, 10)
  pagination.value.page = 1
  selectedIds.value = new Set()
  await fetchContractors(buildFilters())
}

const toggleSelectAll = () => {
  if (allSelected.value) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(contractors.value.map(c => c.id))
  }
}

const toggleSelect = (id: string) => {
  const newSet = new Set(selectedIds.value)
  if (newSet.has(id)) {
    newSet.delete(id)
  } else {
    newSet.add(id)
  }
  selectedIds.value = newSet
}

const queueJobs = async () => {
  if (!canQueueJob.value) return

  isQueuing.value = true
  errorMessage.value = null

  try {
    const ids = Array.from(selectedIds.value)
    await queueEnrichmentJobs(ids)
    selectedIds.value = new Set()
    await refreshData({ showLoading: false })
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to queue jobs'
  } finally {
    isQueuing.value = false
  }
}

// =====================================================
// SSE CONNECTION
// =====================================================

const connectSSE = () => {
  if (disconnectTimeout) {
    clearTimeout(disconnectTimeout)
    disconnectTimeout = null
  }

  if (!hasActiveJob.value || !activeJob.value) {
    disconnectSSE()
    return
  }

  if (eventSource.value) return

  eventSource.value = new EventSource(`/api/jobs/${activeJob.value.id}/stream`)

  eventSource.value.onopen = () => {
    sseConnected.value = true
  }

  eventSource.value.onerror = () => {
    sseConnected.value = false
    setTimeout(() => {
      if (hasActiveJob.value) {
        disconnectSSE()
        connectSSE()
      }
    }, 3000)
  }

  eventSource.value.addEventListener('progress', (e) => {
    const data = JSON.parse(e.data)
    if (activeJob.value) {
      activeJob.value.processedItems = data.processedItems
      activeJob.value.failedItems = data.failedItems
      if (data.totalItems) activeJob.value.totalItems = data.totalItems
      if (data.status) activeJob.value.status = data.status
    }
    const now = Date.now()
    if (now - lastStatsFetch >= STATS_THROTTLE_MS) {
      lastStatsFetch = now
      fetchStats()
    }
  })

  eventSource.value.addEventListener('complete', () => {
    disconnectSSE()
    refreshData({ showLoading: false })
  })

  eventSource.value.addEventListener('failed', () => {
    disconnectSSE()
    refreshData({ showLoading: false })
  })

  eventSource.value.addEventListener('cancelled', () => {
    disconnectSSE()
    refreshData({ showLoading: false })
  })
}

const disconnectSSE = (immediate = false) => {
  if (disconnectTimeout) {
    clearTimeout(disconnectTimeout)
    disconnectTimeout = null
  }

  if (eventSource.value) {
    eventSource.value.close()
    eventSource.value = null
  }

  if (immediate) {
    sseConnected.value = false
  } else {
    disconnectTimeout = setTimeout(() => {
      sseConnected.value = false
      disconnectTimeout = null
    }, 500)
  }
}

// =====================================================
// POLLING
// =====================================================

const startPolling = () => {
  if (pollInterval) return
  pollInterval = setInterval(async () => {
    await fetchActiveJob()
    await fetchStats()
  }, POLL_INTERVAL_MS)
}

const stopPolling = () => {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

watch(hasActiveJob, (hasJob) => {
  if (hasJob) {
    stopPolling()
    connectSSE()
  } else {
    disconnectSSE()
    startPolling()
  }
})

watch(
  () => activeJob.value?.id,
  (newId, oldId) => {
    if (newId && newId !== oldId && hasActiveJob.value) {
      disconnectSSE()
      connectSSE()
    }
  }
)

// Watch filters
watch([selectedEnrichmentStatus, selectedCity, selectedHasWebsite, searchQuery], handleFilterChange)

// =====================================================
// LIFECYCLE
// =====================================================

onMounted(async () => {
  await fetchCities()
  await refreshData()
  if (hasActiveJob.value) {
    connectSSE()
  } else {
    startPolling()
  }
})

onUnmounted(() => {
  stopPolling()
  disconnectSSE(true)
})

// Helper to get enrichment status from contractor metadata
const getEnrichmentStatus = (contractor: (typeof contractors.value)[0]): string => {
  const meta = contractor.metadata as Record<string, unknown> | null
  const enrichment = meta?.enrichment as Record<string, unknown> | null
  return (enrichment?.status as string) || 'not_started'
}

const getEnrichmentBadgeVariant = (status: string) => {
  switch (status) {
    case 'completed': return 'default'
    case 'failed': return 'destructive'
    case 'not_applicable': return 'secondary'
    default: return 'outline'
  }
}

const getEnrichmentLabel = (status: string) => {
  switch (status) {
    case 'completed': return 'Enriched'
    case 'failed': return 'Failed'
    case 'not_applicable': return 'No Website'
    default: return 'Not Started'
  }
}
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">Contractor Enrichment</h1>
          <p class="mt-1 text-sm text-muted-foreground">
            AI-powered contractor data enrichment via website crawling
          </p>
        </div>
        <UiButton variant="outline" size="sm" :disabled="isLoading" @click="refreshData">
          <Icon name="heroicons:arrow-path" class="size-4" :class="{ 'animate-spin': isLoading }" />
          Refresh
        </UiButton>
      </div>
    </div>

    <!-- Error Alert -->
    <UiAlert v-if="errorMessage" variant="destructive" class="mb-6">
      <Icon name="heroicons:exclamation-triangle" class="size-4" />
      <UiAlertTitle>Error</UiAlertTitle>
      <UiAlertDescription>{{ errorMessage }}</UiAlertDescription>
    </UiAlert>

    <!-- Stats Cards -->
    <div class="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4" v-auto-animate>
      <div class="rounded-lg border bg-muted/50 p-4 text-center">
        <div class="text-2xl font-bold tabular-nums text-foreground">
          <CountUp :end-val="stats.unenriched" />
        </div>
        <div class="text-xs text-muted-foreground">Not Started</div>
      </div>
      <div class="rounded-lg border bg-muted/50 p-4 text-center">
        <div class="text-2xl font-bold tabular-nums text-green-600 dark:text-green-400">
          <CountUp :end-val="stats.enriched" />
        </div>
        <div class="text-xs text-muted-foreground">Enriched</div>
      </div>
      <div class="rounded-lg border bg-muted/50 p-4 text-center">
        <div class="text-2xl font-bold tabular-nums text-red-600 dark:text-red-400">
          <CountUp :end-val="stats.failed" />
        </div>
        <div class="text-xs text-muted-foreground">Failed</div>
      </div>
      <div class="rounded-lg border bg-muted/50 p-4 text-center">
        <div class="text-2xl font-bold tabular-nums text-muted-foreground">
          <CountUp :end-val="stats.noWebsite" />
        </div>
        <div class="text-xs text-muted-foreground">No Website</div>
      </div>
    </div>

    <!-- Active Job Status -->
    <div v-if="hasActiveJob && activeJob" class="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20">
      <div class="flex items-center gap-2 text-amber-800 dark:text-amber-300">
        <Icon name="heroicons:arrow-path" class="size-4 animate-spin" />
        <span class="font-medium">Job {{ activeJob.status === 'pending' ? 'Queued' : 'Processing' }}</span>
        <span
          v-if="sseConnected"
          class="ml-auto flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400"
        >
          <span class="size-2 relative flex">
            <span class="size-full absolute inline-flex animate-ping rounded-full bg-green-400 opacity-75" />
            <span class="size-2 relative inline-flex rounded-full bg-green-500" />
          </span>
          Live
        </span>
      </div>
      <p class="mt-1 text-sm text-amber-700 dark:text-amber-400">
        <template v-if="activeJob.status === 'processing' && activeJob.totalItems">
          Processing {{ activeJob.processedItems }}/{{ activeJob.totalItems }} contractors
          <template v-if="activeJob.failedItems > 0">({{ activeJob.failedItems }} failed)</template>
        </template>
        <template v-else>
          Waiting for job runner to pick up this job...
        </template>
      </p>
      <NuxtLink
        :to="`/admin/maintenance/jobs/${activeJob.id}`"
        class="mt-2 inline-flex items-center gap-1 text-sm text-amber-600 hover:underline dark:text-amber-400"
      >
        View Details
        <Icon name="heroicons:arrow-right" class="size-3" />
      </NuxtLink>
    </div>

    <!-- Main Card -->
    <UiCard>
      <UiCardHeader>
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <UiCardTitle>Contractors</UiCardTitle>
            <UiCardDescription>Select contractors to enrich with AI-extracted data</UiCardDescription>
          </div>
          <div class="flex items-center gap-2">
            <UiButton
              :disabled="!canQueueJob"
              @click="queueJobs"
            >
              <Icon v-if="isQueuing" name="heroicons:arrow-path" class="size-4 mr-2 animate-spin" />
              <Icon v-else name="heroicons:sparkles" class="size-4 mr-2" />
              Enrich {{ selectedCount > 0 ? `(${selectedCount})` : 'Selected' }}
            </UiButton>
          </div>
        </div>
      </UiCardHeader>
      <UiCardContent>
        <!-- Filters -->
        <div class="mb-4 flex flex-wrap items-center gap-3">
          <!-- Status Filter -->
          <UiPopover>
            <UiPopoverTrigger as-child>
              <UiButton variant="outline" size="sm" class="h-9 gap-1.5 border-dashed">
                <Icon name="heroicons:funnel" class="size-4" />
                Status
                <UiBadge v-if="selectedEnrichmentStatus !== 'all'" variant="secondary" class="ml-1 h-5 px-1.5">
                  {{ enrichmentStatusOptions.find(o => o.value === selectedEnrichmentStatus)?.label }}
                </UiBadge>
                <Icon name="heroicons:chevron-down" class="size-3.5 opacity-50" />
              </UiButton>
            </UiPopoverTrigger>
            <UiPopoverContent class="w-48 p-1" align="start">
              <div class="flex flex-col">
                <button
                  v-for="option in enrichmentStatusOptions"
                  :key="option.value"
                  class="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                  :class="{ 'bg-accent': selectedEnrichmentStatus === option.value }"
                  @click="selectedEnrichmentStatus = option.value"
                >
                  <div class="flex items-center gap-2">
                    <Icon :name="option.icon" class="size-4 text-muted-foreground" />
                    {{ option.label }}
                  </div>
                  <Icon v-if="selectedEnrichmentStatus === option.value" name="heroicons:check" class="size-4" />
                </button>
              </div>
            </UiPopoverContent>
          </UiPopover>

          <!-- Has Website Filter -->
          <UiPopover>
            <UiPopoverTrigger as-child>
              <UiButton variant="outline" size="sm" class="h-9 gap-1.5 border-dashed">
                <Icon name="heroicons:globe-alt" class="size-4" />
                Website
                <UiBadge v-if="selectedHasWebsite !== 'all'" variant="secondary" class="ml-1 h-5 px-1.5">
                  {{ hasWebsiteOptions.find(o => o.value === selectedHasWebsite)?.label }}
                </UiBadge>
                <Icon name="heroicons:chevron-down" class="size-3.5 opacity-50" />
              </UiButton>
            </UiPopoverTrigger>
            <UiPopoverContent class="w-48 p-1" align="start">
              <div class="flex flex-col">
                <button
                  v-for="option in hasWebsiteOptions"
                  :key="option.value"
                  class="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                  :class="{ 'bg-accent': selectedHasWebsite === option.value }"
                  @click="selectedHasWebsite = option.value"
                >
                  <div class="flex items-center gap-2">
                    <Icon :name="option.icon" class="size-4 text-muted-foreground" />
                    {{ option.label }}
                  </div>
                  <Icon v-if="selectedHasWebsite === option.value" name="heroicons:check" class="size-4" />
                </button>
              </div>
            </UiPopoverContent>
          </UiPopover>

          <!-- City Filter -->
          <UiPopover>
            <UiPopoverTrigger as-child>
              <UiButton variant="outline" size="sm" class="h-9 gap-1.5 border-dashed">
                <Icon name="heroicons:map-pin" class="size-4" />
                City
                <UiBadge v-if="selectedCity !== 'all'" variant="secondary" class="max-w-24 ml-1 h-5 truncate px-1.5">
                  {{ cityOptions.find(o => o.value === selectedCity)?.label }}
                </UiBadge>
                <Icon name="heroicons:chevron-down" class="size-3.5 opacity-50" />
              </UiButton>
            </UiPopoverTrigger>
            <UiPopoverContent class="w-64 p-1" align="start">
              <div class="max-h-64 overflow-y-auto">
                <div class="flex flex-col">
                  <button
                    v-for="option in cityOptions"
                    :key="option.value"
                    class="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                    :class="{ 'bg-accent': selectedCity === option.value }"
                    @click="selectedCity = option.value"
                  >
                    <span class="truncate">{{ option.label }}</span>
                    <Icon v-if="selectedCity === option.value" name="heroicons:check" class="size-4 flex-shrink-0" />
                  </button>
                </div>
              </div>
            </UiPopoverContent>
          </UiPopover>

          <!-- Search Input -->
          <div class="relative w-64">
            <Icon name="heroicons:magnifying-glass" class="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <UiInput
              v-model="searchQuery"
              placeholder="Search contractors..."
              class="h-9 pl-9"
            />
          </div>
        </div>

        <!-- Table -->
        <div class="no-scrollbar overflow-x-auto rounded-md border">
          <table class="w-full text-sm">
            <thead class="border-b bg-muted/50">
              <tr>
                <th class="w-12 px-4 py-3 text-left">
                  <UiCheckbox
                    :model-value="allSelected"
                    @update:model-value="toggleSelectAll"
                  />
                </th>
                <th class="px-4 py-3 text-left font-medium">Company</th>
                <th class="hidden px-4 py-3 text-left font-medium sm:table-cell">City</th>
                <th class="hidden px-4 py-3 text-left font-medium md:table-cell">Website</th>
                <th class="px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody v-auto-animate>
              <tr v-if="pending && contractors.length === 0">
                <td colspan="6" class="px-4 py-8 text-center">
                  <UiSpinner />
                </td>
              </tr>
              <tr v-else-if="contractors.length === 0">
                <td colspan="5" class="px-4 py-8 text-center text-muted-foreground">
                  No contractors found matching the filters.
                </td>
              </tr>
              <tr
                v-for="contractor in contractors"
                :key="contractor.id"
                class="border-b last:border-0 hover:bg-muted/50"
              >
                <td class="px-4 py-3">
                  <UiCheckbox
                    :model-value="isSelected(contractor.id)"
                    @update:model-value="() => toggleSelect(contractor.id)"
                  />
                </td>
                <td class="px-4 py-3">
                  <div class="font-medium">{{ contractor.company_name }}</div>
                </td>
                <td class="hidden px-4 py-3 sm:table-cell">
                  <span v-if="contractor.city" class="text-muted-foreground">
                    {{ contractor.city.name }}, {{ contractor.city.state_code }}
                  </span>
                  <span v-else class="text-muted-foreground">-</span>
                </td>
                <td class="hidden px-4 py-3 md:table-cell">
                  <a
                    v-if="contractor.website"
                    :href="contractor.website"
                    target="_blank"
                    class="max-w-48 block truncate text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {{ contractor.website.replace(/^https?:\/\//, '') }}
                  </a>
                  <span v-else class="text-muted-foreground">-</span>
                </td>
                <td class="px-4 py-3">
                  <UiBadge :variant="getEnrichmentBadgeVariant(getEnrichmentStatus(contractor))">
                    {{ getEnrichmentLabel(getEnrichmentStatus(contractor)) }}
                  </UiBadge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination Footer -->
        <div v-if="!pending && contractors.length > 0" class="mt-4 flex flex-wrap items-center justify-between gap-4">
          <!-- Results Summary -->
          <div class="text-sm text-muted-foreground">
            Showing {{ ((pagination.page - 1) * pagination.limit) + 1 }} to
            {{ Math.min(pagination.page * pagination.limit, pagination.total) }} of
            {{ pagination.total }} contractors
          </div>

          <!-- Rows per page + Pagination -->
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2">
              <span class="text-sm text-muted-foreground">Rows per page</span>
              <UiSelect v-model="rowsPerPage" @update:model-value="handleRowsPerPageChange">
                <UiSelectTrigger class="h-8 w-16">
                  <UiSelectValue />
                </UiSelectTrigger>
                <UiSelectContent>
                  <UiSelectItem v-for="opt in rowsPerPageOptions" :key="opt" :value="opt.toString()">
                    {{ opt }}
                  </UiSelectItem>
                </UiSelectContent>
              </UiSelect>
            </div>

            <div class="flex items-center gap-1 text-sm text-muted-foreground">
              Page {{ pagination.page }} of {{ pagination.totalPages }}
            </div>

            <div class="flex items-center gap-1">
              <UiButton
                variant="outline"
                size="icon"
                class="size-8"
                :disabled="pagination.page <= 1"
                @click="handlePageChange(1)"
              >
                <Icon name="heroicons:chevron-double-left" class="size-4" />
              </UiButton>
              <UiButton
                variant="outline"
                size="icon"
                class="size-8"
                :disabled="pagination.page <= 1"
                @click="handlePageChange(pagination.page - 1)"
              >
                <Icon name="heroicons:chevron-left" class="size-4" />
              </UiButton>
              <UiButton
                variant="outline"
                size="icon"
                class="size-8"
                :disabled="pagination.page >= pagination.totalPages"
                @click="handlePageChange(pagination.page + 1)"
              >
                <Icon name="heroicons:chevron-right" class="size-4" />
              </UiButton>
              <UiButton
                variant="outline"
                size="icon"
                class="size-8"
                :disabled="pagination.page >= pagination.totalPages"
                @click="handlePageChange(pagination.totalPages)"
              >
                <Icon name="heroicons:chevron-double-right" class="size-4" />
              </UiButton>
            </div>
          </div>
        </div>
      </UiCardContent>
    </UiCard>

    <!-- Help Section -->
    <UiSeparator class="my-8" />

    <div class="grid gap-6 md:grid-cols-2">
      <UiCard>
        <UiCardHeader>
          <UiCardTitle class="text-base">
            <Icon name="heroicons:question-mark-circle" class="size-4 mr-2 inline text-muted-foreground" />
            What gets enriched?
          </UiCardTitle>
        </UiCardHeader>
        <UiCardContent class="text-sm text-muted-foreground">
          <ul class="list-inside list-disc space-y-1">
            <li>AI extracts service categories from website</li>
            <li>Business description and specialties</li>
            <li>Contact information verification</li>
            <li>Service area coverage</li>
          </ul>
        </UiCardContent>
      </UiCard>

      <UiCard>
        <UiCardHeader>
          <UiCardTitle class="text-base">
            <Icon name="heroicons:bolt" class="size-4 mr-2 inline text-muted-foreground" />
            Background Processing
          </UiCardTitle>
        </UiCardHeader>
        <UiCardContent class="text-sm text-muted-foreground">
          <ul class="list-inside list-disc space-y-1">
            <li>Jobs run every 15 seconds</li>
            <li>No need to keep browser tab open</li>
            <li>One job processes all selected contractors</li>
          </ul>
        </UiCardContent>
      </UiCard>
    </div>
  </div>
</template>
