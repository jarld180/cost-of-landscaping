<script setup lang="ts">
/**
 * Job Detail Page
 *
 * Full job details with real-time SSE progress, system logs, and actions.
 */

import { useBackgroundJobRealtime } from '~/composables/useBackgroundJobRealtime'

definePageMeta({
  layout: 'admin',
})

const route = useRoute()
const jobId = computed(() => route.params.id as string)

// Use composable for real-time updates
const { job, logs, isConnected, error: realtimeError, connectionStatus } = useBackgroundJobRealtime(jobId)

// =====================================================
// TYPES
// =====================================================

// Job and SystemLog interfaces are now imported from the composable or inferred
// But we keep local interfaces if needed for other parts, or rely on the composable's types.
// The composable exports Job and SystemLog, so we can use those if we import them, 
// but for now we can just let type inference work or keep these if they match.
// The composable's Job interface matches the one here mostly, but let's check.
// Composable Job: id, jobType, status, attempts, maxAttempts, totalItems, processedItems, failedItems, payload, result, lastError, createdAt, startedAt, completedAt, createdBy
// Local Job: same fields.

// =====================================================
// STATE
// =====================================================

const isLoading = ref(true)
// const job = ref<Job | null>(null) // Replaced by composable
const relatedContractors = ref<{ id: string; company_name: string; slug: string }[]>([])
const isContractorsExpanded = ref(true)
const isImagesExpanded = ref(true)
const relatedReviews = ref<{ id: string; reviewer_name: string; stars: number; published_at: string; contractor_id: string }[]>([])
const totalReviews = ref(0)
const isReviewsExpanded = ref(true)
const isFetchingReviews = ref(false)
const childJobs = ref<{ id: string; job_type: string; status: string; processed_items: number; total_items: number | null; created_at: string }[]>([])
const isChildJobsExpanded = ref(true)
const isFetchingChildJobs = ref(false)
// const logs = ref<SystemLog[]>([]) // Replaced by composable
const errorMessage = ref<string | null>(null)
const eventSource = ref<EventSource | null>(null)
const logsContainer = ref<HTMLElement | null>(null)

// =====================================================
// COMPUTED
// =====================================================

const isActiveJob = computed(() => {
  return job.value && ['pending', 'processing'].includes(job.value.status)
})

const contractorNames = computed(() => {
  const map = new Map<string, string>()
  if (job.value?.result?.results && Array.isArray(job.value.result.results)) {
    for (const r of job.value.result.results as any[]) {
      map.set(r.contractorId, r.companyName)
    }
  }
  return map
})

const progressPercent = computed(() => {
  if (!job.value?.totalItems || job.value.totalItems === 0) return 0
  return Math.round((job.value.processedItems / job.value.totalItems) * 100)
})

const statusVariant = computed((): "default" | "secondary" | "outline" | "destructive" | "success" | "info" | "warning" => {
  const variants: Record<string, "default" | "secondary" | "outline" | "destructive" | "success" | "info" | "warning"> = {
    pending: 'secondary',
    processing: 'default',
    completed: 'success',
    failed: 'destructive',
    cancelled: 'outline',
  }
  return variants[job.value?.status || ''] || 'secondary'
})

// =====================================================
// METHODS
// =====================================================

const fetchRelatedContractors = async () => {
  if (!job.value?.payload?.contractorIds) {
    relatedContractors.value = []
    return
  }
  
  const ids = Array.isArray(job.value.payload.contractorIds) 
    ? job.value.payload.contractorIds.join(',')
    : String(job.value.payload.contractorIds)
    
  if (!ids) return

  try {
    const response = await $fetch<{ success: boolean; data: any[] }>(`/api/contractors/by-ids?ids=${ids}`)
    relatedContractors.value = response.data
  } catch (error) {
    console.error('Failed to fetch related contractors', error)
  }
}

const fetchRelatedReviews = async () => {
  if (job.value?.jobType !== 'review_enrichment' || !job.value?.result?.results) return
  
  const results = job.value.result.results as any[]
  const contractorIds = results.map(r => r.contractorId).join(',')
  
  if (!contractorIds) return
  
  isFetchingReviews.value = true
  try {
    const response = await $fetch<{ success: boolean; data: any[]; total: number }>(`/api/reviews/by-contractors?contractorIds=${contractorIds}&limit=20`)
    relatedReviews.value = response.data
    totalReviews.value = response.total
  } catch (error) {
    console.error('Failed to fetch related reviews', error)
  } finally {
    isFetchingReviews.value = false
  }
}

