/**
 * POST /api/contractors/[id]/download-reviewer-images
 *
 * Download reviewer profile photos for a specific contractor.
 * Fetches images from Google URLs and uploads to Supabase Storage.
 *
 * Features:
 * - 300ms throttling between downloads
 * - Rate limit detection (429)
 * - Queues retry job on rate limit
 *
 * Response: { success, downloaded, failed, rateLimited, retryScheduled }
 */

import { consola } from 'consola'
import { z } from 'zod'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '../../../../app/types/supabase'
import { requireAdmin } from '../../../utils/auth'
import { ReviewImageService, RateLimitError } from '../../../services/ReviewImageService'
import { JobService } from '../../../services/JobService'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

interface DownloadReviewerImagesResponse {
  success: boolean
  contractorId: string
  totalImages: number
  downloaded: number
  failed: number
  rateLimited: boolean
  retryScheduled: boolean
  scheduledFor?: string
  message: string
}

export default defineEventHandler(async (event): Promise<DownloadReviewerImagesResponse> => {
  await requireAdmin(event)

  // Validate contractor ID
  const params = paramsSchema.safeParse(event.context.params)
  if (!params.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Invalid contractor ID',
    })
  }

  const { id: contractorId } = params.data

  try {
    if (import.meta.dev) {
      consola.info(`POST /api/contractors/${contractorId}/download-reviewer-images - Starting`)
    }

    const client = serverSupabaseServiceRole<Database>(event)
    const imageService = new ReviewImageService(client)

    // Get reviews needing photo downloads
    const reviews = await imageService.getReviewsNeedingPhotoDownload(contractorId)

    if (reviews.length === 0) {
      return {
        success: true,
        contractorId,
        totalImages: 0,
        downloaded: 0,
        failed: 0,
        rateLimited: false,
        retryScheduled: false,
        message: 'No reviewer photos to download',
      }
    }

    consola.info(`Downloading ${reviews.length} reviewer photos for contractor ${contractorId}`)

    // Attempt downloads
    const result = await imageService.downloadReviewerPhotos(reviews, contractorId)

    if (import.meta.dev) {
      consola.success(`Downloaded ${result.downloaded}/${result.totalImages} reviewer photos`)
    }

    return {
      success: true,
      contractorId,
      totalImages: result.totalImages,
      downloaded: result.downloaded,
      failed: result.failed,
      rateLimited: false,
      retryScheduled: false,
      message: `Downloaded ${result.downloaded} of ${result.totalImages} reviewer photos`,
    }
  } catch (error) {
    // Handle rate limiting
    if (error instanceof RateLimitError) {
      consola.warn(`Rate limited. Queuing retry for ${error.remainingImages.length} images.`)

      const retryClient = serverSupabaseServiceRole<Database>(event)
      const scheduledFor = JobService.calculateReviewerImageRetryTime(1)

      if (scheduledFor) {
        const jobService = new JobService(retryClient)
        await jobService.createJob(
          'reviewer_image_retry',
          {
            contractorId,
            images: error.remainingImages,
            attemptNumber: 1,
          },
          undefined, // createdBy
          scheduledFor
        )

        return {
          success: true,
          contractorId,
          totalImages: error.remainingImages.length,
          downloaded: 0,
          failed: 0,
          rateLimited: true,
          retryScheduled: true,
          scheduledFor: scheduledFor.toISOString(),
          message: `Rate limited. Retry scheduled for ${scheduledFor.toLocaleString()}`,
        }
      }
    }

    consola.error(`Error downloading reviewer images for ${contractorId}:`, error)

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to download images',
    })
  }
})

