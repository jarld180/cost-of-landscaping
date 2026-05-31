<script setup lang="ts">
/**
 * Admin Contractor Import Page
 *
 * Upload Apify Google Maps Scraper JSON exports to import contractor profiles.
 * Features:
 * - Drag-and-drop file upload
 * - Batch processing for large files (no row limit)
 * - Real-time progress tracking
 * - Results summary with success/error counts
 */

import CountUp from 'vue-countup-v3'
import { vAutoAnimate } from '@formkit/auto-animate/vue'

definePageMeta({
  layout: 'admin',
})

// =====================================================
// TYPES
// =====================================================

interface ImportError {
  row: number
  placeId: string | null
  message: string
}

interface ImportJob {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  filename: string | null
  totalRows: number
  processedRows: number
  importedCount: number
  updatedCount: number
  skippedCount: number
  skippedClaimedCount: number
  errorCount: number
  pendingImageCount: number
  reviewsImportedCount: number
  errors: ImportError[]
  createdAt: string
  startedAt: string | null
  completedAt: string | null
}

type UIState = 'upload' | 'ready' | 'processing' | 'paused' | 'complete' | 'error'

// =====================================================
// STATE
// =====================================================

const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const isCreatingJob = ref(false)
const selectedFile = ref<File | null>(null)
const errorMessage = ref<string | null>(null)

// Job state
const currentJob = ref<ImportJob | null>(null)
const uiState = ref<UIState>('upload')
const processingInterval = ref<ReturnType<typeof setInterval> | null>(null)
const isProcessingBatch = ref(false)

// =====================================================
// COMPUTED
// =====================================================

const progressPercent = computed(() => {
  if (!currentJob.value || currentJob.value.totalRows === 0) return 0
  return Math.round((currentJob.value.processedRows / currentJob.value.totalRows) * 100)
})

const canStartImport = computed(() => {
  return selectedFile.value && !isCreatingJob.value && uiState.value === 'ready'
})

// =====================================================
// FILE HANDLING
// =====================================================

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    selectFile(target.files[0])
  }
}

const handleDragEnter = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = true
}

const handleDragLeave = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = false
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = false
  if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
    selectFile(event.dataTransfer.files[0])
  }
}

const selectFile = (file: File) => {
  errorMessage.value = null
  currentJob.value = null

  if (!file.name.endsWith('.json')) {
    errorMessage.value = 'Please select a JSON file'
    return
  }

  selectedFile.value = file
  uiState.value = 'ready'
}

const clearFile = () => {
  stopProcessing()
  selectedFile.value = null
  currentJob.value = null
  errorMessage.value = null
  uiState.value = 'upload'
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const triggerFileInput = () => {
  fileInput.value?.click()
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// =====================================================
// JOB MANAGEMENT
// =====================================================

const createJob = async () => {
  if (!selectedFile.value) return

  isCreatingJob.value = true
  errorMessage.value = null

  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)

    const response = await $fetch<{ success: boolean; jobId: string; totalRows: number }>(
      '/api/contractors/import-jobs',
      { method: 'POST', body: formData },
    )

    // Fetch full job details
    await fetchJobStatus(response.jobId)
    uiState.value = 'processing'
    startProcessing()
  }
  catch (error: unknown) {
    const fetchError = error as { data?: { message?: string }, message?: string }
    errorMessage.value = fetchError.data?.message || fetchError.message || 'Failed to create import job'
    uiState.value = 'error'
  }
  finally {
    isCreatingJob.value = false
  }
}

const fetchJobStatus = async (jobId: string) => {
  try {
    const response = await $fetch<{ success: boolean; job: ImportJob }>(
      `/api/contractors/import-jobs/${jobId}`,
    )

    // Update properties in place to maintain object identity for smoother animations
    if (currentJob.value) {
      Object.assign(currentJob.value, response.job)
    }
    else {
      currentJob.value = response.job
    }

    // Update UI state based on job status
    if (response.job.status === 'completed') {
      uiState.value = 'complete'
      stopProcessing()
    }
    else if (response.job.status === 'failed' || response.job.status === 'cancelled') {
      uiState.value = 'error'
      stopProcessing()
    }
  }
  catch (error: unknown) {
    const fetchError = error as { data?: { message?: string }, message?: string }
    errorMessage.value = fetchError.data?.message || fetchError.message || 'Failed to fetch job status'
  }
}

