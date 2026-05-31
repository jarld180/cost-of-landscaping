<script setup lang="ts">
/**
 * EnrichmentProgress Component
 *
 * Real-time progress UI for image enrichment using SSE streaming.
 * Shows batch progress, current contractor, image progress, and running totals.
 */

// =====================================================
// TYPES
// =====================================================

interface EnrichmentSummary {
  processedContractors: number
  totalImages: number
  failedImages: number
  contractorsRemaining: number
}

interface QueueStats {
  pendingContractors: number
  totalPendingImages: number
}

type EnrichmentState = 'idle' | 'loading' | 'processing' | 'complete' | 'error'

// =====================================================
// PROPS & EMITS
// =====================================================

const props = defineProps<{
  initialPendingCount?: number
}>()

const emit = defineEmits<{
  complete: [summary: EnrichmentSummary]
  error: [message: string]
}>()

// =====================================================
// STATE
// =====================================================

const state = ref<EnrichmentState>('idle')
const errorMessage = ref<string | null>(null)
const eventSource = ref<EventSource | null>(null)

// Queue stats (from Phase 1 endpoint)
const queueStats = ref<QueueStats>({
  pendingContractors: props.initialPendingCount || 0,
  totalPendingImages: 0,
})

// Batch progress
const batchTotal = ref(0)
const batchProcessed = ref(0)
const totalImagesInBatch = ref(0)

// Current contractor
const currentContractor = ref<{
  index: number
  total: number
  companyName: string
  imageCount: number
} | null>(null)

// Current image
const currentImage = ref<{
  index: number
  count: number
  status: 'downloading' | 'uploading' | 'done' | 'failed'
} | null>(null)

// Running totals
const imagesSuccess = ref(0)
const imagesFailed = ref(0)

// Final summary
const summary = ref<EnrichmentSummary | null>(null)

// =====================================================
// COMPUTED
// =====================================================

const batchProgressPercent = computed(() => {
  if (batchTotal.value === 0) return 0
  return Math.round((batchProcessed.value / batchTotal.value) * 100)
})

const imageProgressPercent = computed(() => {
  if (!currentImage.value || currentImage.value.count === 0) return 0
  return Math.round((currentImage.value.index / currentImage.value.count) * 100)
})

const statusText = computed(() => {
  switch (currentImage.value?.status) {
    case 'downloading': return 'Downloading...'
    case 'uploading': return 'Uploading...'
    case 'done': return 'Done'
    case 'failed': return 'Failed'
    default: return ''
  }
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
    // Use initial count if fetch fails
  }
}

const startEnrichment = () => {
  if (state.value === 'processing') return

  // Reset state
  state.value = 'loading'
  errorMessage.value = null
  batchProcessed.value = 0
  batchTotal.value = 0
  totalImagesInBatch.value = 0
  currentContractor.value = null
  currentImage.value = null
  imagesSuccess.value = 0
  imagesFailed.value = 0
  summary.value = null

  // Connect to SSE stream
  eventSource.value = new EventSource('/api/contractors/enrich-images/stream')

  eventSource.value.addEventListener('enrichment:start', (e) => {
    const data = JSON.parse(e.data)
    state.value = 'processing'
    batchTotal.value = data.totalContractors
    totalImagesInBatch.value = data.totalImages
  })

  eventSource.value.addEventListener('contractor:start', (e) => {
    const data = JSON.parse(e.data)
    currentContractor.value = {
      index: data.index,
      total: data.total,
      companyName: data.companyName,
      imageCount: data.imageCount,
    }
    currentImage.value = null
  })

  eventSource.value.addEventListener('image:progress', (e) => {
    const data = JSON.parse(e.data)
    currentImage.value = {
      index: data.imageIndex,
      count: data.imageCount,
      status: data.status,
    }
  })

  eventSource.value.addEventListener('contractor:complete', (e) => {
    const data = JSON.parse(e.data)
    batchProcessed.value = data.index
    imagesSuccess.value += data.imagesSuccess
    imagesFailed.value += data.imagesFailed
  })

  eventSource.value.addEventListener('enrichment:complete', (e) => {
    const data = JSON.parse(e.data)
    state.value = 'complete'
    summary.value = data.summary
    queueStats.value.pendingContractors = data.summary.contractorsRemaining
    closeEventSource()
    emit('complete', data.summary)
  })

  eventSource.value.addEventListener('error', (e) => {
    const data = JSON.parse((e as MessageEvent).data || '{}')
    state.value = 'error'
    errorMessage.value = data.message || 'Connection error'
    closeEventSource()
    emit('error', errorMessage.value)
  })

  eventSource.value.onerror = () => {
    if (state.value === 'loading') {
      state.value = 'error'
      errorMessage.value = 'Failed to connect to enrichment stream'
      closeEventSource()
      emit('error', errorMessage.value)
    }
  }
}

const closeEventSource = () => {
  if (eventSource.value) {
    eventSource.value.close()
    eventSource.value = null
  }
}

const resetToIdle = () => {
  state.value = 'idle'
  summary.value = null
  errorMessage.value = null
  fetchQueueStats()
}

// =====================================================
// LIFECYCLE
// =====================================================

onMounted(() => {
  fetchQueueStats()
})

onUnmounted(() => {
  closeEventSource()
})
</script>

