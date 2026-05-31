/**
 * Job Schemas
 *
 * Zod validation schemas for background job queue.
 * Defines job types, payloads, and API request/response types.
 */

import { z } from 'zod'
import type { Database } from '../../app/types/supabase'

// =====================================================
// DATABASE TYPES
// =====================================================

export type BackgroundJobRow = Database['public']['Tables']['background_jobs']['Row']
export type BackgroundJobInsert = Database['public']['Tables']['background_jobs']['Insert']
export type BackgroundJobUpdate = Database['public']['Tables']['background_jobs']['Update']

export type SystemLogRow = Database['public']['Tables']['system_logs']['Row']
export type SystemLogInsert = Database['public']['Tables']['system_logs']['Insert']

// =====================================================
// JOB STATUS & TYPES
// =====================================================

export const JOB_STATUSES = ['pending', 'processing', 'completed', 'failed', 'cancelled'] as const
export type JobStatus = typeof JOB_STATUSES[number]

export const JOB_TYPES = ['image_enrichment', 'contractor_enrichment', 'review_enrichment', 'reviewer_image_retry', 'stealthy_crawl'] as const
export type JobType = typeof JOB_TYPES[number]

// =====================================================
// JOB PAYLOADS (per job type)
// =====================================================

/**
 * Image Enrichment Job Payload
 */
export const imageEnrichmentPayloadSchema = z.object({
  batchSize: z.number().int().min(1).max(100).default(10),
  continuous: z.boolean().default(false), // Auto-queue next batch on completion
  // Future: could add filters like cityId, contractorIds, etc.
})

export type ImageEnrichmentPayload = z.infer<typeof imageEnrichmentPayloadSchema>

/**
 * Contractor Enrichment Job Payload
 */
export const contractorEnrichmentPayloadSchema = z.object({
  contractorIds: z.array(z.string().uuid()).min(1).max(10),
  // Future: could add filters, retry options, etc.
})

export type ContractorEnrichmentPayload = z.infer<typeof contractorEnrichmentPayloadSchema>

/**
 * Review Enrichment Job Payload
 * Fetches Google reviews via DataForSEO API
 */
export const reviewEnrichmentPayloadSchema = z.object({
  contractorIds: z.array(z.string().uuid()).min(1).max(10),
  maxDepth: z.number().int().min(1).max(1500).default(50), // Max reviews per contractor
  continuous: z.boolean().default(false), // Auto-queue next batch on completion
})

export type ReviewEnrichmentPayload = z.infer<typeof reviewEnrichmentPayloadSchema>

/**
 * Reviewer Image Retry Job Payload
 * Retries downloading reviewer profile images after rate limit cooldown
 */
export const reviewerImageRetryPayloadSchema = z.object({
  contractorId: z.string().uuid(),
  images: z.array(z.object({
    reviewId: z.string().uuid(),
    originalUrl: z.string().url(),
  })).min(1).max(500),
  attemptNumber: z.number().int().min(1).max(5).default(1), // For escalating cooldown
})

export type ReviewerImageRetryPayload = z.infer<typeof reviewerImageRetryPayloadSchema>

/**
 * Service Type Keyword for crawler-side detection
 */
export const serviceTypeKeywordSchema = z.object({
  slug: z.string(),
  keywords: z.array(z.string()),
})

export type ServiceTypeKeyword = z.infer<typeof serviceTypeKeywordSchema>

/**
 * Stealthy Crawl Job Payload
 * Created by ContractorEnrichmentService, processed by Python worker
 */
export const stealthyCrawlPayloadSchema = z.object({
  contractorId: z.string().uuid(),
  websiteUrl: z.string().url(),
  usingSiblingWebsite: z.boolean().optional(), // For provenance tracking
  serviceTypeKeywords: z.array(serviceTypeKeywordSchema).optional(), // For crawler-side service detection
})

export type StealthyCrawlPayload = z.infer<typeof stealthyCrawlPayloadSchema>

/**
 * Union of all job payloads
 */
export type JobPayload = ImageEnrichmentPayload | ContractorEnrichmentPayload | ReviewEnrichmentPayload | ReviewerImageRetryPayload | StealthyCrawlPayload

// =====================================================
// JOB RESULT TYPES (per job type)
// =====================================================

export interface ImageEnrichmentResult {
  processedContractors: number
  totalImages: number
  successfulImages: number
  failedImages: number
  contractorsRemaining: number
  errors: Array<{
    contractorId: string
    companyName: string
    message: string
  }>
  /** Flag indicating if continuous mode should queue next batch */
  shouldContinue?: boolean
}

export type EnrichmentStatus =
  | 'success'   // AI extraction completed (via stealthy_crawl processor)
  | 'queued'    // stealthy_crawl job created, awaiting crawl
  | 'skipped'   // No website found (no sibling either)
  | 'failed'    // Job creation failed (not crawl failure)

export interface ContractorEnrichmentResult {
  processed: number
  successful: number   // 'queued' + 'skipped' count (jobs created or no-op)
  skipped: number      // No website
  failed: number       // Job creation failed
  queued: number       // Jobs created, pending crawl
  totalTokens: number
  results: Array<{
    contractorId: string
    companyName: string
    status: EnrichmentStatus
    message: string
    serviceTypesAssigned?: number
  }>
}