const processBatch = async () => {
  if (!currentJob.value) return

  // Prevent concurrent batch processing
  if (isProcessingBatch.value) return
  isProcessingBatch.value = true

  // Don't process if already completed
  if (currentJob.value.status === 'completed' || currentJob.value.status === 'failed' || currentJob.value.status === 'cancelled') {
    isProcessingBatch.value = false
    stopProcessing()
    return
  }

  try {
    const response = await $fetch<{
      success: boolean
      jobId: string
      job: { status: string; totalRows: number; processedRows: number; isComplete: boolean }
    }>(`/api/contractors/import-jobs/${currentJob.value.id}/process`, { method: 'POST' })

    // Update local state with latest
    await fetchJobStatus(response.jobId)

    if (response.job.isComplete) {
      uiState.value = 'complete'
      stopProcessing()
    }
  }
  catch (error: unknown) {
    const fetchError = error as { data?: { message?: string }, message?: string }
    // Ignore "already completed" errors - just stop processing
    if (fetchError.data?.message?.includes('completed') || fetchError.data?.message?.includes('cancelled')) {
      await fetchJobStatus(currentJob.value.id)
      stopProcessing()
      return
    }
    errorMessage.value = fetchError.data?.message || fetchError.message || 'Batch processing failed'
    uiState.value = 'error'
    stopProcessing()
  }
  finally {
    isProcessingBatch.value = false
  }
}

// =====================================================
// PROCESSING CONTROL
// =====================================================

const startProcessing = () => {
  if (processingInterval.value) return

  // Process immediately, then poll
  processBatch()

  processingInterval.value = setInterval(() => {
    if (uiState.value === 'processing') {
      processBatch()
    }
  }, 2000) // Process batch every 2 seconds
}

const stopProcessing = () => {
  if (processingInterval.value) {
    clearInterval(processingInterval.value)
    processingInterval.value = null
  }
}

const pauseProcessing = () => {
  stopProcessing()
  uiState.value = 'paused'
}

const resumeProcessing = () => {
  uiState.value = 'processing'
  startProcessing()
}

// =====================================================
// LIFECYCLE
// =====================================================

