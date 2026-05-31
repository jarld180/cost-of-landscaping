/**
 * Review Image Service
 *
 * Downloads reviewer profile photos and uploads to Supabase Storage.
 * Implements throttling to avoid rate limits from Google's image servers.
 *
 * Features:
 * - 300ms delay between downloads
 * - 5-second timeout per image
 * - Rate limit (429) detection with early termination
 * - Uploads to contractors bucket with reviews/ prefix
 */

import { consola } from 'consola'
import { createHash } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../app/types/supabase'
import {
  REVIEWER_IMAGE_DOWNLOAD_DELAY_MS,
  REVIEWER_IMAGE_DOWNLOAD_TIMEOUT_MS,
} from '../schemas/job.schemas'

/** Custom error for rate limiting - caller should catch and queue retry */
export class RateLimitError extends Error {
  /** Reviews that weren't processed due to rate limit */
  readonly remainingImages: Array<{ reviewId: string; originalUrl: string }>

  constructor(
    message: string,
    remainingImages: Array<{ reviewId: string; originalUrl: string }>
  ) {
    super(message)
    this.name = 'RateLimitError'
    this.remainingImages = remainingImages
  }
}

export interface ReviewImageDownloadResult {
  reviewId: string
  originalUrl: string
  storagePath: string | null
  success: boolean
  error?: string
}

export interface ReviewImageBatchResult {
  contractorId: string
  totalImages: number
  downloaded: number
  failed: number
  results: ReviewImageDownloadResult[]
}

export interface ReviewForImageDownload {
  id: string
  reviewer_photo_url: string | null
  downloaded_reviewer_photo_url: string | null
}

export class ReviewImageService {
  private client: SupabaseClient<Database>
  private bucketName = 'contractors'

  constructor(client: SupabaseClient<Database>) {
    this.client = client
  }

  /**
   * Download reviewer photos for a batch of reviews
   * Implements throttling with 300ms delay between downloads
   *
   * @throws RateLimitError if 429 encountered - contains remaining images
   */
  async downloadReviewerPhotos(
    reviews: ReviewForImageDownload[],
    contractorId: string
  ): Promise<ReviewImageBatchResult> {
    // Filter to only reviews with photos that haven't been downloaded
    const reviewsToProcess = reviews.filter(
      (r) => r.reviewer_photo_url && !r.downloaded_reviewer_photo_url
    )

    if (!reviewsToProcess.length) {
      consola.debug(`[ReviewImageService] No photos to download for contractor ${contractorId}`)
      return {
        contractorId,
        totalImages: 0,
        downloaded: 0,
        failed: 0,
        results: [],
      }
    }

    consola.info(
      `[ReviewImageService] Downloading ${reviewsToProcess.length} reviewer photos for contractor ${contractorId}`
    )

    const results: ReviewImageDownloadResult[] = []
    let downloaded = 0
    let failed = 0

    for (let i = 0; i < reviewsToProcess.length; i++) {
      const review = reviewsToProcess[i]

      // Throttle: wait between downloads (skip first)
      if (i > 0) {
        await this.delay(REVIEWER_IMAGE_DOWNLOAD_DELAY_MS)
      }

      try {
        const result = await this.downloadSinglePhoto(
          review.reviewer_photo_url!,
          contractorId,
          review.id
        )

        results.push(result)

        if (result.success && result.storagePath) {
          downloaded++
          // Update database with storage path
          await this.updateDownloadedPhotoUrl(review.id, result.storagePath)
        } else {
          failed++
        }
      } catch (error) {
        // Check for rate limit
        if (error instanceof RateLimitError) {
          // Add remaining unprocessed reviews to the error
          const remaining = reviewsToProcess.slice(i).map((r) => ({
            reviewId: r.id,
            originalUrl: r.reviewer_photo_url!,
          }))

          consola.warn(
            `[ReviewImageService] Rate limited after ${i} downloads. ${remaining.length} images remaining.`
          )

          throw new RateLimitError(
            `Rate limited after downloading ${downloaded} images`,
            remaining
          )
        }

        // Other errors - log and continue
        const errorMsg = error instanceof Error ? error.message : String(error)
        consola.error(`[ReviewImageService] Error downloading photo for review ${review.id}:`, errorMsg)

        results.push({
          reviewId: review.id,
          originalUrl: review.reviewer_photo_url!,
          storagePath: null,
          success: false,
          error: errorMsg,
        })
        failed++
      }
    }

    consola.info(
      `[ReviewImageService] Completed: ${downloaded} downloaded, ${failed} failed for contractor ${contractorId}`
    )

    return {
      contractorId,
      totalImages: reviewsToProcess.length,
      downloaded,
      failed,
      results,
    }
  }