const fetchChildJobs = async () => {
  if (!job.value || !['contractor_enrichment', 'review_enrichment'].includes(job.value.jobType)) {
    childJobs.value = []
    return
  }
  
  isFetchingChildJobs.value = true
  try {
    const response = await $fetch<{ success: boolean; data: typeof childJobs.value }>(`/api/jobs/${jobId.value}/children`)
    childJobs.value = response.data
  } catch (error) {
    console.error('Failed to fetch child jobs', error)
  } finally {
    isFetchingChildJobs.value = false
  }
}

// fetchJob and fetchLogs removed - handled by composable

const startSSE = () => {
  // SSE logic kept for fallback/reference but disabled in favor of composable
  if (!isActiveJob.value || eventSource.value) return

  eventSource.value = new EventSource(`/api/jobs/${jobId.value}/stream`)

  eventSource.value.addEventListener('progress', (e) => {
    const data = JSON.parse(e.data)
    if (job.value) {
      // Update status (pending -> processing transition)
      if (data.status) job.value.status = data.status
      // Update progress counts
      job.value.processedItems = data.processedItems
      job.value.failedItems = data.failedItems
      if (data.totalItems) job.value.totalItems = data.totalItems
    }
  })

  eventSource.value.addEventListener('complete', () => {
    closeSSE()
    // fetchJob() // Removed
    // fetchLogs() // Removed
  })

  eventSource.value.addEventListener('failed', () => {
    closeSSE()
    // fetchJob() // Removed
    // fetchLogs() // Removed
  })

  eventSource.value.addEventListener('cancelled', () => {
    closeSSE()
    // fetchJob() // Removed
  })

  eventSource.value.onerror = () => {
    closeSSE()
  }
}

const closeSSE = () => {
  if (eventSource.value) {
    eventSource.value.close()
    eventSource.value = null
  }
}

const handleCancel = async () => {
  try {
    await $fetch(`/api/jobs/${jobId.value}/cancel`, { method: 'POST' })
    // await fetchJob() // Removed - realtime should update
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to cancel job'
  }
}

