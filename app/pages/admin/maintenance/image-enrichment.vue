<script setup lang="ts">
/**
 * Image Enrichment Page
 *
 * Queue background jobs for processing contractor image enrichment.
 * Jobs run via pg_cron without requiring the browser tab to stay open.
 */
import CountUp from 'vue-countup-v3'

definePageMeta({
  layout: 'admin',
})

// =====================================================
// STATE
// =====================================================

const isLoading = ref(false)
const isQueuing = ref(false)
const errorMessage = ref<string | null>(null)
const continuousMode = ref(true) // Default to processing all
const sseConnected = ref(false)
const eventSource = ref<EventSource | null>(null)

// Polling for job detection (when no active job)
let pollInterval: ReturnType<typeof setInterval> | null = null
const POLL_INTERVAL_MS = 3000 // Check every 3 seconds

// Throttle queue stats fetching during SSE (avoid megapolling)
let lastQueueStatsFetch = 0
const QUEUE_STATS_THROTTLE_MS = 2000 // Max once per 2 seconds

interface QueueStats {
  pendingContractors: number
  totalPendingImages: number
}

interface ActiveJob {
  id: string
  status: string
  processedItems: number
  totalItems: number | null
  failedItems: number
}

const queueStats = ref<QueueStats>({
  pendingContractors: 0,
  totalPendingImages: 0,
})

const activeJob = ref<ActiveJob | null>(null)

// =====================================================
// COMPUTED
// =====================================================

const hasActiveJob = computed(() => {
  return activeJob.value && ['pending', 'processing'].includes(activeJob.value.status)
})

const canQueueJob = computed(() => {
  return !hasActiveJob.value && queueStats.value.pendingContractors > 0 && !isQueuing.value
})

// =====================================================
// METHODS
// =====================================================

const fetchQueueStats = async () => {
  try {
    const response = await $fetch<{
      success: boolean
      stats: QueueStats
    }>('/api/contractors/enrichment-queue')
    queueStats.value = response.stats
  } catch {
    // Silently fail - stats are informational
  }
}

const fetchActiveJob = async () => {
  try {
    const response = await $fetch<{
      success: boolean
      data: ActiveJob[]
    }>('/api/jobs', {
      query: { jobType: 'image_enrichment', limit: 1 },
    })
    // Get most recent job that's pending or processing
    const active = response.data.find(j => ['pending', 'processing'].includes(j.status))
    activeJob.value = active || null
  } catch {
    // Silently fail
  }
}

const queueJob = async () => {
  if (!canQueueJob.value) return

  isQueuing.value = true
  errorMessage.value = null

  try {
    await $fetch('/api/jobs', {
      method: 'POST',
      body: {
        jobType: 'image_enrichment',
        payload: {
          batchSize: 10,
          continuous: continuousMode.value,
        },
      },
    })
    // Refresh to show new job
    await fetchActiveJob()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to queue job'
  } finally {
    isQueuing.value = false
  }
}

const refreshData = async (options: { showLoading?: boolean } = {}) => {
  const { showLoading = true } = options
  if (showLoading) isLoading.value = true
  await Promise.all([fetchQueueStats(), fetchActiveJob()])
  if (showLoading) isLoading.value = false
}

// =====================================================
// SSE CONNECTION
// =====================================================

const connectSSE = () => {
  // Cancel any pending disconnect (prevents indicator flicker)
  if (disconnectTimeout) {
    clearTimeout(disconnectTimeout)
    disconnectTimeout = null
  }

  // Don't connect if no active job
  if (!hasActiveJob.value || !activeJob.value) {
    disconnectSSE()
    return
  }

  // Already connected
  if (eventSource.value) return

  // Connect to job-specific SSE stream
  eventSource.value = new EventSource(`/api/jobs/${activeJob.value.id}/stream`)

  eventSource.value.onopen = () => {
    sseConnected.value = true
  }

  eventSource.value.onerror = () => {
    sseConnected.value = false
    // Reconnect after delay if still have active job
    setTimeout(() => {
      if (hasActiveJob.value) {
        disconnectSSE()
        connectSSE()
      }
    }, 3000)
  }

  // Listen for progress updates
  eventSource.value.addEventListener('progress', (e) => {
    const data = JSON.parse(e.data)
    if (activeJob.value) {
      activeJob.value.processedItems = data.processedItems
      activeJob.value.failedItems = data.failedItems
      if (data.totalItems) activeJob.value.totalItems = data.totalItems
      if (data.status) activeJob.value.status = data.status
    }
    // Throttle queue stats fetching to avoid megapolling
    const now = Date.now()
    if (now - lastQueueStatsFetch >= QUEUE_STATS_THROTTLE_MS) {
      lastQueueStatsFetch = now
      fetchQueueStats()
    }
  })

  // Listen for job completion
  eventSource.value.addEventListener('complete', () => {
    disconnectSSE()
    // Refresh everything silently - job completed, stats changed
    refreshData({ showLoading: false })
  })

  // Listen for job failure
  eventSource.value.addEventListener('failed', () => {
    disconnectSSE()
    refreshData({ showLoading: false })
  })

  // Listen for job cancellation
  eventSource.value.addEventListener('cancelled', () => {
    disconnectSSE()
    refreshData({ showLoading: false })
  })
}

