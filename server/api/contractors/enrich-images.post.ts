/**
 * POST /api/contractors/enrich-images
 *
 * Process pending images for contractors.
 *
 * Finds all contractors where images_processed = false,
 * downloads images from metadata.pending_images[],
 * uploads to Supabase Storage, and updates metadata.images[].
 *
 * This is intentionally a separate endpoint from import to allow:
 * - Async processing after import completes
 * - Retry failed image downloads
 * - Manual triggering by admin
 *
 * Response: EnrichmentResponse with summary of processed images
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { requireAdmin } from '../../utils/auth'
import { ImageEnrichmentService } from '../../services/ImageEnrichmentService'
import type { EnrichmentResponse } from '../../schemas/import.schemas'

export default defineEventHandler(async (event): Promise<EnrichmentResponse> => {
  // Require admin authentication
  await requireAdmin(event)

  try {
    if (import.meta.dev) {
      consola.info('POST /api/contractors/enrich-images - Starting image enrichment')
    }

    // Initialize service
    const client = await serverSupabaseClient(event)
    const enrichmentService = new ImageEnrichmentService(client)

    // Process pending images (batch of 10 at a time)
    const summary = await enrichmentService.processAllPendingImages(10)

    if (import.meta.dev) {
      consola.success('POST /api/contractors/enrich-images - Enrichment complete', summary)
    }

    return {
      success: true,
      summary,
    }
  } catch (error) {
    consola.error('POST /api/contractors/enrich-images - Error:', error)

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to process images',
    })
  }
})

