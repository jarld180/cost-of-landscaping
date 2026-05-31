/**
 * Reviewer Image Retry Job Executor
 *
 * Retries downloading reviewer profile images after rate limit cooldown.
 * Implements exponential backoff: 15m → 30m → 1h → 2h
 *
 * If rate limited again, queues another retry job with escalated cooldown.
 * After max retries (4), abandons and keeps external URL.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../app/types/supabase'
import type {
  BackgroundJobRow,
  JobResult,
  ReviewerImageRetryPayload,
  ReviewerImageRetryResult,
} from '../../schemas/job.schemas'
import { REVIEWER_IMAGE_MAX_RETRIES } from '../../schemas/job.schemas'
import type { JobExecutor, ProgressCallback } from '../JobExecutorRegistry'
import { ReviewImageService, RateLimitError } from '../ReviewImageService'
import { JobService } from '../JobService'
import { SystemLogService } from '../SystemLogService'
import { consola } from 'consola'

export class ReviewerImageRetryJobExecutor implements JobExecutor {
  async execute(
    job: BackgroundJobRow,
    client: SupabaseClient<Database>,
    onProgress: ProgressCallback
  ): Promise<JobResult> {
    const logService = new SystemLogService(client)
    const imageService = new ReviewImageService(client)

    // Parse payload
    const payload = job.payload as ReviewerImageRetryPayload
    const { contractorId, images, attemptNumber = 1 } = payload

    consola.info(
      `[ReviewerImageRetryJobExecutor] Starting retry attempt ${attemptNumber} for ${images.length} images (contractor: ${contractorId})`
    )

    onProgress({ totalItems: images.length })

    await logService.logJobEvent(job.id, 'retry_start', `Retry attempt ${attemptNumber}`, {
      contractorId,
      imageCount: images.length,
      attemptNumber,
    })

    // Build review objects for the service
    const reviewsToProcess = images.map((img) => ({
      id: img.reviewId,
      reviewer_photo_url: img.originalUrl,
      downloaded_reviewer_photo_url: null,
    }))

    try {
      const result = await imageService.downloadReviewerPhotos(reviewsToProcess, contractorId)

      onProgress({ processedItems: result.downloaded + result.failed })

      const jobResult: ReviewerImageRetryResult = {
        contractorId,
        totalImages: images.length,
        downloaded: result.downloaded,
        failed: result.failed,
        requeuedForRetry: false,
      }

      await logService.logJobEvent(job.id, 'retry_complete', 'Retry completed successfully', jobResult)

      consola.success(
        `[ReviewerImageRetryJobExecutor] Completed: ${result.downloaded} downloaded, ${result.failed} failed`
      )

      return jobResult
    } catch (error) {
      // Handle rate limit - queue another retry
      if (error instanceof RateLimitError) {
        const nextAttempt = attemptNumber + 1

        if (nextAttempt > REVIEWER_IMAGE_MAX_RETRIES) {
          // Max retries exceeded - abandon
          consola.warn(
            `[ReviewerImageRetryJobExecutor] Max retries (${REVIEWER_IMAGE_MAX_RETRIES}) exceeded for contractor ${contractorId}. Abandoning ${error.remainingImages.length} images.`
          )

          await logService.logJobEvent(job.id, 'retry_abandoned', 'Max retries exceeded', {
            contractorId,
            remainingImages: error.remainingImages.length,
            attemptNumber,
          })

          return {
            contractorId,
            totalImages: images.length,
            downloaded: images.length - error.remainingImages.length,
            failed: error.remainingImages.length,
            remainingImages: error.remainingImages,
            requeuedForRetry: false,
          } as ReviewerImageRetryResult
        }

        // Queue retry with escalated cooldown
        const scheduledFor = JobService.calculateReviewerImageRetryTime(nextAttempt)

        if (scheduledFor) {
          const jobService = new JobService(client)
          await jobService.createJob({
            jobType: 'reviewer_image_retry',
            payload: {
              contractorId,
              images: error.remainingImages,
              attemptNumber: nextAttempt,
            },
            scheduledFor,
          })

          consola.info(
            `[ReviewerImageRetryJobExecutor] Queued retry attempt ${nextAttempt} for ${error.remainingImages.length} images, scheduled for ${scheduledFor.toISOString()}`
          )

          await logService.logJobEvent(job.id, 'retry_requeued', `Queued attempt ${nextAttempt}`, {
            contractorId,
            remainingImages: error.remainingImages.length,
            nextAttempt,
            scheduledFor: scheduledFor.toISOString(),
          })
        }

        return {
          contractorId,
          totalImages: images.length,
          downloaded: images.length - error.remainingImages.length,
          failed: 0, // Not failed, just deferred
          remainingImages: error.remainingImages,
          requeuedForRetry: true,
        } as ReviewerImageRetryResult
      }

      // Other errors
      const errorMsg = error instanceof Error ? error.message : String(error)
      consola.error(`[ReviewerImageRetryJobExecutor] Error:`, errorMsg)

      await logService.logJobEvent(job.id, 'retry_error', errorMsg, { contractorId })

      throw error
    }
  }
}

