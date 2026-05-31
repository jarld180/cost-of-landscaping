/**
 * GET /api/contractors/enrichment-queue
 *
 * Returns comprehensive queue statistics for image enrichment:
 * - Total contractors with pending images
 * - Total images across all pending contractors
 * - Preview of the first 10 contractors in queue with their image counts
 *
 * Used by the import page to show queue status before starting enrichment.
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { requireAdmin } from '../../utils/auth'
import type { ContractorMetadata } from '../../repositories/ContractorRepository'

interface QueueContractor {
  id: string
  companyName: string
  googlePlaceId: string | null
  imageCount: number
}

interface EnrichmentQueueResponse {
  success: boolean
  stats: {
    pendingContractors: number
    totalPendingImages: number
  }
  queue: QueueContractor[]
}

export default defineEventHandler(async (event): Promise<EnrichmentQueueResponse> => {
  // Require admin authentication
  await requireAdmin(event)

  try {
    const client = await serverSupabaseClient(event)

    // Get count of pending contractors
    const { count: pendingContractors, error: countError } = await client
      .from('contractors')
      .select('*', { count: 'exact', head: true })
      .eq('images_processed', false)
      .is('deleted_at', null)

    if (countError) throw countError

    // Fetch first 10 contractors with their metadata to count images
    const { data: contractors, error: fetchError } = await client
      .from('contractors')
      .select('id, company_name, google_place_id, metadata')
      .eq('images_processed', false)
      .is('deleted_at', null)
      .limit(10)

    if (fetchError) throw fetchError

    // Calculate total pending images and build queue preview
    let totalPendingImages = 0
    const queue: QueueContractor[] = []

    for (const contractor of contractors || []) {
      const metadata = (contractor.metadata || {}) as ContractorMetadata
      const pendingImages = metadata.pending_images || []
      const imageCount = pendingImages.length

      totalPendingImages += imageCount
      queue.push({
        id: contractor.id,
        companyName: contractor.company_name,
        googlePlaceId: contractor.google_place_id,
        imageCount,
      })
    }

    // If there are more contractors beyond the first 10, we need to count their images too
    // For efficiency, we'll estimate based on average if there are many more
    const contractorsInQueue = contractors?.length || 0
    const totalContractors = pendingContractors || 0

    if (totalContractors > contractorsInQueue && contractorsInQueue > 0) {
      // Fetch remaining contractors' image counts
      // For large datasets, this could be optimized with a SQL function
      const { data: remainingContractors, error: remainingError } = await client
        .from('contractors')
        .select('metadata')
        .eq('images_processed', false)
        .is('deleted_at', null)
        .range(10, totalContractors - 1)

      if (!remainingError && remainingContractors) {
        for (const contractor of remainingContractors) {
          const metadata = (contractor.metadata || {}) as ContractorMetadata
          const pendingImages = metadata.pending_images || []
          totalPendingImages += pendingImages.length
        }
      }
    }

    if (import.meta.dev) {
      consola.info(`GET /api/contractors/enrichment-queue - ${totalContractors} contractors, ${totalPendingImages} images`)
    }

    return {
      success: true,
      stats: {
        pendingContractors: totalContractors,
        totalPendingImages,
      },
      queue,
    }
  } catch (error) {
    consola.error('GET /api/contractors/enrichment-queue - Error:', error)

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get enrichment queue',
    })
  }
})

