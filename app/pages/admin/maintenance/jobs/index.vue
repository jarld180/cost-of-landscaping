<script setup lang="ts">
/**
 * Background Jobs Dashboard
 *
 * List and manage background jobs with filtering, progress tracking,
 * and actions for cancel/retry.
 * 
 * Uses Supabase Realtime for real-time job updates.
 */
import { toast } from 'vue-sonner'
import { useBackgroundJobsRealtime } from '~/composables/useBackgroundJobsRealtime'

definePageMeta({
  layout: 'admin',
})

// =====================================================
// TYPES
// =====================================================

interface Job {
  id: string
  jobType: string
  status: string
  attempts: number
  maxAttempts: number
  totalItems: number | null
  processedItems: number
  failedItems: number
  payload: Record<string, unknown>
  result: Record<string, unknown> | null
  lastError: string | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  createdBy: string | null
}

interface ApiResponse {
  success: boolean
  data: Job[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

// =====================================================
// STATE
// =====================================================

const route = useRoute()
const router = useRouter()

const isLoading = ref(true)
const pagination = ref({ total: 0, page: 1, limit: 10, totalPages: 1 })
const errorMessage = ref<string | null>(null)

// Use Supabase Realtime composable for real-time job updates
const { jobs, isConnected, setJobs } = useBackgroundJobsRealtime({
  onRefresh: () => fetchJobs({ showLoading: false }),
})

// Rows per page options
const rowsPerPageOptions = [10, 25, 50, 100]
const rowsPerPage = ref<string>('10')

// =====================================================
// FILTER OPTIONS
// =====================================================

const statusOptions = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Processing', value: 'processing' },
  { label: 'Completed', value: 'completed' },
  { label: 'Failed', value: 'failed' },
  { label: 'Cancelled', value: 'cancelled' },
]

const jobTypeOptions = [
  { label: 'All Types', value: 'all' },
  { label: 'Image Enrichment', value: 'image_enrichment' },
  { label: 'Contractor Enrichment', value: 'contractor_enrichment' },
  { label: 'Review Enrichment', value: 'review_enrichment' },
  { label: 'Reviewer Image Retry', value: 'reviewer_image_retry' },
  { label: 'Stealthy Crawl', value: 'stealthy_crawl' },
]

// Quick filter options
const quickFilterOptions = [
  { value: 'pending', label: 'Pending', icon: 'heroicons:clock' },
  { value: 'processing', label: 'Processing', icon: 'heroicons:arrow-path' },
  { value: 'completed', label: 'Completed', icon: 'heroicons:check-circle' },
  { value: 'failed', label: 'Failed', icon: 'heroicons:x-circle' },
]

// =====================================================
// URL-SYNCED FILTERS
// =====================================================

const getInitialStatus = (): string => {
  const urlStatus = route.query.status as string | undefined
  if (urlStatus && ['pending', 'processing', 'completed', 'failed', 'cancelled'].includes(urlStatus)) {
    return urlStatus
  }
  return 'all'
}

const getInitialType = (): string => {
  const urlType = route.query.type as string | undefined
  if (urlType && ['image_enrichment', 'contractor_enrichment', 'review_enrichment', 'reviewer_image_retry', 'stealthy_crawl'].includes(urlType)) {
    return urlType
  }
  return 'all'
}

const selectedStatus = ref<string>(getInitialStatus())
const selectedType = ref<string>(getInitialType())

// =====================================================
// COMPUTED
// =====================================================

const hasActiveFilters = computed(() => {
  return selectedStatus.value !== 'all' || selectedType.value !== 'all'
})

// =====================================================
// METHODS
// =====================================================

const fetchJobs = async (options: { showLoading?: boolean } = {}) => {
  const { showLoading = true } = options
  if (showLoading) isLoading.value = true
  errorMessage.value = null

  try {
    const query: Record<string, string | number> = {
      limit: pagination.value.limit,
      offset: (pagination.value.page - 1) * pagination.value.limit,
    }
    if (selectedStatus.value !== 'all') query.status = selectedStatus.value
    if (selectedType.value !== 'all') query.jobType = selectedType.value

    const response = await $fetch<ApiResponse>('/api/jobs', { query })
    setJobs(response.data)  // Update composable's jobs array for realtime updates
    pagination.value = response.pagination
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to load jobs'
  } finally {
    if (showLoading) isLoading.value = false
  }
}

const handleCancel = async (jobId: string) => {
  try {
    await $fetch(`/api/jobs/${jobId}/cancel`, { method: 'POST' })
    toast.success('Job cancelled')
    await fetchJobs()
  } catch (error) {
    toast.error('Failed to cancel job')
    errorMessage.value = error instanceof Error ? error.message : 'Failed to cancel job'
  }
}

const handleRetry = async (jobId: string) => {
  try {
    await $fetch(`/api/jobs/${jobId}/retry`, { method: 'POST' })
    toast.success('Job queued for retry')
    await fetchJobs()
  } catch (error) {
    toast.error('Failed to retry job')
    errorMessage.value = error instanceof Error ? error.message : 'Failed to retry job'
  }
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString()
}

const formatJobType = (type: string) => {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const getStatusVariant = (status: string) => {
  const variants: Record<string, string> = {
    pending: 'secondary',
    processing: 'default',
    completed: 'success',
    failed: 'destructive',
    cancelled: 'outline',
  }
  return variants[status] || 'secondary'
}

const getProgressPercent = (job: Job) => {
  if (!job.totalItems || job.totalItems === 0) return 0
  return Math.round((job.processedItems / job.totalItems) * 100)
}

const navigateToJob = (jobId: string) => {
  router.push(`/admin/maintenance/jobs/${jobId}`)
}

const getJobActions = (job: Job) => {
  const actions = [
    {
      label: 'View',
      icon: 'heroicons:eye',
      onClick: () => navigateToJob(job.id),
    },
  ]

  if (job.status === 'pending') {
    actions.push({
      label: 'Cancel',
      icon: 'heroicons:x-mark',
      onClick: () => handleCancel(job.id),
    })
  }

  if (job.status === 'failed') {
    actions.push({
      label: 'Retry',
      icon: 'heroicons:arrow-path',
      onClick: () => handleRetry(job.id),
    })
  }

  return actions
}

const handlePageChange = async (page: number) => {
  pagination.value.page = page
  await fetchJobs()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const handleRowsPerPageChange = async (value: string) => {
  pagination.value.limit = Number.parseInt(value, 10)
  pagination.value.page = 1
  await fetchJobs()
}

const clearFilters = () => {
  selectedStatus.value = 'all'
  selectedType.value = 'all'
}

// =====================================================
// SUPABASE REALTIME (replaces SSE and polling)
// =====================================================
// Real-time updates are handled by useBackgroundJobsRealtime composable
// The composable subscribes to background_jobs table changes
// and updates jobs in place when UPDATE events occur.
// INSERT events are ignored (user clicks Refresh to see new jobs).
// DELETE events remove jobs from the array.

// Watch filters and sync to URL
watch([selectedStatus, selectedType], async () => {
  pagination.value.page = 1

  // Update URL query params
  const query: Record<string, string> = {}
  if (selectedStatus.value !== 'all') query.status = selectedStatus.value
  if (selectedType.value !== 'all') query.type = selectedType.value
  router.replace({ query })

  await fetchJobs()
})

// Initial fetch - composable handles realtime subscription lifecycle
onMounted(async () => {
  await fetchJobs()
})
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">Background Jobs</h1>
          <p class="mt-1 text-sm text-muted-foreground">
            Monitor and manage background processing jobs
          </p>
        </div>
        <div class="flex items-center gap-3">
          <!-- Realtime connection indicator -->
          <div class="flex items-center gap-1.5 text-sm" :class="isConnected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
            <span class="relative flex h-2 w-2">
              <span v-if="isConnected" class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span class="relative inline-flex h-2 w-2 rounded-full" :class="isConnected ? 'bg-green-500' : 'bg-red-500'" />
            </span>
            {{ isConnected ? 'Connected' : 'Disconnected' }}
          </div>
          <UiButton variant="outline" size="sm" :disabled="isLoading" @click="fetchJobs">
            <Icon name="heroicons:arrow-path" class="size-4" :class="{ 'animate-spin': isLoading }" />
            Refresh
          </UiButton>
        </div>
      </div>

      <!-- Quick Filters -->
      <div class="mt-4 flex flex-wrap items-center gap-2">
        <span class="text-sm text-muted-foreground">Quick Filters:</span>
        <UiButton
          v-for="option in quickFilterOptions"
          :key="option.value"
          :variant="selectedStatus === option.value ? 'default' : 'outline'"
          size="sm"
          class="h-7 rounded-full px-3"
          @click="selectedStatus = option.value"
        >
          <Icon v-if="option.icon" :name="option.icon" class="size-3.5" />
          {{ option.label }}
        </UiButton>
      </div>

      <!-- Filter Bar -->
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <!-- Status Filter -->
        <UiPopover>
          <UiPopoverTrigger as-child>
            <UiButton variant="outline" size="sm" class="h-9 gap-1.5 border-dashed">
              <Icon name="heroicons:check-circle" class="size-4" />
              Status
              <UiBadge v-if="selectedStatus !== 'all'" variant="secondary" class="ml-1 h-5 px-1.5">
                {{ statusOptions.find(o => o.value === selectedStatus)?.label }}
              </UiBadge>
              <Icon name="heroicons:chevron-down" class="size-3.5 opacity-50" />
            </UiButton>
          </UiPopoverTrigger>
          <UiPopoverContent class="w-48 p-1" align="start">
            <div class="flex flex-col">
              <button
                v-for="option in statusOptions"
                :key="option.value"
                class="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                :class="{ 'bg-accent': selectedStatus === option.value }"
                @click="selectedStatus = option.value"
              >
                {{ option.label }}
                <Icon v-if="selectedStatus === option.value" name="heroicons:check" class="size-4" />
              </button>
            </div>
          </UiPopoverContent>
        </UiPopover>

        <!-- Job Type Filter -->
        <UiPopover>
          <UiPopoverTrigger as-child>
            <UiButton variant="outline" size="sm" class="h-9 gap-1.5 border-dashed">
              <Icon name="heroicons:cog-6-tooth" class="size-4" />
              Type
              <UiBadge v-if="selectedType !== 'all'" variant="secondary" class="ml-1 h-5 px-1.5">
                {{ jobTypeOptions.find(o => o.value === selectedType)?.label }}
              </UiBadge>
              <Icon name="heroicons:chevron-down" class="size-3.5 opacity-50" />
            </UiButton>
          </UiPopoverTrigger>
          <UiPopoverContent class="w-48 p-1" align="start">
            <div class="flex flex-col">
              <button
                v-for="option in jobTypeOptions"
                :key="option.value"
                class="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                :class="{ 'bg-accent': selectedType === option.value }"
                @click="selectedType = option.value"
              >
                {{ option.label }}
                <Icon v-if="selectedType === option.value" name="heroicons:check" class="size-4" />
              </button>
            </div>
          </UiPopoverContent>
        </UiPopover>

        <!-- Clear Filters -->
        <UiButton
          v-if="hasActiveFilters"
          variant="ghost"
          size="sm"
          class="h-9 text-muted-foreground"
          @click="clearFilters"
        >
          <Icon name="heroicons:x-mark" class="size-4" />
          Clear filters
        </UiButton>
      </div>
    </div>

    <!-- Error Alert -->
    <UiAlert v-if="errorMessage" variant="destructive" class="mb-6">
      <Icon name="heroicons:exclamation-triangle" class="size-4" />
      <UiAlertTitle>Error</UiAlertTitle>
      <UiAlertDescription>{{ errorMessage }}</UiAlertDescription>
    </UiAlert>

    <!-- Jobs Table -->
    <div class="no-scrollbar overflow-x-auto rounded-md border">
      <table class="w-full text-sm">
        <!-- Table Header -->
        <thead class="border-b bg-muted/50">
          <tr>
            <th class="px-4 py-3 text-left font-medium">Type</th>
            <th class="px-4 py-3 text-left font-medium">Status</th>
            <th class="hidden px-4 py-3 text-left font-medium md:table-cell">Progress</th>
            <th class="hidden px-4 py-3 text-left font-medium lg:table-cell">Created</th>
            <th class="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>

        <!-- Table Body -->
        <tbody>
          <!-- Loading State -->
          <tr v-if="isLoading && jobs.length === 0">
            <td colspan="6" class="px-4 py-8 text-center">
              <UiSpinner />
            </td>
          </tr>
          <!-- Empty State -->
          <tr v-else-if="jobs.length === 0">
            <td colspan="5" class="px-4 py-8 text-center text-muted-foreground">
              No jobs found matching the filters.
            </td>
          </tr>
          <!-- Data Rows -->
          <tr v-for="job in jobs" :key="job.id" class="border-b last:border-0 hover:bg-muted/50">
            <!-- Type -->
            <td class="px-4 py-3">
              <NuxtLink :to="`/admin/maintenance/jobs/${job.id}`" class="font-medium text-primary hover:underline">
                {{ formatJobType(job.jobType) }}
              </NuxtLink>
            </td>

            <!-- Status -->
            <td class="px-4 py-3">
              <UiBadge :variant="getStatusVariant(job.status)">
                <Icon v-if="job.status === 'processing'" name="heroicons:arrow-path" class="size-3 mr-1 animate-spin" />
                {{ job.status }}
              </UiBadge>
            </td>

            <!-- Progress -->
            <td class="hidden px-4 py-3 md:table-cell">
              <div v-if="job.status === 'processing' && job.totalItems" class="w-32">
                <div class="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{{ job.processedItems }}/{{ job.totalItems }}</span>
                  <span v-if="job.failedItems > 0" class="text-red-500">({{ job.failedItems }} failed)</span>
                </div>
                <UiProgress :model-value="getProgressPercent(job)" class="mt-1 h-1.5" />
              </div>
              <span v-else-if="job.status === 'completed'" class="text-muted-foreground">
                {{ job.processedItems }} items
              </span>
              <span v-else class="text-muted-foreground">-</span>
            </td>

            <!-- Created -->
            <td class="hidden px-4 py-3 lg:table-cell">
              <span class="text-muted-foreground">{{ formatDate(job.createdAt) }}</span>
            </td>

            <!-- Actions -->
            <td class="px-4 py-3 text-right">
              <TableActionsMenu
                :actions="getJobActions(job)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination Footer -->
    <div v-if="!isLoading && jobs.length > 0" class="mt-4 flex flex-wrap items-center justify-between gap-4">
      <!-- Results Summary -->
      <div class="text-sm text-muted-foreground">
        Showing {{ ((pagination.page - 1) * pagination.limit) + 1 }} to
        {{ Math.min(pagination.page * pagination.limit, pagination.total) }} of
        {{ pagination.total }} jobs
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
  </div>
</template>

