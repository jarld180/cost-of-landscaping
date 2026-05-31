<script setup lang="ts">
/**
 * Review Enrichment Page
 *
 * Queue background jobs for fetching Google reviews via DataForSEO API.
 * Enriches contractor profiles with real customer reviews.
 */
import { vAutoAnimate } from '@formkit/auto-animate/vue'
import CountUp from 'vue-countup-v3'
import { getStateSlugFromCode } from '~/utils/usStates'
import type { ReviewEnrichmentStatus, ReviewEnrichmentFilters } from '~/composables/useReviewEnrichment'

definePageMeta({
  layout: 'admin',
})

useSeoMeta({
  title: 'Review Enrichment',
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
} = useReviewEnrichment()

const isLoading = ref(false)
const isQueuing = ref(false)
const errorMessage = ref<string | null>(null)
const selectedIds = ref<Set<string>>(new Set())

// Filters
const selectedEnrichmentStatus = ref<string>('not_enriched')
const searchQuery = ref<string>('')

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

const enrichmentStatusOptions = [
  { value: 'all', label: 'All Statuses', icon: 'heroicons:funnel' },
  { value: 'not_enriched', label: 'Not Enriched', icon: 'heroicons:clock' },
  { value: 'enriched', label: 'Enriched', icon: 'heroicons:check-circle' },
  { value: 'failed', label: 'Failed', icon: 'heroicons:x-circle' },
  { value: 'no_reviews', label: 'Has No Reviews', icon: 'heroicons:star' },
  { value: 'no_cid', label: 'No Google CID', icon: 'heroicons:identification' },
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

const buildFilters = (): ReviewEnrichmentFilters => ({
  enrichmentStatus: selectedEnrichmentStatus.value === 'all'
    ? null
    : selectedEnrichmentStatus.value as ReviewEnrichmentStatus,
  search: searchQuery.value.trim() || null,
  page: pagination.value.page,
  limit: pagination.value.limit,
})

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
watch([selectedEnrichmentStatus, searchQuery], handleFilterChange)

// =====================================================
// LIFECYCLE
// =====================================================

onMounted(async () => {
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

// Helper to get review enrichment status from contractor metadata
const getReviewEnrichmentStatus = (contractor: (typeof contractors.value)[0]): string => {
  if (!contractor.google_cid) return 'no_cid'
  const meta = contractor.metadata as Record<string, unknown> | null
  const reviewsEnrichment = meta?.reviews_enrichment as Record<string, unknown> | null
  if (reviewsEnrichment?.status === 'failed') return 'failed'
  if (reviewsEnrichment?.status === 'success') return 'enriched'
  if (!contractor.review_count || contractor.review_count === 0) return 'no_reviews'
  return 'not_enriched'
}

const getReviewBadgeVariant = (status: string) => {
  switch (status) {
    case 'enriched': return 'default'
    case 'failed': return 'destructive'
    case 'no_cid': return 'secondary'
    case 'no_reviews': return 'secondary'
    default: return 'outline'
  }
}

const getReviewLabel = (status: string) => {
  switch (status) {
    case 'enriched': return 'Enriched'
    case 'failed': return 'Failed'
    case 'no_cid': return 'No CID'
    case 'no_reviews': return 'No Reviews'
    case 'not_enriched': return 'Not Enriched'
    default: return 'Not Enriched'
  }
}

// Build public profile URL for contractor
const getProfileUrl = (contractor: (typeof contractors.value)[0]): string | null => {
  if (!contractor.city?.state_code || !contractor.city?.slug || !contractor.slug) {
    return null
  }
  const stateSlug = getStateSlugFromCode(contractor.city.state_code)
  return `/${stateSlug}/${contractor.city.slug}/concrete-contractors/${contractor.slug}`
}
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">Review Enrichment</h1>
          <p class="mt-1 text-sm text-muted-foreground">
            Fetch Google reviews via DataForSEO API
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
    <div class="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5" v-auto-animate>
      <div class="rounded-lg border bg-muted/50 p-4 text-center">
        <div class="text-2xl font-bold tabular-nums text-foreground">
          <CountUp :end-val="stats.notEnriched" />
        </div>
        <div class="text-xs text-muted-foreground">Not Enriched</div>
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
          <CountUp :end-val="stats.noReviews" />
        </div>
        <div class="text-xs text-muted-foreground">No Reviews</div>
      </div>
      <div class="rounded-lg border bg-muted/50 p-4 text-center">
        <div class="text-2xl font-bold tabular-nums text-muted-foreground">
          <CountUp :end-val="stats.noCid" />
        </div>
        <div class="text-xs text-muted-foreground">No Google CID</div>
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
            <UiCardDescription>Select contractors to fetch Google reviews</UiCardDescription>
          </div>
          <div class="flex items-center gap-2">
            <UiButton
              :disabled="!canQueueJob"
              @click="queueJobs"
            >
              <Icon v-if="isQueuing" name="heroicons:arrow-path" class="size-4 mr-2 animate-spin" />
              <Icon v-else name="heroicons:star" class="size-4 mr-2" />
              Fetch Reviews {{ selectedCount > 0 ? `(${selectedCount})` : '' }}
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
                <th class="hidden px-4 py-3 text-center font-medium md:table-cell">Reviews</th>
                <th class="hidden px-4 py-3 text-center font-medium md:table-cell">Rating</th>
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
                <td colspan="6" class="px-4 py-8 text-center text-muted-foreground">
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
                  <NuxtLink
                    v-if="getProfileUrl(contractor)"
                    :to="getProfileUrl(contractor)!"
                    target="_blank"
                    class="font-medium text-primary hover:underline"
                  >
                    {{ contractor.company_name }}
                  </NuxtLink>
                  <div v-else class="font-medium">{{ contractor.company_name }}</div>
                  <div v-if="contractor.google_cid" class="text-xs text-muted-foreground">
                    CID: {{ contractor.google_cid }}
                  </div>
                </td>
                <td class="hidden px-4 py-3 sm:table-cell">
                  <span v-if="contractor.city" class="text-muted-foreground">
                    {{ contractor.city.name }}, {{ contractor.city.state_code }}
                  </span>
                  <span v-else class="text-muted-foreground">-</span>
                </td>
                <td class="hidden px-4 py-3 text-center md:table-cell">
                  <span class="tabular-nums">{{ contractor.review_count ?? 0 }}</span>
                </td>
                <td class="hidden px-4 py-3 text-center md:table-cell">
                  <span v-if="contractor.rating" class="tabular-nums">{{ contractor.rating.toFixed(1) }}</span>
                  <span v-else class="text-muted-foreground">-</span>
                </td>
                <td class="px-4 py-3">
                  <UiBadge :variant="getReviewBadgeVariant(getReviewEnrichmentStatus(contractor))">
                    {{ getReviewLabel(getReviewEnrichmentStatus(contractor)) }}
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
            How it works
          </UiCardTitle>
        </UiCardHeader>
        <UiCardContent class="text-sm text-muted-foreground">
          <ul class="list-inside list-disc space-y-1">
            <li>Fetches reviews from Google via DataForSEO API</li>
            <li>Requires Google CID (Customer ID) for each contractor</li>
            <li>30-day cooldown between enrichment attempts</li>
            <li>Max 1500 reviews per contractor</li>
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
            <li>10 contractors per batch job</li>
          </ul>
        </UiCardContent>
      </UiCard>
    </div>
  </div>
</template>

