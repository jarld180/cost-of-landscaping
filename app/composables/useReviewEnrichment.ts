/**
 * Composable for review enrichment management
 *
 * Handles:
 * - Fetching contractors for review enrichment with filters
 * - Loading enrichment statistics
 * - Managing active job state and SSE connection
 * - Job creation for batch review enrichment
 */

import type { Database } from '~/types/supabase'
import type { ActiveJob } from '~/types/jobs'

type Contractor = Database['public']['Tables']['contractors']['Row'] & {
  city?: {
    id: string
    name: string
    slug: string
    state_code: string
  } | null
}

export type ReviewEnrichmentStatus = 'all' | 'not_enriched' | 'enriched' | 'failed' | 'no_reviews' | 'no_cid'

export interface ReviewEnrichmentFilters {
  enrichmentStatus?: ReviewEnrichmentStatus | null
  search?: string | null
  hasGoogleCid?: boolean | null
  page?: number
  limit?: number
}

export interface ReviewEnrichmentStats {
  total: number
  notEnriched: number
  enriched: number
  noReviews: number
  noCid: number
  failed: number
}

export function useReviewEnrichment() {
  // State
  const contractors = ref<Contractor[]>([])
  const pagination = ref({
    total: 0,
    page: 1,
    limit: 10,
    offset: 0,
    totalPages: 0,
  })
  const stats = ref<ReviewEnrichmentStats>({
    total: 0,
    notEnriched: 0,
    enriched: 0,
    noCid: 0,
    failed: 0,
  })
  const activeJob = ref<ActiveJob | null>(null)
  const pending = ref(false)
  const error = ref<Error | null>(null)
  const sseConnected = ref(false)
  const eventSource = ref<EventSource | null>(null)

  // Computed
  const hasActiveJob = computed(() => {
    return activeJob.value && ['pending', 'processing'].includes(activeJob.value.status)
  })

  // Fetch contractors with filters
  async function fetchContractors(filters: ReviewEnrichmentFilters = {}) {
    try {
      pending.value = true
      error.value = null

      const query: Record<string, unknown> = {}

      // Filter by enrichment status
      if (filters.enrichmentStatus && filters.enrichmentStatus !== 'all') {
        switch (filters.enrichmentStatus) {
          case 'not_enriched':
            // Has Google CID, has reviews (review_count > 0), but no enrichment done yet
            query.hasGoogleCid = true
            query.hasReviews = true
            query.reviewEnrichmentStatus = 'not_started'
            break
          case 'enriched':
            query.reviewEnrichmentStatus = 'success'
            break
          case 'no_reviews':
            // Has Google CID but no reviews on Google (review_count = 0)
            query.hasGoogleCid = true
            query.hasReviews = false
            break
          case 'no_cid':
            query.hasGoogleCid = false
            break
          case 'failed':
            query.reviewEnrichmentStatus = 'failed'
            break
        }
      }

      if (filters.search) {
        query.search = filters.search
      }

      if (filters.hasGoogleCid !== undefined && filters.hasGoogleCid !== null) {
        query.hasGoogleCid = filters.hasGoogleCid
      }

      const page = filters.page || 1
      const limit = filters.limit || 10
      query.limit = limit
      query.offset = (page - 1) * limit

      const response = await $fetch<{
        success: boolean
        data: Contractor[]
        pagination: typeof pagination.value
      }>('/api/contractors', { query })

      if (response.success) {
        contractors.value = response.data
        pagination.value = response.pagination
      }
    } catch (err) {
      error.value = err as Error
      console.error('Error fetching contractors for review enrichment:', err)
    } finally {
      pending.value = false
    }
  }

  // Fetch enrichment stats
  async function fetchStats() {
    try {
      const response = await $fetch<{
        success: boolean
        stats: ReviewEnrichmentStats
      }>('/api/contractors/review-enrichment-stats')

      if (response.success) {
        stats.value = response.stats
      }
    } catch {
      // Stats are informational, don't throw
    }
  }

  // Fetch active job
  async function fetchActiveJob() {
    try {
      const response = await $fetch<{
        success: boolean
        data: ActiveJob[]
      }>('/api/jobs', {
        query: { jobType: 'review_enrichment', limit: 1 },
      })

      const active = response.data.find(j => ['pending', 'processing'].includes(j.status))
      activeJob.value = active || null
    } catch {
      // Silently fail
    }
  }

  async function queueEnrichmentJobs(
    contractorIds: string[],
    options: { maxDepth?: number; continuous?: boolean } = {}
  ): Promise<{ jobIds: string[] }> {
    const response = await $fetch<{ success: boolean; data: { id: string } }>('/api/jobs', {
      method: 'POST',
      body: {
        jobType: 'review_enrichment',
        payload: {
          contractorIds,
          maxDepth: options.maxDepth || 50,
          continuous: options.continuous || false,
        },
      },
    })

    await fetchActiveJob()

    return { jobIds: response.success && response.data?.id ? [response.data.id] : [] }
  }

  return {
    // State
    contractors,
    pagination,
    stats,
    activeJob,
    pending,
    error,
    sseConnected,
    eventSource,

    // Computed
    hasActiveJob,

    // Methods
    fetchContractors,
    fetchStats,
    fetchActiveJob,
    queueEnrichmentJobs,
  }
}