// Track disconnect timeout to prevent flicker during job transitions
let disconnectTimeout: ReturnType<typeof setTimeout> | null = null

const disconnectSSE = (immediate = false) => {
  // Clear any pending disconnect
  if (disconnectTimeout) {
    clearTimeout(disconnectTimeout)
    disconnectTimeout = null
  }

  if (eventSource.value) {
    eventSource.value.close()
    eventSource.value = null
  }

  // Delay hiding the indicator to prevent flicker during job transitions
  if (immediate) {
    sseConnected.value = false
  } else {
    disconnectTimeout = setTimeout(() => {
      sseConnected.value = false
      disconnectTimeout = null
    }, 500)
  }
}

// Watch for job ID changes (when a new job is chained after completion)
watch(
  () => activeJob.value?.id,
  (newId, oldId) => {
    if (newId && newId !== oldId && hasActiveJob.value) {
      // New job started - reconnect SSE to new job's stream
      disconnectSSE()
      connectSSE()
    }
  }
)

// =====================================================
// POLLING (for cross-tab job detection)
// =====================================================

const startPolling = () => {
  if (pollInterval) return // Already polling
  pollInterval = setInterval(async () => {
    await fetchActiveJob()
    await fetchQueueStats()
  }, POLL_INTERVAL_MS)
}

