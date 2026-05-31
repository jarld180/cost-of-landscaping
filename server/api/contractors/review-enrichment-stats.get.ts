/**
 * GET /api/contractors/review-enrichment-stats
 *
 * Returns statistics about contractor review enrichment status.
 * Used by the admin UI to display counts of enriched/unenriched contractors.
 *
 * Review enrichment status is determined by metadata.reviews_enrichment.status:
 * - null/undefined: Not Enriched (eligible for enrichment)
 * - 'success': Successfully enriched
 * - 'failed': Enrichment failed
 *
 * @returns {Object} Review enrichment statistics
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { requireAdmin } from '../../utils/auth'

interface ReviewEnrichmentStatsResponse {
  success: boolean
  stats: {
    total: number
    notEnriched: number
    enriched: number
    noReviews: number
    noCid: number
    failed: number
  }
}

export default defineEventHandler(async (event): Promise<ReviewEnrichmentStatsResponse> => {
  // Require admin authentication
  await requireAdmin(event)

  try {
    const client = await serverSupabaseClient(event)

    // Get total contractor count (not deleted)
    const { count: total, error: totalError } = await client
      .from('contractors')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)

    if (totalError) throw totalError

    // Get count with no Google CID (ineligible for enrichment)
    const { count: noCid, error: noCidError } = await client
      .from('contractors')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .is('google_cid', null)

    if (noCidError) throw noCidError

    // Get count not enriched: has CID, has reviews (review_count > 0), but no enrichment done
    const { count: notEnriched, error: notEnrichedError } = await client
      .from('contractors')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .not('google_cid', 'is', null)
      .gt('review_count', 0)
      .or('metadata->reviews_enrichment.is.null,metadata->reviews_enrichment->>status.is.null')

    if (notEnrichedError) throw notEnrichedError

    // Get count successfully enriched
    const { count: enriched, error: enrichedError } = await client
      .from('contractors')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .not('google_cid', 'is', null)
      .eq('metadata->reviews_enrichment->>status', 'success')

    if (enrichedError) throw enrichedError

    // Get count with failed enrichment
    const { count: failed, error: failedError } = await client
      .from('contractors')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('metadata->reviews_enrichment->>status', 'failed')

    if (failedError) throw failedError

    // Get count with no reviews (review_count = 0 or null, has CID)
    const { count: noReviews, error: noReviewsError } = await client
      .from('contractors')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .not('google_cid', 'is', null)
      .or('review_count.is.null,review_count.eq.0')

    if (noReviewsError) throw noReviewsError

    // Calculate stats
    const totalCount = total ?? 0
    const noCidCount = noCid ?? 0
    const notEnrichedCount = notEnriched ?? 0
    const enrichedCount = enriched ?? 0
    const noReviewsCount = noReviews ?? 0
    const failedCount = failed ?? 0

    if (import.meta.dev) {
      consola.info('GET /api/contractors/review-enrichment-stats', {
        total: totalCount,
        notEnriched: notEnrichedCount,
        enriched: enrichedCount,
        noReviews: noReviewsCount,
        noCid: noCidCount,
        failed: failedCount,
      })
    }

    return {
      success: true,
      stats: {
        total: totalCount,
        notEnriched: notEnrichedCount,
        enriched: enrichedCount,
        noReviews: noReviewsCount,
        noCid: noCidCount,
        failed: failedCount,
      },
    }
  } catch (error) {
    consola.error('GET /api/contractors/review-enrichment-stats - Error:', error)

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get review enrichment stats',
    })
  }
})

