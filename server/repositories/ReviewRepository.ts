/**
 * Review Repository
 *
 * Data access layer for reviews table.
 * Handles bulk upsert operations for importing Google reviews from:
 * - Apify JSON exports
 * - DataForSEO API enrichment
 */

import { consola } from 'consola'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../app/types/supabase'
import type { ApifyReview, Review, ReviewInsert } from '../schemas/review.schemas'
import { transformApifyReview } from '../schemas/review.schemas'
import type { TransformedReview } from '../schemas/dataforseo.schemas'

export class ReviewRepository {
  private client: SupabaseClient<Database>

  constructor(client: SupabaseClient<Database>) {
    this.client = client
  }

  /**
   * Bulk upsert reviews for a contractor
   * Uses ON CONFLICT DO NOTHING to skip existing reviews
   * Returns count of newly inserted reviews
   */
  async bulkUpsert(contractorId: string, reviews: ApifyReview[]): Promise<number> {
    if (!reviews.length) return 0

    // Transform Apify reviews to database format
    const reviewInserts: ReviewInsert[] = reviews.map((review) =>
      transformApifyReview(review, contractorId)
    )

    // Get existing review IDs to calculate new inserts
    const existingIds = await this.getExistingReviewIds(contractorId)
    const newReviews = reviewInserts.filter(
      (r) => !existingIds.has(r.google_review_id)
    )

    if (!newReviews.length) {
      consola.debug(`[ReviewRepository] No new reviews for contractor ${contractorId}`)
      return 0
    }

    // Insert new reviews (skip conflicts)
    const { data, error } = await this.client
      .from('reviews')
      .insert(newReviews)
      .select('id')

    if (error) {
      // Handle unique constraint violations gracefully
      if (error.code === '23505') {
        consola.debug(`[ReviewRepository] Some reviews already exist, skipping duplicates`)
        return 0
      }
      consola.error(`[ReviewRepository] Error inserting reviews:`, error)
      throw error
    }

    const insertedCount = data?.length ?? 0
    consola.debug(
      `[ReviewRepository] Inserted ${insertedCount} reviews for contractor ${contractorId}`
    )

    return insertedCount
  }

  /**
   * Get set of existing Google review IDs for a contractor
   */
  private async getExistingReviewIds(contractorId: string): Promise<Set<string>> {
    const { data, error } = await this.client
      .from('reviews')
      .select('google_review_id')
      .eq('contractor_id', contractorId)

    if (error) {
      consola.error(`[ReviewRepository] Error fetching existing reviews:`, error)
      return new Set()
    }

    return new Set(data?.map((r) => r.google_review_id) ?? [])
  }

  /**
   * Find all reviews for a contractor
   */
  async findByContractorId(
    contractorId: string,
    options?: { limit?: number; offset?: number; orderBy?: 'published_at' | 'stars' }
  ): Promise<Review[]> {
    let query = this.client
      .from('reviews')
      .select('*')
      .eq('contractor_id', contractorId)

    // Default ordering: newest first
    const orderBy = options?.orderBy ?? 'published_at'
    query = query.order(orderBy, { ascending: false, nullsFirst: false })

    if (options?.limit) query = query.limit(options.limit)
    if (options?.offset) query = query.range(options.offset, options.offset + (options.limit ?? 10) - 1)

    const { data, error } = await query

    if (error) {
      consola.error(`[ReviewRepository] Error fetching reviews:`, error)
      throw error
    }

    return data ?? []
  }

  /**
   * Count reviews for a contractor
   */
  async countByContractorId(contractorId: string): Promise<number> {
    const { count, error } = await this.client
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('contractor_id', contractorId)

    if (error) {
      consola.error(`[ReviewRepository] Error counting reviews:`, error)
      throw error
    }

    return count ?? 0
  }

  /**
   * Find a single review by ID
   */
  async findById(id: string): Promise<Review | null> {
    const { data, error } = await this.client
      .from('reviews')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      consola.error(`[ReviewRepository] Error fetching review:`, error)
      throw error
    }

