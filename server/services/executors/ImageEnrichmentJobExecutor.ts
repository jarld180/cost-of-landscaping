/**
 * Image Enrichment Job Executor
 *
 * Implements JobExecutor interface to run image enrichment as a background job.
 * Wraps the existing ImageEnrichmentService and reports progress after each contractor.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../app/types/supabase'
import type { BackgroundJobRow, JobResult, ImageEnrichmentPayload, ImageEnrichmentResult } from '../../schemas/job.schemas'
import { DEFAULT_IMAGE_BATCH_SIZE } from '../../schemas/job.schemas'
import type { JobExecutor, ProgressCallback } from '../JobExecutorRegistry'
import { ImageEnrichmentService } from '../ImageEnrichmentService'
import { SystemLogService } from '../SystemLogService'
import { consola } from 'consola'

export class ImageEnrichmentJobExecutor implements JobExecutor {
  /**
   * Execute the image enrichment job
   */
  async execute(
    job: BackgroundJobRow,
    client: SupabaseClient<Database>,
    onProgress: ProgressCallback
  ): Promise<JobResult> {
    const logService = new SystemLogService(client)
    const enrichmentService = new ImageEnrichmentService(client)

    // Parse payload
    const payload = (job.payload || {}) as ImageEnrichmentPayload
    const batchSize = payload.batchSize || DEFAULT_IMAGE_BATCH_SIZE

    consola.info(`ImageEnrichmentJobExecutor: Starting job ${job.id} with batch size ${batchSize}`)

    // Track progress
    let processedContractors = 0
    let totalImages = 0
    let failedImages = 0
    const errors: ImageEnrichmentResult['errors'] = []

    // Get initial count of pending contractors to set total_items
    const { count: totalPending } = await client
      .from('contractors')
      .select('*', { count: 'exact', head: true })
      .eq('images_processed', false)

    // Update job with total items
    if (totalPending && totalPending > 0) {
      onProgress({ totalItems: Math.min(totalPending, batchSize) })
    }

    // Log job start details
    await logService.logJobEvent(job.id, 'batch_start', `Processing up to ${batchSize} contractors`, {
      batchSize,
      pendingContractors: totalPending,
    })

    // Run enrichment with progress callback
    const summary = await enrichmentService.processAllPendingImages(batchSize, async (event) => {
      switch (event.type) {
        case 'enrichment:start':
          // Update total items based on actual batch
          onProgress({ totalItems: event.totalContractors })
          break

        case 'contractor:complete':
          processedContractors = event.index
          totalImages += event.imagesSuccess
          failedImages += event.imagesFailed

          // Report progress to job queue
          onProgress({
            processedItems: processedContractors,
            failedItems: failedImages,
          })

          // Log individual contractor progress (debug level)
          if (import.meta.dev) {
            consola.debug(`ImageEnrichmentJobExecutor: Contractor ${event.index} complete - ${event.imagesSuccess} images, ${event.imagesFailed} failed`)
          }
          break

        case 'enrichment:complete':
          // Note: We log the final summary after the await completes, not here
          // because 'summary' is not yet available inside this callback
          break
      }
    })

    // Log final summary after enrichment completes
    await logService.logJobEvent(job.id, 'batch_complete', `Processed ${summary.processedContractors} contractors`, {
      processedContractors: summary.processedContractors,
      totalImages: summary.totalImages,
      failedImages: summary.failedImages,
      contractorsRemaining: summary.contractorsRemaining,
    })

    consola.success(`ImageEnrichmentJobExecutor: Job ${job.id} complete - ${summary.processedContractors} contractors, ${summary.totalImages} images`)

    // Build result
    const result: ImageEnrichmentResult = {
      processedContractors: summary.processedContractors,
      totalImages: summary.totalImages,
      successfulImages: summary.totalImages,
      failedImages: summary.failedImages,
      contractorsRemaining: summary.contractorsRemaining,
      errors,
      // Include flag to trigger next job in chain
      shouldContinue: payload.continuous === true && summary.contractorsRemaining > 0,
    }

    return result
  }
}

