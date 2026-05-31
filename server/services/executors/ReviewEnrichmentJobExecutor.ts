/**
 * Review Enrichment Job Executor
 *
 * Implements JobExecutor interface to run review enrichment as a background job.
 * Fetches Google reviews from DataForSEO API and upserts them into the database.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../app/types/supabase'
import type {
  BackgroundJobRow,
  JobResult,
  ReviewEnrichmentPayload,
  ReviewEnrichmentResult,
} from '../../schemas/job.schemas'
import {
  DEFAULT_REVIEW_MAX_DEPTH,
  REVIEW_ENRICHMENT_COOLDOWN_DAYS,
} from '../../schemas/job.schemas'
import type { JobExecutor, ProgressCallback } from '../JobExecutorRegistry'
import { DataForSeoService, type FetchResultOutput } from '../DataForSeoService'
import { ReviewRepository } from '../../repositories/ReviewRepository'
import { ContractorRepository } from '../../repositories/ContractorRepository'
import { SystemLogService } from '../SystemLogService'
import { JobService } from '../JobService'
import { ReviewImageService, RateLimitError } from '../ReviewImageService'
import { consola } from 'consola'
import type {
  DataForSeoReviewTask,
  TaskContractorMapping,
} from '../../schemas/dataforseo.schemas'
import { transformDataForSeoReview } from '../../schemas/dataforseo.schemas'

// =====================================================
// TYPES
// =====================================================

interface ValidatedContractor {
  id: string
  companyName: string
  googleCid: string
  latitude: number
  longitude: number
  reviewCount: number
}

interface ContractorResult {
  contractorId: string
  companyName: string
  status: 'success' | 'skipped' | 'failed'
  reason?: string
  reviewsFetched: number
  reviewsSaved: number
}

// =====================================================
// EXECUTOR
// =====================================================

export class ReviewEnrichmentJobExecutor implements JobExecutor {
  /**
   * Execute the review enrichment job
   */
  async execute(
    job: BackgroundJobRow,
    client: SupabaseClient<Database>,
    onProgress: ProgressCallback
  ): Promise<JobResult> {
    const logService = new SystemLogService(client)
    const reviewRepo = new ReviewRepository(client)
    const contractorRepo = new ContractorRepository(client)
    const dataForSeoService = new DataForSeoService()

    // Parse payload
    const payload = (job.payload || {}) as ReviewEnrichmentPayload
    const maxDepth = payload.maxDepth || DEFAULT_REVIEW_MAX_DEPTH
    const contractorIds = payload.contractorIds || []
    const continuous = payload.continuous === true

    consola.info(`ReviewEnrichmentJobExecutor: Starting job ${job.id} with ${contractorIds.length} contractors`)

    // Initialize result tracking
    const results: ContractorResult[] = []
    let totalReviewsFetched = 0
    let totalReviewsSaved = 0
    let apiCost = 0

    // Update total items
    onProgress({ totalItems: contractorIds.length })

    await logService.logJobEvent(job.id, 'batch_start', `Processing ${contractorIds.length} contractors`, {
      contractorIds,
      maxDepth,
      continuous,
    })

    // ===================================================
    // PHASE 1: Validate contractors
    // ===================================================
    consola.debug(`Phase 1: Validating contractors`)
    const validContractors: ValidatedContractor[] = []
    const skippedContractors: ContractorResult[] = []

    for (const contractorId of contractorIds) {
      const contractor = await contractorRepo.findById(contractorId)

      if (!contractor) {
        skippedContractors.push({
          contractorId,
          companyName: 'Unknown',
          status: 'skipped',
          reason: 'Contractor not found',
          reviewsFetched: 0,
          reviewsSaved: 0,
        })
        continue
      }

      // Check for required fields
      if (!contractor.google_cid) {
        skippedContractors.push({
          contractorId,
          companyName: contractor.company_name,
          status: 'skipped',
          reason: 'Missing Google CID',
          reviewsFetched: 0,
          reviewsSaved: 0,
        })
        continue
      }

      if (!contractor.lat || !contractor.lng) {
        skippedContractors.push({
          contractorId,
          companyName: contractor.company_name,
          status: 'skipped',
          reason: 'Missing coordinates',
          reviewsFetched: 0,
          reviewsSaved: 0,
        })
        continue
      }

      // Check cooldown
      const isEligible = await reviewRepo.isEligibleForEnrichment(
        contractorId,
        REVIEW_ENRICHMENT_COOLDOWN_DAYS
      )

      if (!isEligible) {
        skippedContractors.push({
          contractorId,
          companyName: contractor.company_name,
          status: 'skipped',
          reason: `Recently enriched (within ${REVIEW_ENRICHMENT_COOLDOWN_DAYS} days)`,
          reviewsFetched: 0,
          reviewsSaved: 0,
        })
        continue
      }

      validContractors.push({
        id: contractor.id,
        companyName: contractor.company_name,
        googleCid: contractor.google_cid,
        latitude: Number(contractor.lat),
        longitude: Number(contractor.lng),
        reviewCount: contractor.review_count || 0,
      })
    }

    // Add skipped contractors to results
    results.push(...skippedContractors)

    consola.debug(`Phase 1 complete: ${validContractors.length} valid, ${skippedContractors.length} skipped`)
    onProgress({ processedItems: skippedContractors.length })

    // If no valid contractors, return early
    if (validContractors.length === 0) {
      const result: ReviewEnrichmentResult = {
        processed: contractorIds.length,
        successful: 0,
        skipped: skippedContractors.length,
        failed: 0,
        totalReviewsFetched: 0,
        totalReviewsSaved: 0,
        apiCost: 0,
        results,
        shouldContinue: false,
      }

      await logService.logJobEvent(job.id, 'batch_complete', 'No valid contractors to process', result)
      return result
    }

    // ===================================================
    // PHASE 2: Build and submit tasks
    // ===================================================
    consola.debug(`Phase 2: Submitting ${validContractors.length} tasks to DataForSEO`)

    const tasks: DataForSeoReviewTask[] = validContractors.map(c => ({
      cid: c.googleCid,
      language_name: 'English' as const,
      location_coordinate: `${c.latitude},${c.longitude},50000`, // 50km radius
      depth: maxDepth,
      tag: c.id, // Use contractor ID as tag for tracking
    }))

    const contractorMappings = validContractors.map(c => ({
      contractorId: c.id,
      companyName: c.companyName,
      googleCid: c.googleCid,
    }))

    // Mark as pending before submission
    for (const c of validContractors) {
      await reviewRepo.updateEnrichmentStatus(c.id, 'pending')
    }

    const submitResult = await dataForSeoService.submitReviewTasks(tasks, contractorMappings)
    apiCost += submitResult.totalCost

    // Handle failed submissions
    for (const failed of submitResult.failedTasks) {
      await reviewRepo.updateEnrichmentStatus(failed.contractorId, 'failed', 0, failed.error)
      const contractor = validContractors.find(c => c.id === failed.contractorId)
      results.push({
        contractorId: failed.contractorId,
        companyName: contractor?.companyName || 'Unknown',
        status: 'failed',
        reason: `Task submission failed: ${failed.error}`,
        reviewsFetched: 0,
        reviewsSaved: 0,
      })
    }

    if (submitResult.taskMappings.length === 0) {
      const result: ReviewEnrichmentResult = {
        processed: contractorIds.length,
        successful: 0,
        skipped: skippedContractors.length,
        failed: submitResult.failedTasks.length,
        totalReviewsFetched: 0,
        totalReviewsSaved: 0,
        apiCost,
        results,
        shouldContinue: false,
      }

      await logService.logJobEvent(job.id, 'batch_complete', 'All task submissions failed', result)
      return result
    }

    // ===================================================
    // PHASE 3: Poll for ready tasks
    // ===================================================
    consola.debug(`Phase 3: Polling for ${submitResult.taskMappings.length} tasks`)

    const taskIds = submitResult.taskMappings.map(m => m.taskId)
    const pollResult = await dataForSeoService.pollTasksReady(taskIds)

    // Handle timed out tasks
    if (pollResult.timedOut) {
      for (const pendingId of pollResult.pendingTaskIds) {
        const mapping = submitResult.taskMappings.find(m => m.taskId === pendingId)
        if (mapping) {
          await reviewRepo.updateEnrichmentStatus(mapping.contractorId, 'failed', 0, 'Polling timeout')
          results.push({
            contractorId: mapping.contractorId,
            companyName: mapping.companyName,
            status: 'failed',
            reason: 'Polling timeout - task not ready',
            reviewsFetched: 0,
            reviewsSaved: 0,
          })
        }
      }
    }

    // ===================================================
    // PHASE 4: Fetch and save results
    // ===================================================
    consola.debug(`Phase 4: Fetching ${pollResult.readyTaskIds.length} ready task results`)

    for (const taskId of pollResult.readyTaskIds) {
      const mapping = submitResult.taskMappings.find(m => m.taskId === taskId)
      if (!mapping) continue

      try {
        const fetchResult: FetchResultOutput = await dataForSeoService.fetchTaskResult(taskId)
        apiCost += fetchResult.cost

        if (!fetchResult.success || !fetchResult.reviews) {
          await reviewRepo.updateEnrichmentStatus(
            mapping.contractorId,
            'failed',
            0,
            fetchResult.error || 'No reviews in response'
          )
          results.push({
            contractorId: mapping.contractorId,
            companyName: mapping.companyName,
            status: 'failed',
            reason: fetchResult.error || 'No reviews in response',
            reviewsFetched: 0,
            reviewsSaved: 0,
          })
          continue
        }

        // Transform and save reviews
        const reviewData = fetchResult.reviews[0]
        const reviews = reviewData?.items || []
        const transformedReviews = reviews.map(r => transformDataForSeoReview(r, mapping.contractorId))

        const savedCount = await reviewRepo.upsertManyFromDataForSeo(transformedReviews)

        totalReviewsFetched += reviews.length
        totalReviewsSaved += savedCount

        await reviewRepo.updateEnrichmentStatus(mapping.contractorId, 'success', reviews.length)

        // ===================================================
        // PHASE 4b: Download reviewer profile images
        // ===================================================
        await this.downloadReviewerImages(
          client,
          mapping.contractorId,
          job.id,
          logService
        )

        results.push({
          contractorId: mapping.contractorId,
          companyName: mapping.companyName,
          status: 'success',
          reviewsFetched: reviews.length,
          reviewsSaved: savedCount,
        })

        // Update progress
        const processedCount = results.length
        onProgress({ processedItems: processedCount })

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        await reviewRepo.updateEnrichmentStatus(mapping.contractorId, 'failed', 0, errorMessage)
        results.push({
          contractorId: mapping.contractorId,
          companyName: mapping.companyName,
          status: 'failed',
          reason: errorMessage,
          reviewsFetched: 0,
          reviewsSaved: 0,
        })
      }
    }

    // ===================================================
    // PHASE 5: Build final result
    // ===================================================
    const successful = results.filter(r => r.status === 'success').length
    const skipped = results.filter(r => r.status === 'skipped').length
    const failed = results.filter(r => r.status === 'failed').length

    // Check if we should continue (continuous mode)
    let shouldContinue = false
    if (continuous) {
      // Check if there are more contractors needing enrichment
      const { count } = await client
        .from('contractors')
        .select('*', { count: 'exact', head: true })
        .not('google_cid', 'is', null)
        .not('lat', 'is', null)

      shouldContinue = (count || 0) > contractorIds.length
    }

    const result: ReviewEnrichmentResult = {
      processed: contractorIds.length,
      successful,
      skipped,
      failed,
      totalReviewsFetched,
      totalReviewsSaved,
      apiCost,
      results,
      shouldContinue,
    }

    await logService.logJobEvent(job.id, 'batch_complete', `Processed ${contractorIds.length} contractors`, result)

    consola.success(
      `ReviewEnrichmentJobExecutor: Job ${job.id} complete - ${successful} successful, ${skipped} skipped, ${failed} failed`
    )

    return result
  }

  /**
   * Download reviewer profile images for a contractor
   * Handles rate limiting by queuing retry jobs
   */
  private async downloadReviewerImages(
    client: SupabaseClient<Database>,
    contractorId: string,
    jobId: string,
    logService: SystemLogService
  ): Promise<void> {
    const imageService = new ReviewImageService(client)

    try {
      // Get reviews that need photo downloads
      const reviews = await imageService.getReviewsNeedingPhotoDownload(contractorId)

      if (reviews.length === 0) {
        consola.debug(`[ReviewEnrichmentJobExecutor] No reviewer photos to download for ${contractorId}`)
        return
      }

      consola.info(`[ReviewEnrichmentJobExecutor] Downloading ${reviews.length} reviewer photos for ${contractorId}`)

      const result = await imageService.downloadReviewerPhotos(reviews, contractorId)

      await logService.logJobEvent(jobId, 'images_downloaded', `Downloaded ${result.downloaded} reviewer photos`, {
        contractorId,
        downloaded: result.downloaded,
        failed: result.failed,
      })
    } catch (error) {
      if (error instanceof RateLimitError) {
        // Queue retry job with cooldown
        consola.warn(
          `[ReviewEnrichmentJobExecutor] Rate limited downloading images for ${contractorId}. Queuing retry for ${error.remainingImages.length} images.`
        )

        const scheduledFor = JobService.calculateReviewerImageRetryTime(1)

        if (scheduledFor) {
          const jobService = new JobService(client)
          await jobService.createJob({
            jobType: 'reviewer_image_retry',
            payload: {
              contractorId,
              images: error.remainingImages,
              attemptNumber: 1,
            },
            scheduledFor,
          })

          await logService.logJobEvent(jobId, 'images_rate_limited', 'Queued retry job for remaining images', {
            contractorId,
            remainingImages: error.remainingImages.length,
            scheduledFor: scheduledFor.toISOString(),
          })
        }

        return // Don't throw - enrichment was successful, just images deferred
      }

      // Log other errors but don't fail the enrichment
      const errorMsg = error instanceof Error ? error.message : String(error)
      consola.error(`[ReviewEnrichmentJobExecutor] Error downloading images for ${contractorId}:`, errorMsg)

      await logService.logJobEvent(jobId, 'images_error', errorMsg, { contractorId })
    }
  }
}
