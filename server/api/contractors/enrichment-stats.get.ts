/**
 * GET /api/contractors/enrichment-stats
 *
 * Returns statistics about contractor enrichment status.
 * Used by the admin UI to display counts of enriched/unenriched contractors.
 *
 * Enrichment status is determined by metadata.enrichment.status:
 * - null/undefined: Not started (unenriched)
 * - 'completed': Successfully enriched
 * - 'failed': Enrichment failed
 * - 'not_applicable': No website to crawl
 *
 * @returns {Object} Enrichment statistics
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { requireAdmin } from '../../utils/auth'

interface EnrichmentStatsResponse {
  success: boolean
  stats: {
    total: number
    unenriched: number
    enriched: number
    failed: number
    noWebsite: number
  }
}

export default defineEventHandler(async (event): Promise<EnrichmentStatsResponse> => {
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

    // Get enriched count (metadata.enrichment.status = 'completed')
    const { count: enriched, error: enrichedError } = await client
      .from('contractors')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('metadata->enrichment->>status', 'completed')

    if (enrichedError) throw enrichedError

    // Get failed count (metadata.enrichment.status = 'failed')
    const { count: failed, error: failedError } = await client
      .from('contractors')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('metadata->enrichment->>status', 'failed')

    if (failedError) throw failedError

    // Get no website count (metadata.enrichment.status = 'not_applicable')
    const { count: noWebsite, error: noWebsiteError } = await client
      .from('contractors')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('metadata->enrichment->>status', 'not_applicable')

    if (noWebsiteError) throw noWebsiteError

    // Calculate unenriched (total minus all others)
    const totalCount = total ?? 0
    const enrichedCount = enriched ?? 0
    const failedCount = failed ?? 0
    const noWebsiteCount = noWebsite ?? 0
    const unenrichedCount = totalCount - enrichedCount - failedCount - noWebsiteCount

    if (import.meta.dev) {
      consola.info('GET /api/contractors/enrichment-stats', {
        total: totalCount,
        unenriched: unenrichedCount,
        enriched: enrichedCount,
        failed: failedCount,
        noWebsite: noWebsiteCount,
      })
    }

    return {
      success: true,
      stats: {
        total: totalCount,
        unenriched: unenrichedCount,
        enriched: enrichedCount,
        failed: failedCount,
        noWebsite: noWebsiteCount,
      },
    }
  } catch (error) {
    consola.error('GET /api/contractors/enrichment-stats - Error:', error)

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get enrichment stats',
    })
  }
})