onUnmounted(() => {
  stopProcessing()
})
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">Contractor Import</h1>
          <p class="mt-1 text-sm text-muted-foreground">
            Upload Google Maps Scraper JSON exports to import contractor profiles
          </p>
        </div>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div class="grid gap-6 lg:grid-cols-3">
      <!-- Upload Card -->
      <UiCard class="lg:col-span-2">
        <UiCardHeader>
          <UiCardTitle class="flex items-center gap-2">
            <Icon name="heroicons:document-arrow-up" class="size-5 text-muted-foreground" />
            Upload JSON File
          </UiCardTitle>
          <UiCardDescription>
            Drag and drop or browse to select your export file
          </UiCardDescription>
        </UiCardHeader>
        <UiCardContent v-auto-animate>
          <!-- STATE: Upload / Ready -->
          <div v-if="uiState === 'upload' || uiState === 'ready'" v-auto-animate>
            <!-- Drop Zone -->
            <div
              class="relative rounded-lg border-2 border-dashed p-8 text-center transition-colors"
              :class="[
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50',
              ]"
              @dragenter="handleDragEnter"
              @dragleave="handleDragLeave"
              @dragover="handleDragOver"
              @drop="handleDrop"
            >
              <input
                ref="fileInput"
                type="file"
                accept=".json"
                class="hidden"
                @change="handleFileSelect"
              />

              <!-- No file selected -->
              <div v-if="!selectedFile">
                <Icon name="heroicons:cloud-arrow-up" class="size-12 mx-auto text-muted-foreground" />
                <p class="mt-4 text-sm font-medium text-foreground">
                  Drag and drop your JSON file here
                </p>
                <p class="mt-1 text-xs text-muted-foreground">or</p>
                <UiButton size="sm" class="mt-3" @click="triggerFileInput">
                  Browse Files
                </UiButton>
                <p class="mt-3 text-xs text-muted-foreground">
                  No row limit - large files processed in batches
                </p>
              </div>

              <!-- File selected -->
              <div v-else class="flex items-center justify-center gap-4">
                <Icon name="heroicons:document-text" class="size-10 text-primary" />
                <div class="text-left">
                  <p class="text-sm font-medium text-foreground">{{ selectedFile.name }}</p>
                  <p class="text-xs text-muted-foreground">{{ formatFileSize(selectedFile.size) }}</p>
                </div>
                <UiButton variant="ghost" size="sm" class="ml-2" @click.stop="clearFile">
                  <Icon name="heroicons:x-mark" class="size-5" />
                </UiButton>
              </div>
            </div>

            <!-- Start Import Button -->
            <div v-if="canStartImport" class="mt-6">
              <UiButton class="w-full" :disabled="isCreatingJob" @click="createJob">
                <Icon v-if="isCreatingJob" name="heroicons:arrow-path" class="size-4 mr-2 animate-spin" />
                {{ isCreatingJob ? 'Creating Job...' : 'Start Import' }}
              </UiButton>
            </div>
          </div>

          <!-- STATE: Processing / Paused -->
          <div v-if="(uiState === 'processing' || uiState === 'paused') && currentJob" v-auto-animate>
            <div class="space-y-4" v-auto-animate>
              <!-- Status Header -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <Icon
                    :name="uiState === 'processing' ? 'heroicons:arrow-path' : 'heroicons:pause'"
                    class="size-5"
                    :class="uiState === 'processing' ? 'animate-spin text-primary' : 'text-amber-500'"
                  />
                  <span class="font-medium text-foreground">
                    {{ uiState === 'processing' ? 'Processing...' : 'Paused' }}
                  </span>
                </div>
                <span class="text-sm text-muted-foreground">
                  {{ currentJob.processedRows }} / {{ currentJob.totalRows }} rows
                </span>
              </div>

              <!-- Progress Bar -->
              <UiProgress :model-value="progressPercent" class="h-3" />

              <!-- Stats Grid -->
              <div class="grid grid-cols-5 gap-3">
                <div class="rounded-lg border bg-muted/50 p-3 text-center">
                  <p class="text-xl font-bold text-foreground tabular-nums">
                    <CountUp :end-val="currentJob.importedCount" />
                  </p>
                  <p class="text-xs text-muted-foreground">Imported</p>
                </div>
                <div class="rounded-lg border bg-muted/50 p-3 text-center">
                  <p class="text-xl font-bold text-foreground tabular-nums">
                    <CountUp :end-val="currentJob.updatedCount" />
                  </p>
                  <p class="text-xs text-muted-foreground">Updated</p>
                </div>
                <div class="rounded-lg border bg-muted/50 p-3 text-center">
                  <p class="text-xl font-bold text-foreground tabular-nums">
                    <CountUp :end-val="currentJob.skippedCount" />
                  </p>
                  <p class="text-xs text-muted-foreground">Skipped</p>
                </div>
                <div class="rounded-lg border bg-muted/50 p-3 text-center">
                  <p class="text-xl font-bold text-foreground tabular-nums">
                    <CountUp :end-val="currentJob.reviewsImportedCount" />
                  </p>
                  <p class="text-xs text-muted-foreground">Reviews</p>
                </div>
                <div class="rounded-lg border bg-muted/50 p-3 text-center">
                  <p class="text-xl font-bold tabular-nums" :class="currentJob.errorCount > 0 ? 'text-destructive' : 'text-foreground'">
                    <CountUp :end-val="currentJob.errorCount" />
                  </p>
                  <p class="text-xs text-muted-foreground">Errors</p>
                </div>
              </div>

              <!-- Controls -->
              <div class="flex gap-3">
                <UiButton v-if="uiState === 'processing'" class="flex-1" @click="pauseProcessing">
                  <Icon name="heroicons:pause" class="size-4 mr-2" />
                  Pause
                </UiButton>
                <UiButton v-else class="flex-1" @click="resumeProcessing">
                  <Icon name="heroicons:play" class="size-4 mr-2" />
                  Resume
                </UiButton>
                <UiButton variant="destructive" @click="clearFile">
                  <Icon name="heroicons:x-mark" class="size-4 mr-2" />
                  Cancel
                </UiButton>
              </div>
            </div>
          </div>

          <!-- STATE: Complete -->
          <div v-if="uiState === 'complete' && currentJob" v-auto-animate>
            <div class="space-y-6" v-auto-animate>
              <!-- Success Header -->
              <UiAlert variant="success">
                <Icon name="heroicons:check-circle" class="size-4" />
                <UiAlertTitle>Import Complete</UiAlertTitle>
                <UiAlertDescription>
                  Successfully processed {{ currentJob.totalRows }} rows
                </UiAlertDescription>
              </UiAlert>

              <!-- Stats Grid -->
              <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                <div class="rounded-lg border bg-muted/50 p-3 text-center">
                  <p class="text-2xl font-bold text-foreground tabular-nums">
                    <CountUp :end-val="currentJob.importedCount" />
                  </p>
                  <p class="text-xs text-muted-foreground">Imported</p>
                </div>
                <div class="rounded-lg border bg-muted/50 p-3 text-center">
                  <p class="text-2xl font-bold text-foreground tabular-nums">
                    <CountUp :end-val="currentJob.updatedCount" />
                  </p>
                  <p class="text-xs text-muted-foreground">Updated</p>
                </div>
                <div class="rounded-lg border bg-muted/50 p-3 text-center">
                  <p class="text-2xl font-bold text-foreground tabular-nums">
                    <CountUp :end-val="currentJob.reviewsImportedCount" />
                  </p>
                  <p class="text-xs text-muted-foreground">Reviews</p>
                </div>
                <div class="rounded-lg border bg-muted/50 p-3 text-center">
                  <p class="text-2xl font-bold text-foreground tabular-nums">
                    <CountUp :end-val="currentJob.skippedCount" />
                  </p>
                  <p class="text-xs text-muted-foreground">Skipped</p>
                </div>
                <div class="rounded-lg border bg-muted/50 p-3 text-center">
                  <p class="text-2xl font-bold text-foreground tabular-nums">
                    <CountUp :end-val="currentJob.skippedClaimedCount" />
                  </p>
                  <p class="text-xs text-muted-foreground">Claimed</p>
                </div>
                <div class="rounded-lg border bg-muted/50 p-3 text-center">
                  <p class="text-2xl font-bold tabular-nums" :class="currentJob.errorCount > 0 ? 'text-destructive' : 'text-foreground'">
                    <CountUp :end-val="currentJob.errorCount" />
                  </p>
                  <p class="text-xs text-muted-foreground">Errors</p>
                </div>
                <div class="rounded-lg border bg-muted/50 p-3 text-center">
                  <p class="text-2xl font-bold text-foreground tabular-nums">
                    <CountUp :end-val="currentJob.pendingImageCount" />
                  </p>
                  <p class="text-xs text-muted-foreground">Images</p>
                </div>
              </div>

              <!-- Errors List -->
              <div v-if="currentJob.errors.length > 0" class="rounded-lg border border-red-200 dark:border-red-800">
                <div class="border-b border-red-200 bg-red-50 px-4 py-2 dark:border-red-800 dark:bg-red-900/30">
                  <p class="text-sm font-medium text-red-800 dark:text-red-300">
                    {{ currentJob.errors.length }} Error{{ currentJob.errors.length > 1 ? 's' : '' }}
                  </p>
                </div>
                <div class="max-h-48 overflow-y-auto p-3">
                  <ul class="space-y-2 text-sm">
                    <li
                      v-for="(error, index) in currentJob.errors"
                      :key="index"
                      class="flex gap-2 text-red-700 dark:text-red-400"
                    >
                      <span class="font-mono text-xs">Row {{ error.row }}:</span>
                      <span>{{ error.message }}</span>
                    </li>
                  </ul>
                </div>
              </div>

              <!-- Pending Images CTA -->
              <UiAlert v-if="currentJob.pendingImageCount > 0" variant="info">
                <Icon name="heroicons:photo" class="size-4" />
                <UiAlertTitle>Images Queued</UiAlertTitle>
                <UiAlertDescription class="text-muted-foreground">
                  {{ currentJob.pendingImageCount }} images are queued for processing.
                  <NuxtLink to="/admin/maintenance/image-enrichment" class="ml-1 font-medium text-primary underline underline-offset-2 hover:text-primary/80">
                    Go to Image Enrichment →
                  </NuxtLink>
                </UiAlertDescription>
              </UiAlert>

              <!-- Actions -->
              <div class="flex gap-3">
                <UiButton class="flex-1" @click="clearFile">
                  <Icon name="heroicons:arrow-up-tray" class="size-4 mr-2" />
                  Import Another File
                </UiButton>
                <NuxtLink v-if="currentJob.pendingImageCount > 0" to="/admin/maintenance/image-enrichment">
                  <UiButton variant="outline">
                    <Icon name="heroicons:photo" class="size-4 mr-2" />
                    Process Images
                  </UiButton>
                </NuxtLink>
              </div>
            </div>
          </div>

          <!-- Error Message -->
          <UiAlert v-if="errorMessage && uiState !== 'complete'" variant="destructive" class="mt-4">
            <Icon name="heroicons:exclamation-circle" class="size-4" />
            <UiAlertTitle>Error</UiAlertTitle>
            <UiAlertDescription>{{ errorMessage }}</UiAlertDescription>
          </UiAlert>
        </UiCardContent>
      </UiCard>

      <!-- Instructions Card -->
      <UiCard>
        <UiCardHeader>
          <UiCardTitle class="text-base">
            <Icon name="heroicons:information-circle" class="size-4 mr-2 inline text-muted-foreground" />
            Instructions
          </UiCardTitle>
        </UiCardHeader>
        <UiCardContent class="text-sm text-muted-foreground">
          <ul class="space-y-3">
            <li class="flex gap-2">
              <Icon name="heroicons:check" class="size-4 mt-0.5 shrink-0 text-green-500" />
              Export data from Google Maps Scraper as JSON
            </li>
            <li class="flex gap-2">
              <Icon name="heroicons:check" class="size-4 mt-0.5 shrink-0 text-green-500" />
              Large files are processed in batches of 50
            </li>
            <li class="flex gap-2">
              <Icon name="heroicons:check" class="size-4 mt-0.5 shrink-0 text-green-500" />
              Duplicates updated by Google Place ID
            </li>
            <li class="flex gap-2">
              <Icon name="heroicons:check" class="size-4 mt-0.5 shrink-0 text-green-500" />
              Claimed businesses are protected
            </li>
          </ul>
        </UiCardContent>
      </UiCard>
    </div>
  </div>
</template>