const handleRetry = async () => {
  try {
    await $fetch(`/api/jobs/${jobId.value}/retry`, { method: 'POST' })
    // await fetchJob() // Removed - realtime should update
    // startSSE() // Removed
  } catch (error) {
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

const getLogLevelClass = (level: string) => {
  const classes: Record<string, string> = {
    error: 'text-destructive',
    warn: 'text-amber-600 dark:text-amber-400',
    info: 'text-muted-foreground',
    debug: 'text-muted-foreground/60',
  }
  return classes[level] || 'text-muted-foreground'
}

const getContractorStatus = (contractorId: string) => {
  if (!job.value?.result?.results) return null
  const results = job.value.result.results as any[]
  if (!Array.isArray(results)) return null
  return results.find(r => r.contractorId === contractorId)
}

const getStatusBadge = (status: string): { color: "default" | "secondary" | "outline" | "destructive" | "success" | "info" | "warning"; label: string } => {
  const map: Record<string, { color: "default" | "secondary" | "outline" | "destructive" | "success" | "info" | "warning"; label: string }> = {
    success: { color: 'default', label: 'Completed' },
    queued: { color: 'secondary', label: 'Pending' },
    skipped: { color: 'outline', label: 'Skipped' },
    failed: { color: 'destructive', label: 'Failed' },
  }
  return map[status] || { color: 'secondary', label: status }
}

const getChildJobStatusBadge = (status: string): { color: "default" | "secondary" | "outline" | "destructive" | "success" | "info" | "warning"; label: string } => {
  const map: Record<string, { color: "default" | "secondary" | "outline" | "destructive" | "success" | "info" | "warning"; label: string }> = {
    pending: { color: 'secondary', label: 'Pending' },
    processing: { color: 'default', label: 'Processing' },
    completed: { color: 'success', label: 'Completed' },
    failed: { color: 'destructive', label: 'Failed' },
    cancelled: { color: 'outline', label: 'Cancelled' },
  }
  return map[status] || { color: 'secondary', label: status }
}

// =====================================================
// LIFECYCLE
// =====================================================

onMounted(async () => {
  // isLoading.value = true // Managed by job watcher
  // await Promise.all([fetchJob(), fetchLogs()])
  // isLoading.value = false
  // startSSE()
})

onUnmounted(() => {
  closeSSE()
})

// Watch for job becoming active
watch(isActiveJob, (active) => {
  // if (active) startSSE()
  // else closeSSE()
})

// Watch for job data to fetch related items
watch(job, async (newJob) => {
  if (newJob) {
    isLoading.value = false
    await Promise.all([
      fetchRelatedContractors(),
      newJob.jobType === 'review_enrichment' ? fetchRelatedReviews() : Promise.resolve(),
      ['contractor_enrichment', 'review_enrichment'].includes(newJob.jobType) ? fetchChildJobs() : Promise.resolve()
    ])
  }
}, { immediate: true })

// Auto-scroll logs
watch(() => logs.value.length, () => {
  nextTick(() => {
    if (logsContainer.value) {
      const container = logsContainer.value
      const isScrolledToBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50 // tolerance
      
      // Only auto-scroll if user hasn't manually scrolled up, or if it's the first few logs
      if (isScrolledToBottom || logs.value.length <= 5) {
        container.scrollTop = container.scrollHeight
      }
    }
  })
})
</script>

<template>
  <div>
    <!-- Breadcrumb -->
    <div class="mb-6">
      <UiBreadcrumb>
        <UiBreadcrumbList>
          <UiBreadcrumbItem>
            <UiBreadcrumbLink as-child>
              <NuxtLink to="/admin/maintenance/jobs">Jobs</NuxtLink>
            </UiBreadcrumbLink>
          </UiBreadcrumbItem>
          <UiBreadcrumbSeparator />
          <UiBreadcrumbItem>
            <UiBreadcrumbPage>{{ job?.jobType ? formatJobType(job.jobType) : 'Loading...' }}</UiBreadcrumbPage>
          </UiBreadcrumbItem>
        </UiBreadcrumbList>
      </UiBreadcrumb>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <Icon name="heroicons:arrow-path" class="size-8 animate-spin text-muted-foreground" />
    </div>

    <!-- Error -->
    <UiAlert v-else-if="errorMessage" variant="destructive">
      <Icon name="heroicons:exclamation-triangle" class="size-4" />
      <UiAlertTitle>Error</UiAlertTitle>
      <UiAlertDescription>{{ errorMessage }}</UiAlertDescription>
    </UiAlert>

    <!-- Job Details -->
    <template v-else-if="job">
      <!-- Header -->
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">{{ formatJobType(job.jobType) }}</h1>
          <p class="mt-1 text-sm text-muted-foreground">Job ID: {{ job.id }}</p>
        </div>
        <div class="flex items-center gap-3">
          <!-- Realtime connection indicator -->
          <AdminRealtimeStatusIndicator :is-connected="isConnected" />
          <UiButton v-if="job.status === 'pending'" variant="outline" @click="handleCancel">
            <Icon name="heroicons:x-mark" class="mr-2 size-4" />
            Cancel
          </UiButton>
          <UiButton v-if="job.status === 'failed'" @click="handleRetry">
            <Icon name="heroicons:arrow-path" class="mr-2 size-4" />
            Retry
          </UiButton>
        </div>
      </div>

      <!-- Status Card -->
      <UiCard class="mb-6">
        <UiCardHeader>
          <UiCardTitle class="flex items-center gap-2">
            <UiBadge :variant="statusVariant">
              <Icon v-if="job.status === 'processing'" name="heroicons:arrow-path" class="mr-1 size-3 animate-spin" />
              {{ job.status }}
            </UiBadge>
            <span v-if="job.attempts > 1" class="text-sm text-muted-foreground">
              (Attempt {{ job.attempts }}/{{ job.maxAttempts }})
            </span>
          </UiCardTitle>
        </UiCardHeader>
        <UiCardContent>
          <!-- Progress Bar -->
          <div v-if="job.status === 'processing' && job.totalItems" class="mb-4">
            <div class="flex items-center justify-between text-sm text-muted-foreground mb-1">
              <span>Progress</span>
              <span>{{ job.processedItems }}/{{ job.totalItems }} ({{ progressPercent }}%)</span>
            </div>
            <UiProgress :model-value="progressPercent" class="h-2" />
            <p v-if="job.failedItems > 0" class="mt-1 text-sm text-destructive">
              {{ job.failedItems }} items failed
            </p>
          </div>

          <!-- Metadata -->
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p class="text-sm text-muted-foreground">Created</p>
              <p class="font-medium">{{ formatDate(job.createdAt) }}</p>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">Started</p>
              <p class="font-medium">{{ formatDate(job.startedAt) }}</p>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">Completed</p>
              <p class="font-medium">{{ formatDate(job.completedAt) }}</p>
            </div>
            <div v-if="job.status === 'completed' && job.result">
              <p class="text-sm text-muted-foreground">Result</p>
              <p class="font-medium text-green-600 dark:text-green-400">
                {{ job.result.processedContractors || 0 }} contractors, {{ job.result.totalImages || 0 }} images
              </p>
            </div>
          </div>

          <!-- Error Message -->
          <UiAlert v-if="job.lastError" variant="destructive" class="mt-4">
            <Icon name="heroicons:exclamation-triangle" class="size-4" />
            <UiAlertTitle>Last Error</UiAlertTitle>
            <UiAlertDescription>{{ job.lastError }}</UiAlertDescription>
          </UiAlert>
        </UiCardContent>
      </UiCard>

      <!-- Related Contractors -->
      <UiCard v-if="['contractor_enrichment', 'review_enrichment', 'image_enrichment'].includes(job.jobType)" class="mb-6">
        <UiCardHeader class="cursor-pointer hover:bg-muted/50 transition-colors" @click="isContractorsExpanded = !isContractorsExpanded">
          <div class="flex items-center justify-between">
            <UiCardTitle class="flex items-center gap-2">
              Related Contractors
              <UiBadge variant="secondary" class="ml-2">
                {{ job.jobType === 'image_enrichment' ? 'Batch' : relatedContractors.length }}
              </UiBadge>
            </UiCardTitle>
            <Icon 
              name="heroicons:chevron-down" 
              class="size-5 transition-transform duration-200"
              :class="{ 'rotate-180': isContractorsExpanded }"
            />
          </div>
        </UiCardHeader>
        
        <div v-if="isContractorsExpanded">
          <UiCardContent>
            <!-- Image Enrichment Special Case -->
            <div v-if="job.jobType === 'image_enrichment'" class="flex items-center gap-2 text-muted-foreground py-2">
              <Icon name="heroicons:photo" class="size-5" />
              <span>Batch processing (contractors selected dynamically)</span>
            </div>

            <!-- Contractor List -->
            <div v-else-if="relatedContractors.length > 0" class="space-y-2">
              <div v-for="contractor in relatedContractors" :key="contractor.id" class="flex items-center justify-between p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors">
                <div class="flex items-center gap-3">
                  <div class="font-medium">{{ contractor.company_name }}</div>
                  
                  <!-- Status Badge -->
                  <template v-if="getContractorStatus(contractor.id)">
                    <UiBadge :variant="getStatusBadge(getContractorStatus(contractor.id).status).color as any">
                      {{ getStatusBadge(getContractorStatus(contractor.id).status).label }}
                    </UiBadge>
                    <span v-if="getContractorStatus(contractor.id).message" class="text-xs text-muted-foreground">
                      {{ getContractorStatus(contractor.id).message }}
                    </span>
                  </template>
                </div>
                
                <UiButton variant="ghost" size="sm" as-child>
                  <NuxtLink :to="`/admin/contractors/${contractor.id}`">
                    View
                    <Icon name="heroicons:arrow-right" class="ml-2 size-3" />
                  </NuxtLink>
                </UiButton>
              </div>
            </div>

            <!-- Empty State -->
            <div v-else class="text-center py-4 text-muted-foreground">
              No contractors specified
            </div>
          </UiCardContent>
        </div>
      </UiCard>

      <!-- Child Jobs -->
      <UiCard v-if="['contractor_enrichment', 'review_enrichment'].includes(job.jobType)" class="mb-6">
        <UiCardHeader class="cursor-pointer hover:bg-muted/50 transition-colors" @click="isChildJobsExpanded = !isChildJobsExpanded">
          <div class="flex items-center justify-between">
            <UiCardTitle class="flex items-center gap-2">
              Child Jobs
              <UiBadge variant="secondary" class="ml-2">
                {{ childJobs.length }}
              </UiBadge>
            </UiCardTitle>
            <Icon 
              name="heroicons:chevron-down" 
              class="size-5 transition-transform duration-200"
              :class="{ 'rotate-180': isChildJobsExpanded }"
            />
          </div>
        </UiCardHeader>
        
        <div v-if="isChildJobsExpanded">
          <UiCardContent>
            <div v-if="isFetchingChildJobs" class="flex items-center justify-center py-4 text-muted-foreground">
              <Icon name="heroicons:arrow-path" class="mr-2 size-4 animate-spin" />
              Fetching child jobs...
            </div>

            <div v-else-if="childJobs.length > 0" class="space-y-2">
              <div v-for="childJob in childJobs" :key="childJob.id" class="flex items-center justify-between p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors">
                <div class="flex items-center gap-3">
                  <UiBadge variant="outline">
                    {{ formatJobType(childJob.job_type) }}
                  </UiBadge>
                  <UiBadge :variant="getChildJobStatusBadge(childJob.status).color as any">
                    <Icon v-if="childJob.status === 'processing'" name="heroicons:arrow-path" class="mr-1 size-3 animate-spin" />
                    {{ getChildJobStatusBadge(childJob.status).label }}
                  </UiBadge>
                  <span v-if="childJob.total_items" class="text-xs text-muted-foreground">
                    {{ childJob.processed_items }}/{{ childJob.total_items }} items
                  </span>
                </div>
                
                <UiButton variant="ghost" size="sm" as-child>
                  <NuxtLink :to="`/admin/maintenance/jobs/${childJob.id}`">
                    View
                    <Icon name="heroicons:arrow-right" class="ml-2 size-3" />
                  </NuxtLink>
                </UiButton>
              </div>
            </div>

            <div v-else class="text-center py-4 text-muted-foreground">
              No child jobs
            </div>
          </UiCardContent>
        </div>
      </UiCard>

      <!-- Related Images -->
      <UiCard v-if="job.jobType === 'image_enrichment'" class="mb-6">
        <UiCardHeader class="cursor-pointer hover:bg-muted/50 transition-colors" @click="isImagesExpanded = !isImagesExpanded">
          <div class="flex items-center justify-between">
            <UiCardTitle class="flex items-center gap-2">
              Image Processing
              <UiBadge v-if="(job.result as any)?.errors?.length" variant="destructive" class="ml-2">
                {{ (job.result as any).errors.length }} errors
              </UiBadge>
            </UiCardTitle>
            <Icon 
              name="heroicons:chevron-down" 
              class="size-5 transition-transform duration-200"
              :class="{ 'rotate-180': isImagesExpanded }"
            />
          </div>
        </UiCardHeader>
        
        <div v-if="isImagesExpanded">
          <UiCardContent>
            <!-- Processing State -->
            <div v-if="job.status === 'processing'" class="flex items-center justify-center py-4 text-muted-foreground">
              <Icon name="heroicons:arrow-path" class="mr-2 size-4 animate-spin" />
              Processing images...
            </div>
            
            <!-- Stats Grid -->
            <div v-else-if="job.result" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
              <div>
                <p class="text-sm text-muted-foreground">Total Images</p>
                <p class="text-2xl font-bold">{{ (job.result as any).totalImages || 0 }}</p>
              </div>
              <div>
                <p class="text-sm text-muted-foreground">Successful</p>
                <p class="text-2xl font-bold text-green-600 dark:text-green-400">{{ (job.result as any).successfulImages || 0 }}</p>
              </div>
              <div>
                <p class="text-sm text-muted-foreground">Failed</p>
                <p class="text-2xl font-bold text-red-600 dark:text-red-400">{{ (job.result as any).failedImages || 0 }}</p>
              </div>
              <div>
                <p class="text-sm text-muted-foreground">Contractors</p>
                <p class="text-2xl font-bold">{{ (job.result as any).processedContractors || 0 }}</p>
              </div>
            </div>
            
            <!-- Errors List -->
            <div v-if="(job.result as any)?.errors?.length > 0" class="mt-4">
              <h4 class="text-sm font-medium mb-2">Errors</h4>
              <div class="space-y-2">
                <div v-for="(error, idx) in (job.result as any).errors" :key="idx" class="p-2 rounded-md border bg-destructive/10 border-destructive/20">
                  <div class="font-medium text-sm">{{ error.companyName }}</div>
                  <div class="text-xs text-muted-foreground">{{ error.message }}</div>
                </div>
              </div>
            </div>
            
            <!-- Empty State -->
            <div v-else-if="!job.result && job.status !== 'processing'" class="text-center py-4 text-muted-foreground">
              No processing data yet
            </div>
          </UiCardContent>
        </div>
      </UiCard>

      <!-- Related Reviews -->
      <UiCard v-if="job.jobType === 'review_enrichment'" class="mb-6">
        <UiCardHeader class="cursor-pointer hover:bg-muted/50 transition-colors" @click="isReviewsExpanded = !isReviewsExpanded">
          <div class="flex items-center justify-between">
            <UiCardTitle class="flex items-center gap-2">
              Related Reviews
              <UiBadge variant="secondary" class="ml-2">
                {{ totalReviews }}
              </UiBadge>
            </UiCardTitle>
            <Icon 
              name="heroicons:chevron-down" 
              class="size-5 transition-transform duration-200"
              :class="{ 'rotate-180': isReviewsExpanded }"
            />
          </div>
          <p v-if="job.result" class="text-sm text-muted-foreground mt-1">
            {{ (job.result as any).totalReviewsFetched || 0 }} fetched, {{ (job.result as any).totalReviewsSaved || 0 }} saved
          </p>
        </UiCardHeader>
        
        <div v-if="isReviewsExpanded">
          <UiCardContent>
            <div v-if="isFetchingReviews" class="flex items-center justify-center py-4 text-muted-foreground">
              <Icon name="heroicons:arrow-path" class="mr-2 size-4 animate-spin" />
              Fetching reviews...
            </div>
            
            <div v-else-if="relatedReviews.length > 0" class="space-y-2">
              <div v-for="review in relatedReviews" :key="review.id" class="flex flex-col gap-1 p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors">
                <div class="flex items-center justify-between">
                  <div class="font-medium">{{ review.reviewer_name }}</div>
                  <div class="flex items-center text-amber-500">
                    <span class="font-bold mr-1">{{ review.stars }}</span>
                    <Icon name="heroicons:star" class="size-4 fill-current" />
                  </div>
                </div>
                <div class="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{{ contractorNames.get(review.contractor_id) || 'Unknown Contractor' }}</span>
                  <span>{{ formatDate(review.published_at) }}</span>
                </div>
              </div>
              
              <div v-if="totalReviews > relatedReviews.length" class="text-center pt-2 text-sm text-muted-foreground">
                + {{ totalReviews - relatedReviews.length }} more reviews
              </div>
            </div>
            
            <div v-else class="text-center py-4 text-muted-foreground">
              No reviews fetched yet
            </div>
          </UiCardContent>
        </div>
      </UiCard>

      <!-- System Logs -->
      <UiCard v-if="logs.length > 0">
        <UiCardHeader>
          <UiCardTitle>Activity Log</UiCardTitle>
          <p v-if="logs.length >= 50" class="text-sm text-muted-foreground">
            Showing last 50 logs
          </p>
        </UiCardHeader>
        <UiCardContent>
          <div ref="logsContainer" class="space-y-2 max-h-96 overflow-y-auto">
            <div v-for="log in logs" :key="log.id" class="flex gap-3 text-sm border-b pb-2 last:border-0">
              <span class="text-muted-foreground whitespace-nowrap">{{ formatDate(log.createdAt) }}</span>
              <span :class="getLogLevelClass(log.level)">{{ log.message }}</span>
            </div>
          </div>
        </UiCardContent>
      </UiCard>
    </template>
  </div>
</template>