    return data
  }

  // =====================================================
  // DATAFORSEO ENRICHMENT METHODS
  // =====================================================

  /**
   * Bulk upsert reviews from DataForSEO API
   * Uses ON CONFLICT DO UPDATE to refresh existing reviews with new data
   * Returns count of upserted reviews
   */
  async upsertManyFromDataForSeo(reviews: TransformedReview[]): Promise<number> {
    if (!reviews.length) return 0

    // Validate all reviews have required fields
    const validReviews = reviews.filter((r) => {
      if (!r.google_review_id || !r.reviewer_name || !r.stars) {
        consola.warn(`[ReviewRepository] Skipping invalid review: missing required fields`)
        return false
      }
      if (r.stars < 1 || r.stars > 5) {
        consola.warn(`[ReviewRepository] Skipping review with invalid stars: ${r.stars}`)
        return false
      }
      return true
    })

    if (!validReviews.length) {
      consola.debug(`[ReviewRepository] No valid reviews to upsert`)
      return 0
    }

    // Use upsert with ON CONFLICT DO UPDATE
    const { data, error } = await this.client
      .from('reviews')
      .upsert(validReviews as ReviewInsert[], {
        onConflict: 'contractor_id,google_review_id',
        ignoreDuplicates: false, // Update existing
      })
      .select('id')

    if (error) {
      consola.error(`[ReviewRepository] Error upserting DataForSEO reviews:`, error)
      throw error
    }

    const upsertedCount = data?.length ?? 0
    consola.debug(`[ReviewRepository] Upserted ${upsertedCount} reviews from DataForSEO`)

    return upsertedCount
  }

  /**
   * Get the last SUCCESSFUL review enrichment date for a contractor
   * Used to enforce the 30-day cooldown period
   * Only returns a date if status is 'completed' - pending/failed attempts don't count
   */
  async getLastSuccessfulEnrichmentDate(contractorId: string): Promise<Date | null> {
    // Check contractor metadata for enrichment timestamp
    const { data, error } = await this.client
      .from('contractors')
      .select('metadata')
      .eq('id', contractorId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Contractor not found
      consola.error(`[ReviewRepository] Error fetching contractor metadata:`, error)
      throw error
    }

    const metadata = data?.metadata as Record<string, unknown> | null
    const reviewsEnrichment = metadata?.reviews_enrichment as Record<string, unknown> | undefined

    // Only apply cooldown if enrichment was successful (completed)
    // Pending or failed attempts should NOT block re-enrichment
    if (!reviewsEnrichment?.last_attempt_at || reviewsEnrichment?.status !== 'completed') {
      return null
    }

    const lastAttempt = new Date(reviewsEnrichment.last_attempt_at as string)
    return isNaN(lastAttempt.getTime()) ? null : lastAttempt
  }

  /**
   * Check if a contractor is eligible for review enrichment
   * Returns false only if SUCCESSFULLY enriched within the cooldown period
   * Pending/failed attempts do not block re-enrichment
   */
  async isEligibleForEnrichment(contractorId: string, cooldownDays: number): Promise<boolean> {
    const lastEnrichment = await this.getLastSuccessfulEnrichmentDate(contractorId)

    if (!lastEnrichment) {
      return true // Never successfully enriched
    }

    const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000
    const now = new Date()
    const timeSinceEnrichment = now.getTime() - lastEnrichment.getTime()

    return timeSinceEnrichment >= cooldownMs
  }

  /**
   * Update contractor metadata with review enrichment status
   */
  async updateEnrichmentStatus(
    contractorId: string,
    status: 'pending' | 'success' | 'failed' | 'not_applicable',
    reviewsFetched?: number,
    errorMessage?: string
  ): Promise<void> {
    // Get current metadata
    const { data, error: fetchError } = await this.client
      .from('contractors')
      .select('metadata')
      .eq('id', contractorId)
      .single()

    if (fetchError) {
      consola.error(`[ReviewRepository] Error fetching contractor for status update:`, fetchError)
      throw fetchError
    }

    const existingMetadata = (data?.metadata || {}) as Record<string, unknown>

    // Build enrichment status object
    const reviewsEnrichment: Record<string, unknown> = {
      status,
      last_attempt_at: new Date().toISOString(),
    }

    if (reviewsFetched !== undefined) {
      reviewsEnrichment.reviews_fetched = reviewsFetched
    }

    if (errorMessage) {
      reviewsEnrichment.error_message = errorMessage
    }

    // Update metadata
    const updatedMetadata = {
      ...existingMetadata,
      reviews_enrichment: reviewsEnrichment,
    }

    const { error: updateError } = await this.client
      .from('contractors')
      .update({
        metadata: updatedMetadata as unknown as Database['public']['Tables']['contractors']['Update']['metadata'],
      })
      .eq('id', contractorId)

    if (updateError) {
      consola.error(`[ReviewRepository] Error updating enrichment status:`, updateError)
      throw updateError
    }

    consola.debug(`[ReviewRepository] Updated enrichment status for ${contractorId}: ${status}`)
  }
}