  /**
   * Download a single reviewer photo
   *
   * @throws RateLimitError if 429 status received
   */
  async downloadSinglePhoto(
    imageUrl: string,
    contractorId: string,
    reviewId: string
  ): Promise<ReviewImageDownloadResult> {
    try {
      // Download with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), REVIEWER_IMAGE_DOWNLOAD_TIMEOUT_MS)

      const response = await fetch(imageUrl, {
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      // Check for rate limiting
      if (response.status === 429) {
        throw new RateLimitError('Rate limit exceeded (429)', [
          { reviewId, originalUrl: imageUrl },
        ])
      }

      if (!response.ok) {
        consola.warn(`[ReviewImageService] HTTP ${response.status} for ${imageUrl}`)
        return {
          reviewId,
          originalUrl: imageUrl,
          storagePath: null,
          success: false,
          error: `HTTP ${response.status}`,
        }
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg'
      const extension = this.getExtensionFromContentType(contentType)
      const buffer = await response.arrayBuffer()

      // Generate hash for unique filename
      const hash = createHash('md5').update(Buffer.from(buffer)).digest('hex').slice(0, 12)
      const storagePath = `reviews/${contractorId}/${hash}.${extension}`

      // Upload to Supabase Storage
      const { error } = await this.client.storage
        .from(this.bucketName)
        .upload(storagePath, buffer, {
          contentType,
          upsert: true,
        })

      if (error) {
        consola.warn(`[ReviewImageService] Storage upload failed for ${storagePath}:`, {
          message: error.message,
          name: error.name,
          error,
        })
        return {
          reviewId,
          originalUrl: imageUrl,
          storagePath: null,
          success: false,
          error: `Storage upload failed: ${error.message}`,
        }
      }

      consola.debug(`[ReviewImageService] Uploaded reviewer photo: ${storagePath}`)

      return {
        reviewId,
        originalUrl: imageUrl,
        storagePath,
        success: true,
      }
    } catch (error) {
      if (error instanceof RateLimitError) throw error

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          reviewId,
          originalUrl: imageUrl,
          storagePath: null,
          success: false,
          error: 'Download timeout',
        }
      }

      const errorMsg = error instanceof Error ? error.message : String(error)
      return {
        reviewId,
        originalUrl: imageUrl,
        storagePath: null,
        success: false,
        error: errorMsg,
      }
    }
  }

  /** Update the downloaded_reviewer_photo_url for a review */
  async updateDownloadedPhotoUrl(reviewId: string, storagePath: string): Promise<void> {
    const { error } = await this.client
      .from('reviews')
      .update({ downloaded_reviewer_photo_url: storagePath })
      .eq('id', reviewId)

    if (error) {
      consola.error(`[ReviewImageService] Failed to update review ${reviewId}:`, error)
      throw error
    }
  }

  /** Get reviews for a contractor that need photo downloads */
  async getReviewsNeedingPhotoDownload(
    contractorId: string,
    limit: number = 100
  ): Promise<ReviewForImageDownload[]> {
    const { data, error } = await this.client
      .from('reviews')
      .select('id, reviewer_photo_url, downloaded_reviewer_photo_url')
      .eq('contractor_id', contractorId)
      .not('reviewer_photo_url', 'is', null)
      .is('downloaded_reviewer_photo_url', null)
      .limit(limit)

    if (error) {
      consola.error(`[ReviewImageService] Error fetching reviews:`, error)
      throw error
    }

    return data ?? []
  }

  private getExtensionFromContentType(contentType: string): string {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    }
    const normalized = contentType.split(';')[0].trim().toLowerCase()
    return mimeToExt[normalized] || 'jpg'
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
