/**
 * DataForSEO Schemas
 *
 * TypeScript types for DataForSEO Business Data API - Google Reviews.
 * Based on: https://docs.dataforseo.com/v3/business_data/google/reviews/
 */

import { z } from 'zod'

// =====================================================
// API CONFIGURATION
// =====================================================

export const DATAFORSEO_BASE_URL = 'https://api.dataforseo.com'
export const DATAFORSEO_REVIEWS_ENDPOINT = '/v3/business_data/google/reviews'

/** Max tasks per single API request */
export const DATAFORSEO_MAX_TASKS_PER_REQUEST = 100

/** Polling configuration */
export const DATAFORSEO_POLL_INTERVAL_MS = 3000
export const DATAFORSEO_MAX_POLL_ATTEMPTS = 30

// =====================================================
// TASK POST REQUEST
// =====================================================

/**
 * Single review task for submission to DataForSEO
 */
export interface DataForSeoReviewTask {
  /** Google CID (Customer ID) - unique identifier for the business */
  cid: string
  /** Language for results */
  language_name: 'English'
  /** Coordinates in format "lat,lng,radius" where radius is in meters */
  location_coordinate: string
  /** Number of reviews to fetch (max reviews per business) */
  depth: number
  /** Optional tag for tracking */
  tag?: string
}

/**
 * Request body for task_post endpoint
 */
export interface DataForSeoTaskPostRequest {
  tasks: DataForSeoReviewTask[]
}

// =====================================================
// TASK POST RESPONSE
// =====================================================

/**
 * Individual task result from task_post
 */
export interface DataForSeoTaskPostItem {
  id: string
  status_code: number
  status_message: string
  time: string
  cost: number
  result_count: number
  path: string[]
  data: {
    api: string
    function: string
    cid: number | string
    language_name: string
    location_coordinate: string
    depth: number
    tag?: string
  }
  result: null
}

/**
 * Full response from task_post endpoint
 */
export interface DataForSeoTaskPostResponse {
  version: string
  status_code: number
  status_message: string
  time: string
  cost: number
  tasks_count: number
  tasks_error: number
  tasks: DataForSeoTaskPostItem[]
}

// =====================================================
// TASKS READY RESPONSE
// =====================================================

/**
 * Ready task item from tasks_ready endpoint
 */
export interface DataForSeoTaskReadyItem {
  id: string
  se: string
  date_posted: string
  tag?: string
  endpoint: string
}

/**
 * Full response from tasks_ready endpoint
 */
export interface DataForSeoTasksReadyResponse {
  version: string
  status_code: number
  status_message: string
  time: string
  cost: number
  tasks_count: number
  tasks_error: number
  tasks: Array<{
    id: string
    status_code: number
    status_message: string
    time: string
    cost: number
    result_count: number
    path: string[]
    data: null
    result: DataForSeoTaskReadyItem[] | null
  }>
}

// =====================================================
// TASK GET RESPONSE (Review Results)
// =====================================================

/**
 * Individual review from DataForSEO
 */
export interface DataForSeoReview {
  type: 'google_review'
  review_id: string
  review_text: string | null
  original_review_text: string | null
  rating: {
    rating_type: string
    value: number
    votes_count: number | null
    rating_max: number
  }
  timestamp: string
  review_url: string
  profile_name: string
  profile_url: string
  profile_image_url: string
  reviews_count: number
  local_guide: boolean
  owner_answer: string | null
  owner_timestamp: string | null
  owner_time_ago: string | null
  images: Array<{ image_url: string }> | null
  original_language: string | null
}

/**
 * Review result data structure
 */
export interface DataForSeoReviewResultData {
  cid: string
  keyword: string | null
  se_domain: string
  location_code: number
  language_code: string
  check_url: string
  datetime: string
  title: string
  rating: {
    rating_type: string
    value: number
    votes_count: number
    rating_max: number
  }
  reviews_count: number
  items_count: number
  items: DataForSeoReview[] | null
}

/**
 * Full response from task_get endpoint
 */