<template>
  <div class="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20">
    <div class="flex items-start gap-3">
      <Icon name="heroicons:photo" class="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
      <div class="flex-1 min-w-0">
        <!-- Header -->
        <p class="font-medium text-amber-800 dark:text-amber-300">
          Image Enrichment
        </p>

        <!-- STATE: Idle -->
        <template v-if="state === 'idle'">
          <p class="mt-1 text-sm text-amber-700 dark:text-amber-400">
            {{ queueStats.pendingContractors }} contractors with {{ queueStats.totalPendingImages }} images queued
          </p>
          <UiButton class="mt-3" @click="startEnrichment">
            <Icon name="heroicons:cloud-arrow-down" class="size-4 mr-2" />
            Start Enrichment
          </UiButton>
        </template>

        <!-- STATE: Loading -->
        <template v-if="state === 'loading'">
          <div class="mt-2 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
            <Icon name="heroicons:arrow-path" class="size-4 animate-spin" />
            Connecting...
          </div>
        </template>

        <!-- STATE: Processing -->
        <template v-if="state === 'processing'">
          <div class="mt-3 space-y-3">
            <!-- Batch Progress -->
            <div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-amber-700 dark:text-amber-400">Batch Progress</span>
                <span class="font-medium text-amber-800 dark:text-amber-300">
                  {{ batchProcessed }}/{{ batchTotal }} contractors
                </span>
              </div>
              <div class="mt-1 h-2 w-full overflow-hidden rounded-full bg-amber-200 dark:bg-amber-800">
                <div
                  class="h-full rounded-full bg-amber-500 transition-all duration-300"
                  :style="{ width: `${batchProgressPercent}%` }"
                />
              </div>
            </div>

            <!-- Current Contractor -->
            <div v-if="currentContractor" class="rounded border border-amber-300 bg-white/50 p-3 dark:border-amber-600 dark:bg-black/20">
              <p class="text-sm font-medium text-amber-800 dark:text-amber-300 truncate">
                {{ currentContractor.companyName }}
              </p>
              <div v-if="currentImage" class="mt-2">
                <div class="flex items-center justify-between text-xs text-amber-700 dark:text-amber-400">
                  <span>Image {{ currentImage.index }}/{{ currentImage.count }}</span>
                  <span class="flex items-center gap-1">
                    <Icon
                      :name="currentImage.status === 'downloading' ? 'heroicons:arrow-down-tray' : currentImage.status === 'uploading' ? 'heroicons:arrow-up-tray' : currentImage.status === 'done' ? 'heroicons:check' : 'heroicons:x-mark'"
                      class="size-3"
                      :class="{
                        'animate-pulse': currentImage.status === 'downloading' || currentImage.status === 'uploading',
                        'text-green-600': currentImage.status === 'done',
                        'text-red-600': currentImage.status === 'failed',
                      }"
                    />
                    {{ statusText }}
                  </span>
                </div>
                <div class="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-amber-200 dark:bg-amber-800">
                  <div
                    class="h-full rounded-full bg-green-500 transition-all duration-150"
                    :style="{ width: `${imageProgressPercent}%` }"
                  />
                </div>
              </div>
            </div>

            <!-- Running Totals -->
            <div class="flex gap-4 text-xs">
              <span class="text-green-600 dark:text-green-400">
                <Icon name="heroicons:check-circle" class="size-3 inline mr-0.5" />
                {{ imagesSuccess }} downloaded
              </span>
              <span v-if="imagesFailed > 0" class="text-red-600 dark:text-red-400">
                <Icon name="heroicons:x-circle" class="size-3 inline mr-0.5" />
                {{ imagesFailed }} failed
              </span>
            </div>
          </div>
        </template>

        <!-- STATE: Complete -->
        <template v-if="state === 'complete' && summary">
          <div class="mt-3 space-y-3">
            <div class="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
              <Icon name="heroicons:check-circle" class="size-4" />
              Batch complete
            </div>

            <!-- Summary Stats -->
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span class="text-amber-600 dark:text-amber-400">Contractors:</span>
                <span class="ml-1 font-medium text-amber-800 dark:text-amber-200">{{ summary.processedContractors }}</span>
              </div>
              <div>
                <span class="text-amber-600 dark:text-amber-400">Downloaded:</span>
                <span class="ml-1 font-medium text-green-600 dark:text-green-400">{{ summary.totalImages }}</span>
              </div>
              <div>
                <span class="text-amber-600 dark:text-amber-400">Failed:</span>
                <span class="ml-1 font-medium" :class="summary.failedImages > 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-800 dark:text-amber-200'">{{ summary.failedImages }}</span>
              </div>
              <div>
                <span class="text-amber-600 dark:text-amber-400">Remaining:</span>
                <span class="ml-1 font-medium" :class="summary.contractorsRemaining > 0 ? 'text-amber-800 dark:text-amber-200' : 'text-green-600 dark:text-green-400'">{{ summary.contractorsRemaining }}</span>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex gap-2">
              <UiButton v-if="summary.contractorsRemaining > 0" size="sm" @click="startEnrichment">
                <Icon name="heroicons:arrow-path" class="size-4 mr-1" />
                Process More
              </UiButton>
              <UiButton variant="outline" size="sm" @click="resetToIdle">
                Done
              </UiButton>
            </div>
          </div>
        </template>

        <!-- STATE: Error -->
        <template v-if="state === 'error'">
          <div class="mt-3 space-y-3">
            <div class="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <Icon name="heroicons:exclamation-triangle" class="size-4" />
              {{ errorMessage }}
            </div>
            <UiButton variant="outline" size="sm" @click="resetToIdle">
              Try Again
            </UiButton>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

