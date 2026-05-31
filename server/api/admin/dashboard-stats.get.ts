/**
 * GET /api/admin/dashboard-stats
 *
 * Returns dashboard statistics for the admin panel.
 * Displays counts of:
 * - Active contractors (not soft-deleted)
 * - Pending business claims
 * - Contractors needing enrichment
 * - Cities with coverage
 *
 * @returns {Object} Dashboard statistics
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { requireAdmin } from '../../utils/auth'

interface DashboardStatsResponse {
  success: boolean
  stats: {
    activeContractors: number
    pendingClaims: number
    needEnrichment: number
    citiesWithCoverage: number
  }
}

export default defineEventHandler(async (event): Promise<DashboardStatsResponse> => {
  // Require admin authentication
  await requireAdmin(event)

  try {
    const client = await serverSupabaseClient(event)

    // Card #1: Active Contractors (not soft-deleted)
    const { count: activeContractors, error: err1 } = await client
      .from('contractors')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)

    if (err1) throw err1

    // Card #2: Pending Business Claims
    const { count: pendingClaims, error: err2 } = await client
      .from('business_claims')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    if (err2) throw err2

    // Card #3: Need Enrichment (subtraction method)
    // Get total active contractors
    const { count: totalActive, error: err3a } = await client
      .from('contractors')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)

    if (err3a) throw err3a

    // Get enriched count
    const { count: enriched, error: err3b } = await client
      .from('contractors')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('metadata->enrichment->>status', 'completed')

    if (err3b) throw err3b

    // Get failed count
    const { count: failed, error: err3c } = await client
      .from('contractors')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('metadata->enrichment->>status', 'failed')

    if (err3c) throw err3c

    // Get not_applicable count
    const { count: notApplicable, error: err3d } = await client
      .from('contractors')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('metadata->enrichment->>status', 'not_applicable')

    if (err3d) throw err3d

    // Calculate needEnrichment by subtraction
    const needEnrichment = (totalActive ?? 0) - (enriched ?? 0) - (failed ?? 0) - (notApplicable ?? 0)

    // Card #4: Cities with Coverage (using RPC function)
    const { data: cityCountData, error: err4 } = await client.rpc('count_distinct_contractor_cities') // @ts-ignore

    if (err4) throw err4

    const citiesWithCoverage = (cityCountData as number) ?? 0

    if (import.meta.dev) {
      consola.info('GET /api/admin/dashboard-stats', {
        activeContractors: activeContractors ?? 0,
        pendingClaims: pendingClaims ?? 0,
        needEnrichment,
        citiesWithCoverage,
      })
    }

    return {
      success: true,
      stats: {
        activeContractors: activeContractors ?? 0,
        pendingClaims: pendingClaims ?? 0,
        needEnrichment,
        citiesWithCoverage,
      },
    }
  } catch (error) {
    consola.error('GET /api/admin/dashboard-stats - Error:', error)

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get dashboard stats',
    })
  }
})
