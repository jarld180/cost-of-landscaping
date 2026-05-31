/**
 * Review Schemas
 *
 * Zod validation schemas for Google reviews from Apify JSON import.
 * Handles transformation from Apify format to database format.
 */

import { z } from 'zod'
import type { Database } from '../../app/types/supabase'

// =====================================================
// DATABASE TYPES
// =====================================================

export type Review = Database['public']['Tables']['reviews']['Row']
export type ReviewInsert = Database['public']['Tables']['reviews']['Insert']
export type ReviewUpdate = Database['public']['Tables']['reviews']['Update']

// =====================================================
// APIFY REVIEW SCHEMA
// =====================================================

/**
 * Schema for a single review from Apify Google Maps Scraper
 * Based on actual Apify output format
 */
export const apifyReviewSchema = z.object({
  // Required fields
  reviewId: z.string().min(1, 'reviewId is required'),
  name: z.string().min(1, 'reviewer name is required'),
  stars: z.number().int().min(1).max(5),

  // Google identifiers
  reviewUrl: z.string().optional().nullable(),
  reviewerId: z.string().optional().nullable(),
  reviewerUrl: z.string().optional().nullable(),

  // Reviewer info
  reviewerPhotoUrl: z.string().optional().nullable(),
  reviewerNumberOfReviews: z.number().int().optional().default(0),
  isLocalGuide: z.boolean().optional().default(false),

  // Review content
  text: z.string().optional().nullable(),
  textTranslated: z.string().optional().nullable(),
  likesCount: z.number().int().optional().default(0),

  // Timestamps
  publishedAtDate: z.string().optional().nullable(),
  publishAt: z.string().optional().nullable(),

  // Metadata
  reviewOrigin: z.string().optional().default('Google'),
  originalLanguage: z.string().optional().nullable(),

  // Owner response
  responseFromOwnerText: z.string().optional().nullable(),
  responseFromOwnerDate: z.string().optional().nullable(),

  // Rich context (JSONB)
  reviewImageUrls: z.array(z.string()).optional().default([]),
  reviewContext: z.record(z.string(), z.string()).optional().default({}),
  reviewDetailedRating: z.record(z.string(), z.unknown()).optional().default({}),

  // Fields we ignore but may be present
  rating: z.unknown().optional(),
  visitedIn: z.unknown().optional(),
  translatedLanguage: z.unknown().optional(),
})

export type ApifyReview = z.infer<typeof apifyReviewSchema>

// =====================================================
// TRANSFORMATION HELPERS
// =====================================================

/**
 * Parse ISO date string to Date object, returns null if invalid
 */
function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null
  const date = new Date(dateStr)
  return isNaN(date.getTime()) ? null : date
}

/**
 * Transform Apify review format to database insert format
 */
export function transformApifyReview(
  review: ApifyReview,
  contractorId: string
): ReviewInsert {
  return {
    contractor_id: contractorId,

    // Google identifiers
    google_review_id: review.reviewId,
    review_url: review.reviewUrl ?? null,

    // Reviewer info
    reviewer_id: review.reviewerId ?? null,
    reviewer_url: review.reviewerUrl ?? null,
    reviewer_name: review.name,
    reviewer_photo_url: review.reviewerPhotoUrl ?? null,
    reviewer_review_count: review.reviewerNumberOfReviews ?? 0,
    is_local_guide: review.isLocalGuide ?? false,

    // Review content
    review_text: review.text ?? null,
    review_text_translated: review.textTranslated ?? null,
    stars: review.stars,
    likes_count: review.likesCount ?? 0,

    // Timestamps
    published_at: parseDate(review.publishedAtDate)?.toISOString() ?? null,
    published_at_relative: review.publishAt ?? null,

    // Metadata
    review_origin: review.reviewOrigin ?? 'Google',
    original_language: review.originalLanguage ?? null,

    // Owner response
    owner_response_text: review.responseFromOwnerText ?? null,
    owner_response_date: parseDate(review.responseFromOwnerDate)?.toISOString() ?? null,

    // Rich context (JSONB)
    review_image_urls: review.reviewImageUrls ?? [],
    review_context: review.reviewContext ?? {},
    detailed_rating: review.reviewDetailedRating ?? {},
  }
}

