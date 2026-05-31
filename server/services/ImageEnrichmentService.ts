/**
 * Image Enrichment Service
 *
 * Processes pending images for contractors:
 * - Downloads images from metadata.pending_images[]
 * - Uploads to Supabase Storage
 * - Updates metadata.images[] with storage paths
 * - Sets images_processed = true
 *
 * Called asynchronously via POST /api/contractors/enrich-images
 * Or via SSE stream at GET /api/contractors/enrich-images/stream
 */

import { consola } from 'consola'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../app/types/supabase'
import { ContractorRepository, type ContractorMetadata } from '../repositories/ContractorRepository'
import { IMAGE_DOWNLOAD_TIMEOUT_MS, type EnrichmentSummary } from '../schemas/import.schemas'
import { createHash } from 'crypto'

interface ProcessedImage {
  storage_path: string
  original_url: string
  display_order: number
  is_primary: boolean
  uploaded_at: string
}

// =====================================================
// SSE EVENT TYPES
// =====================================================

export type EnrichmentEventType =
  | 'enrichment:start'
  | 'contractor:start'
  | 'image:progress'
  | 'contractor:complete'
  | 'enrichment:complete'

export interface EnrichmentStartEvent {
  type: 'enrichment:start'
  totalContractors: number
  totalImages: number
}

export interface ContractorStartEvent {
  type: 'contractor:start'
  index: number
  total: number
  contractorId: string
  companyName: string
  imageCount: number
}

export interface ImageProgressEvent {
  type: 'image:progress'
  imageIndex: number
  imageCount: number
  status: 'downloading' | 'uploading' | 'done' | 'failed'
}

export interface ContractorCompleteEvent {
  type: 'contractor:complete'
  index: number
  imagesSuccess: number
  imagesFailed: number
}

export interface EnrichmentCompleteEvent {
  type: 'enrichment:complete'
  summary: EnrichmentSummary
}

export type EnrichmentEvent =
  | EnrichmentStartEvent
  | ContractorStartEvent
  | ImageProgressEvent
  | ContractorCompleteEvent
  | EnrichmentCompleteEvent

export type EnrichmentEventCallback = (event: EnrichmentEvent) => void | Promise<void>

export class ImageEnrichmentService {
  private client: SupabaseClient<Database>
  private contractorRepo: ContractorRepository
  private bucketName = 'contractors'

  constructor(client: SupabaseClient<Database>) {
    this.client = client
    this.contractorRepo = new ContractorRepository(client)
  }

  /**
   * Process all contractors with pending images
   * @param batchSize Number of contractors to process in this batch
   * @param onEvent Optional callback for SSE streaming events
   */
  async processAllPendingImages(
    batchSize = 10,
    onEvent?: EnrichmentEventCallback
  ): Promise<EnrichmentSummary> {
    const summary: EnrichmentSummary = {
      processedContractors: 0,
      totalImages: 0,
      failedImages: 0,
      contractorsRemaining: 0,
    }

    // Get total count of pending contractors first
    const { count: totalPending } = await this.client
      .from('contractors')
      .select('*', { count: 'exact', head: true })
      .eq('images_processed', false)

    // Fetch contractors with pending images
    const contractors = await this.contractorRepo.findPendingImageProcessing(batchSize)

    if (contractors.length === 0) {
      consola.info('ImageEnrichmentService: No contractors with pending images')
      return summary
    }

    // Calculate remaining after this batch
    summary.contractorsRemaining = Math.max(0, (totalPending || 0) - contractors.length)

    // Calculate total images in this batch
    const totalImages = contractors.reduce((sum, c) => {
      const meta = (c.metadata || {}) as ContractorMetadata
      return sum + (meta.pending_images?.length || 0)
    }, 0)

    consola.info(`ImageEnrichmentService: Processing ${contractors.length} contractors, ${totalImages} images, ${summary.contractorsRemaining} remaining`)

    // Emit start event
    if (onEvent) {
      await onEvent({
        type: 'enrichment:start',
        totalContractors: contractors.length,
        totalImages,
      })
    }

    for (let i = 0; i < contractors.length; i++) {
      const contractor = contractors[i]
      const meta = (contractor.metadata || {}) as ContractorMetadata
      const imageCount = meta.pending_images?.length || 0

      // Emit contractor start event
      if (onEvent) {
        await onEvent({
          type: 'contractor:start',
          index: i + 1,
          total: contractors.length,
          contractorId: contractor.id,
          companyName: contractor.company_name,
          imageCount,
        })
      }

      try {
        const result = await this.processContractorImages(contractor, onEvent)
        summary.processedContractors++
        summary.totalImages += result.successCount
        summary.failedImages += result.failedCount

        // Emit contractor complete event
        if (onEvent) {
          await onEvent({
            type: 'contractor:complete',
            index: i + 1,
            imagesSuccess: result.successCount,
            imagesFailed: result.failedCount,
          })
        }
      } catch (error) {
        consola.error(`ImageEnrichmentService: Failed to process contractor ${contractor.id}`, error)
        summary.failedImages++

        // Emit contractor complete with failure
        if (onEvent) {
          await onEvent({
            type: 'contractor:complete',
            index: i + 1,
            imagesSuccess: 0,
            imagesFailed: imageCount,
          })
        }
      }
    }

    consola.success(`ImageEnrichmentService: Processed ${summary.processedContractors} contractors, ${summary.totalImages} images, ${summary.failedImages} failed`)

    // Emit complete event
    if (onEvent) {
      await onEvent({
        type: 'enrichment:complete',
        summary,
      })
    }

     return summary
   }