const stopPolling = () => {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

// Start/stop polling based on job state
watch(hasActiveJob, (hasJob) => {
  if (hasJob) {
    // Job found - stop polling, start SSE
    stopPolling()
    connectSSE()
  } else {
    // No job - disconnect SSE, start polling
    disconnectSSE()
    startPolling()
  }
})

// =====================================================
// LIFECYCLE
// =====================================================

onMounted(async () => {
  await refreshData()
  if (hasActiveJob.value) {
    // Active job exists - connect SSE
    connectSSE()
  } else {
    // No active job - start polling to detect when one is created
    startPolling()
  }
})

onUnmounted(() => {
  stopPolling()
  disconnectSSE(true) // Immediate disconnect on unmount
})
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">Image Enrichment</h1>
          <p class="mt-1 text-sm text-muted-foreground">
            Download and process contractor images from external sources
          </p>
        </div>
        <UiButton variant="outline" size="sm" :disabled="isLoading" @click="refreshData">
          <Icon name="heroicons:arrow-path" class="size-4" :class="{ 'animate-spin': isLoading }" />
          Refresh
        </UiButton>
      </div>
    </div>

    <!-- Info Alert -->
    <!-- <UiAlert variant="info" class="mb-6">
      <Icon name="heroicons:information-circle" class="size-4" />
      <UiAlertTitle>Background Processing</UiAlertTitle>
      <UiAlertDescription>
        Jobs run in the background via pg_cron. You can close this tab after queuing a job.
        Monitor progress on the <NuxtLink to="/admin/maintenance/jobs" class="underline hover:no-underline">Jobs dashboard</NuxtLink>.
      </UiAlertDescription>
    </UiAlert> -->

    <!-- Error Alert -->
    <UiAlert v-if="errorMessage" variant="destructive" class="mb-6">
      <Icon name="heroicons:exclamation-triangle" class="size-4" />
      <UiAlertTitle>Error</UiAlertTitle>
      <UiAlertDescription>{{ errorMessage }}</UiAlertDescription>
    </UiAlert>

    <!-- Main Card -->
    <UiCard>
      <UiCardHeader>
        <div class="flex items-center justify-between">
          <UiCardTitle class="flex items-center gap-2">
            <Icon name="heroicons:cloud-arrow-down" class="size-5 text-muted-foreground" />
            Enrichment Queue
          </UiCardTitle>
          <!-- Live indicator -->
          <span
            v-if="sseConnected"
            class="flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400"
          >
            <span class="size-2 relative flex">
              <span class="size-full absolute inline-flex animate-ping rounded-full bg-green-400 opacity-75" />
              <span class="size-2 relative inline-flex rounded-full bg-green-500" />
            </span>
            Active
          </span>
        </div>
        <UiCardDescription>
          Queue background jobs to process contractor images
        </UiCardDescription>
      </UiCardHeader>
      <UiCardContent>
        <!-- Queue Stats -->
        <div class="mb-6 grid grid-cols-2 gap-4">
          <div class="rounded-lg border bg-muted/50 p-4 text-center">
            <div class="text-2xl font-bold tabular-nums text-foreground">
              <CountUp :end-val="queueStats.pendingContractors" />
            </div>
            <div class="text-xs text-muted-foreground">Pending Contractors</div>
          </div>
          <div class="rounded-lg border bg-muted/50 p-4 text-center">
            <div class="text-2xl font-bold tabular-nums text-foreground">
              <CountUp :end-val="queueStats.totalPendingImages" />
            </div>
            <div class="text-xs text-muted-foreground">Pending Images</div>
          </div>
        </div>

        <!-- Active Job Status -->
        <div v-if="hasActiveJob && activeJob" class="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20">
          <div class="flex items-center gap-2 text-amber-800 dark:text-amber-300">
            <Icon name="heroicons:arrow-path" class="size-4 animate-spin" />
            <span class="font-medium">Job {{ activeJob.status === 'pending' ? 'Queued' : 'Processing' }}</span>
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

        <!-- Continuous Mode Toggle -->
        <div class="mb-6 flex items-center gap-3">
          <Switch v-model="continuousMode" />
          <div>
            <span class="text-sm font-medium text-foreground">Process all remaining</span>
            <p class="text-xs text-muted-foreground">
              {{ continuousMode ? 'Will automatically queue next batch until all images are processed' : 'Will process one batch of 10 contractors' }}
            </p>
          </div>
        </div>

        <!-- Queue Button -->
        <div class="flex items-center gap-4">
          <UiButton :disabled="!canQueueJob" @click="queueJob">
            <Icon v-if="isQueuing" name="heroicons:arrow-path" class="size-4 mr-2 animate-spin" />
            <Icon v-else name="heroicons:play" class="size-4 mr-2" />
            {{ continuousMode ? 'Start Processing All' : 'Queue Single Batch' }}
          </UiButton>

          <NuxtLink to="/admin/maintenance/jobs">
            <UiButton variant="outline">
              <Icon name="heroicons:queue-list" class="size-4 mr-2" />
              View All Jobs
            </UiButton>
          </NuxtLink>
        </div>

        <!-- Helper text -->
        <p v-if="!canQueueJob && hasActiveJob" class="mt-3 text-sm text-muted-foreground">
          A job is already queued or processing. Wait for it to complete before queuing another.
        </p>
        <p v-else-if="!canQueueJob && queueStats.pendingContractors === 0" class="mt-3 text-sm text-muted-foreground">
          No contractors with pending images. Import contractors to add images to the queue.
        </p>
      </UiCardContent>
    </UiCard>

    <!-- Help Section -->
    <UiSeparator class="my-8" />

    <div class="grid gap-6 md:grid-cols-2">
      <UiCard>
        <UiCardHeader>
          <UiCardTitle class="text-base">
            <Icon name="heroicons:question-mark-circle" class="size-4 mr-2 inline text-muted-foreground" />
            What gets processed?
          </UiCardTitle>
        </UiCardHeader>
        <UiCardContent class="text-sm text-muted-foreground">
          <ul class="list-inside list-disc space-y-1">
            <li>Contractors with external image URLs</li>
            <li>Images not yet uploaded to storage</li>
            <li>Processed in batches of 10 contractors each</li>
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
            <li>Cancel anytime to stop after current batch</li>
          </ul>
        </UiCardContent>
      </UiCard>
    </div>
  </div>
</template>