export interface ReviewEnrichmentResult {
  processed: number
  successful: number
  skipped: number
  failed: number
  totalReviewsFetched: number
  totalReviewsSaved: number
  apiCost: number
  results: Array<{
    contractorId: string
    companyName: string
    status: 'success' | 'skipped' | 'failed'
    reason?: string
    reviewsFetched: number
    reviewsSaved: number
  }>
  /** Flag indicating if continuous mode should queue next batch */
  shouldContinue?: boolean
}

export interface ReviewerImageRetryResult {
  contractorId: string
  totalImages: number
  downloaded: number
  failed: number
  /** If rate limited again, images that need retry */
  remainingImages?: Array<{
    reviewId: string
    originalUrl: string
  }>
  /** Flag indicating if another retry job was queued */
  requeuedForRetry?: boolean
}

export interface DetectedServiceType {
  slug: string
  confidence: number
  matchedKeywords: string[]
  sourceUrls: string[]
}

export interface CollectedImage {
  url: string
  alt: string
  sourceUrl: string  // Page where the image was first found
}

export interface StealthyCrawlResult {
  crawlResult: {
    url: string
    success: boolean
    content: string
    pagesCrawled: number
    error?: string
    blockedByBotProtection?: boolean
    extractedContacts?: {
      emails: string[]
      phones: string[]
      socialLinks: Record<string, string>
    }
    detectedServiceTypes?: DetectedServiceType[]
    collectedImages?: CollectedImage[]
  }
  _processed?: boolean
  _error?: string
}

export type JobResult = ImageEnrichmentResult | ContractorEnrichmentResult | ReviewEnrichmentResult | ReviewerImageRetryResult | StealthyCrawlResult

// =====================================================
// API REQUEST SCHEMAS
// =====================================================

/**
 * Create job request
 */
export const createJobSchema = z.object({
  jobType: z.enum(JOB_TYPES),
  payload: z.record(z.string(), z.any()).optional().default({}),
})

export type CreateJobInput = z.infer<typeof createJobSchema>

/**
 * List jobs query params
 */
export const listJobsQuerySchema = z.object({
  status: z.enum(JOB_STATUSES).optional(),
  jobType: z.enum(JOB_TYPES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

export type ListJobsQuery = z.infer<typeof listJobsQuerySchema>

/**
 * Execute job (internal, called by pg_cron)
 */
export const executeJobHeaderSchema = z.object({
  'x-job-runner-secret': z.string().min(1),
})

// =====================================================
// API RESPONSE TYPES
// =====================================================

export interface JobResponse {
  id: string
  jobType: JobType
  status: JobStatus
  attempts: number
  maxAttempts: number
  totalItems: number | null
  processedItems: number
  failedItems: number
  payload: JobPayload
  result: JobResult | null
  lastError: string | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  createdBy: string | null
}

export interface CreateJobResponse {
  success: boolean
  job: JobResponse
}

export interface ListJobsResponse {
  success: boolean
  jobs: JobResponse[]
  total: number
}

export interface JobProgressResponse {
  success: boolean
  job: {
    id: string
    status: JobStatus
    totalItems: number | null
    processedItems: number
    failedItems: number
    percentComplete: number
  }
}

// =====================================================
// CONSTANTS
// =====================================================

/** Retry delays in minutes: 1 min, 5 min, 15 min */
export const RETRY_DELAYS_MINUTES = [1, 5, 15]

/** Maximum job execution time before considered stuck */
export const JOB_TIMEOUT_MINUTES = 30

/** Default batch size for image enrichment */
export const DEFAULT_IMAGE_BATCH_SIZE = 500

/** Default batch size for contractor enrichment (max contractors per job) */
// TODO: Consider splitting large batches into multiple jobs in the UI instead of one massive job
export const DEFAULT_CONTRACTOR_BATCH_SIZE = 500

/** Default batch size for review enrichment (max contractors per job) */
export const DEFAULT_REVIEW_BATCH_SIZE = 500

/** Default max reviews to fetch per contractor */
export const DEFAULT_REVIEW_MAX_DEPTH = 50

/** Maximum reviews per contractor (cost control) */
export const MAX_REVIEW_DEPTH = 1500

/** Re-enrichment cooldown in days */
export const REVIEW_ENRICHMENT_COOLDOWN_DAYS = 30

/** Delay between reviewer image downloads (ms) */
export const REVIEWER_IMAGE_DOWNLOAD_DELAY_MS = 300

/** Timeout for each reviewer image download (ms) */
export const REVIEWER_IMAGE_DOWNLOAD_TIMEOUT_MS = 5000

/** Reviewer image retry cooldown delays in minutes: 15m, 30m, 1h, 2h */
export const REVIEWER_IMAGE_RETRY_DELAYS_MINUTES = [15, 30, 60, 120]

/** Maximum retry attempts for reviewer images before abandoning */
export const REVIEWER_IMAGE_MAX_RETRIES = 4