   /**
    * Download specific images for a contractor (used by inline enrichment flow)
    * Uses contractor.id (UUID) as the storage directory key.
    * 
    * @param contractorId - Contractor UUID (used for storage path directory)
    * @param imageUrls - Ordered list of URLs (index 0 should be primary)
    * @returns Object with storagePaths[] and primaryImage (first successful download)
    */
   async downloadImages(
     contractorId: string,
     imageUrls: string[]
   ): Promise<{ storagePaths: string[]; primaryImage: string | null }> {
     const storagePaths: string[] = []
     let primaryImage: string | null = null

     for (const url of imageUrls) {
       try {
         const path = await this.downloadAndUploadImage(url, contractorId)
         if (path) {
           storagePaths.push(path)
           if (primaryImage === null) {
             primaryImage = path
           }
         }
       } catch (error) {
         consola.warn(`Failed to download image for contractor ${contractorId}: ${url}`, error)
       }
     }

     return { storagePaths, primaryImage }
   }

   /**
    * Process images for a single contractor
    */
   private async processContractorImages(
    contractor: Database['public']['Tables']['contractors']['Row'],
    onEvent?: EnrichmentEventCallback
  ): Promise<{ successCount: number; failedCount: number }> {
    const metadata = (contractor.metadata || {}) as ContractorMetadata
    const pendingImages = metadata.pending_images || []

    if (pendingImages.length === 0) {
      // No pending images, just mark as processed
      await this.contractorRepo.markImagesProcessed(contractor.id, [])
      return { successCount: 0, failedCount: 0 }
    }

    const processedImages: ProcessedImage[] = []
    let failedCount = 0
    const imageCount = pendingImages.length

    for (let i = 0; i < pendingImages.length; i++) {
      const imageUrl = pendingImages[i]

      // Emit downloading event
      if (onEvent) {
        await onEvent({
          type: 'image:progress',
          imageIndex: i + 1,
          imageCount,
          status: 'downloading',
        })
      }

      try {
        const storagePath = await this.downloadAndUploadImage(
          imageUrl,
          contractor.google_place_id || contractor.id,
          onEvent ? async () => {
            // Emit uploading event
            await onEvent({
              type: 'image:progress',
              imageIndex: i + 1,
              imageCount,
              status: 'uploading',
            })
          } : undefined
        )

        if (storagePath) {
          processedImages.push({
            storage_path: storagePath,
            original_url: imageUrl,
            display_order: i,
            is_primary: i === 0,
            uploaded_at: new Date().toISOString(),
          })

          // Emit done event
          if (onEvent) {
            await onEvent({
              type: 'image:progress',
              imageIndex: i + 1,
              imageCount,
              status: 'done',
            })
          }
        } else {
          failedCount++
          if (onEvent) {
            await onEvent({
              type: 'image:progress',
              imageIndex: i + 1,
              imageCount,
              status: 'failed',
            })
          }
        }
      } catch (error) {
        consola.warn(`ImageEnrichmentService: Failed to process image ${imageUrl}`, error)
        failedCount++
        if (onEvent) {
          await onEvent({
            type: 'image:progress',
            imageIndex: i + 1,
            imageCount,
            status: 'failed',
          })
        }
      }
    }

    // Update contractor with processed images
    await this.updateContractorImages(contractor.id, metadata, processedImages)

    return { successCount: processedImages.length, failedCount }
  }

  /**
   * Download image from URL and upload to Supabase Storage
   * @param onUploadStart Optional callback called just before uploading
   */
  private async downloadAndUploadImage(
    imageUrl: string,
    placeId: string,
    onUploadStart?: () => Promise<void>
  ): Promise<string | null> {
    try {
      // Download with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), IMAGE_DOWNLOAD_TIMEOUT_MS)

      const response = await fetch(imageUrl, {
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        consola.warn(`ImageEnrichmentService: HTTP ${response.status} for ${imageUrl}`)
        return null
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg'
      const extension = this.getExtensionFromContentType(contentType)
      const buffer = await response.arrayBuffer()

      // Generate hash for filename
      const hash = createHash('md5').update(Buffer.from(buffer)).digest('hex').slice(0, 12)
      const storagePath = `${placeId}/${hash}.${extension}`

      // Notify we're about to upload
      if (onUploadStart) {
        await onUploadStart()
      }

      // Upload to Supabase Storage
      const { error } = await this.client.storage
        .from(this.bucketName)
        .upload(storagePath, buffer, {
          contentType,
          upsert: true,
        })

      if (error) {
        consola.warn(`ImageEnrichmentService: Storage upload failed for ${storagePath}`, error)
        return null
      }

      if (import.meta.dev) {
        consola.success(`ImageEnrichmentService: Uploaded ${storagePath}`)
      }

      return storagePath
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        consola.warn(`ImageEnrichmentService: Timeout downloading ${imageUrl}`)
      } else {
        consola.warn(`ImageEnrichmentService: Error downloading ${imageUrl}`, error)
      }
      return null
    }
  }

  /**
   * Update contractor with processed images
   */
  private async updateContractorImages(
    contractorId: string,
    existingMetadata: ContractorMetadata,
    processedImages: ProcessedImage[]
  ): Promise<void> {
    const existingImages = existingMetadata.images || []

    const updatedMetadata: ContractorMetadata = {
      ...existingMetadata,
      images: [...existingImages, ...processedImages.map(img => img.storage_path)],
      pending_images: [],
    }

    const { error } = await this.client
      .from('contractors')
      .update({
        images_processed: true,
        metadata: updatedMetadata as unknown as Database['public']['Tables']['contractors']['Update']['metadata'],
      })
      .eq('id', contractorId)

    if (error) throw error
  }

  /**
   * Get file extension from content type
   */
  private getExtensionFromContentType(contentType: string): string {
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
    }
    return map[contentType.toLowerCase()] || 'jpg'
  }
}