export interface DataForSeoTaskGetResponse {
  version: string
  status_code: number
  status_message: string
  time: string
  cost: number
  tasks_count: number
  tasks_error: number
  tasks: Array<{
    id: string
    status_code: number
    status_message: string
    time: string
    cost: number
    result_count: number
    path: string[]
    data: {
      api: string
      function: string
      cid: number | string
      language_name: string
      location_coordinate: string
      depth: number
      tag?: string
    }
    result: DataForSeoReviewResultData[] | null
  }>
}

// =====================================================
// INTERNAL TYPES
// =====================================================

/**
 * Mapping of task ID to contractor info for result matching
 */
export interface TaskContractorMapping {
  taskId: string
  contractorId: string
  googleCid: string
  companyName: string
}

/**
 * Result of polling operation
 */
export interface PollResult {
  readyTaskIds: string[]
  pendingTaskIds: string[]
  timedOut: boolean
  pollAttempts: number
}

/**
 * Transformed review ready for database insert
 */
export interface TransformedReview {
  contractor_id: string
  google_review_id: string
  review_url: string | null
  reviewer_id: string | null
  reviewer_url: string | null
  reviewer_name: string
  reviewer_photo_url: string | null
  reviewer_review_count: number
  is_local_guide: boolean
  review_text: string | null
  review_text_translated: string | null
  stars: number
  likes_count: number
  published_at: string | null
  published_at_relative: string | null
  review_origin: string
  original_language: string | null
  owner_response_text: string | null
  owner_response_date: string | null
  review_image_urls: string[]
  review_context: Record<string, unknown>
  detailed_rating: Record<string, unknown>
}

// =====================================================
// ERROR TYPES
// =====================================================

/**
 * DataForSEO API error codes
 */
export const DATAFORSEO_STATUS_CODES = {
  SUCCESS: 20000,
  TASK_CREATED: 20100,
  UNAUTHORIZED: 40101,
  FORBIDDEN: 40301,
  NOT_FOUND: 40401,
  RATE_LIMITED: 42900,
  INTERNAL_ERROR: 50000,
} as const

/**
 * Custom error class for DataForSEO API errors
 */
export class DataForSeoError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public isRetryable: boolean = false
  ) {
    super(message)
    this.name = 'DataForSeoError'
  }
}

/**
 * Error for authentication failures
 */
export class DataForSeoAuthError extends DataForSeoError {
  constructor(message: string = 'DataForSEO authentication failed') {
    super(message, 401, false)
    this.name = 'DataForSeoAuthError'
  }
}

/**
 * Error for rate limiting
 */
export class DataForSeoRateLimitError extends DataForSeoError {
  constructor(message: string = 'DataForSEO rate limit exceeded') {
    super(message, 429, true)
    this.name = 'DataForSeoRateLimitError'
  }
}

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

/**
 * Validate review task input
 */
export const reviewTaskSchema = z.object({
  cid: z.string().min(1),
  language_name: z.literal('English'),
  location_coordinate: z.string().regex(/^-?\d+\.?\d*,-?\d+\.?\d*,\d+$/),
  depth: z.number().int().min(1).max(1500),
  tag: z.string().optional(),
})

/**
 * Transform DataForSEO review to database format
 */
export function transformDataForSeoReview(
  review: DataForSeoReview,
  contractorId: string
): TransformedReview {
  return {
    contractor_id: contractorId,
    google_review_id: review.review_id,
    review_url: review.review_url || null,
    reviewer_id: null, // DataForSEO doesn't provide this
    reviewer_url: review.profile_url || null,
    reviewer_name: review.profile_name,
    reviewer_photo_url: review.profile_image_url || null,
    reviewer_review_count: review.reviews_count || 0,
    is_local_guide: review.local_guide || false,
    review_text: review.review_text || null,
    review_text_translated: review.original_review_text !== review.review_text
      ? review.original_review_text
      : null,
    stars: review.rating?.value || 0,
    likes_count: review.rating?.votes_count || 0,
    published_at: review.timestamp || null,
    published_at_relative: null, // DataForSEO uses timestamp
    review_origin: 'Google',
    original_language: review.original_language || null,
    owner_response_text: review.owner_answer || null,
    owner_response_date: review.owner_timestamp || null,
    review_image_urls: review.images?.map(img => img.image_url) || [],
    review_context: {},
    detailed_rating: review.rating ? { ...review.rating } : {},
  }
}

