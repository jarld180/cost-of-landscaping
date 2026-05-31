/**
 * POST /api/contractors/import-jobs/[id]/process
 *
 * Process the next batch of rows for an import job.
 * Updates progress counters atomically after each batch.
 *
 * Query Parameters:
 * - batchSize: Number of rows to process (default: 50, max: 100)
 */

import { consola } from 'consola'
import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'
import { requireAdmin } from '../../../../utils/auth'
import { ImportJobRepository } from '../../../../repositories/ImportJobRepository'
import { ImportService } from '../../../../services/ImportService'
import {
  IMPORT_BATCH_SIZE,
  type ProcessBatchResponse,
  type ImportJobStatus,
  type ApifyRow,
} from '../../../../schemas/import.schemas'
import type { Database } from '../../../../../app/types/supabase'

const querySchema = z.object({
  batchSize: z.coerce.number().int().min(1).max(100).default(IMPORT_BATCH_SIZE),
})

export default defineEventHandler(async (event): Promise<ProcessBatchResponse> => {
  await requireAdmin(event)

  try {
    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Job ID is required',
      })
    }

    const query = getQuery(event)
    const { batchSize } = querySchema.parse(query)

    if (import.meta.dev) {
      consola.info(`POST /api/contractors/import-jobs/${id}/process - Processing batch of ${batchSize}`)
    }

    const client = await serverSupabaseClient<Database>(event)
    const repository = new ImportJobRepository(client)

    // Get current job
    const job = await repository.findById(id)
    if (!job) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: 'Import job not found',
      })
    }

    // Validate job is processable
    if (job.status === 'completed' || job.status === 'cancelled' || job.status === 'failed') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: `Cannot process job with status: ${job.status}`,
      })
    }

    // Mark as processing if pending
    if (job.status === 'pending') {
      await repository.setStatus(id, 'processing', { started_at: new Date().toISOString() })
    }

    // Get next batch of rows
    const rawData = job.raw_data as ApifyRow[]
    const startIdx = job.processed_rows
    const endIdx = Math.min(startIdx + batchSize, job.total_rows)
    const batchRows = rawData.slice(startIdx, endIdx)

    if (batchRows.length === 0) {
      // No more rows - mark complete
      const completedJob = await repository.setStatus(id, 'completed', {
        completed_at: new Date().toISOString(),
      })

      return {
        success: true,
        jobId: id,
        batch: { processed: 0, imported: 0, updated: 0, skipped: 0, skippedClaimed: 0, pendingImageCount: 0, reviewsImported: 0, errors: [] },
        job: {
          status: completedJob.status as ImportJobStatus,
          totalRows: completedJob.total_rows,
          processedRows: completedJob.processed_rows,
          isComplete: true,
        },
      }
    }

    // Initialize ImportService
    const config = useRuntimeConfig()
    const imageAllowlist = config.imageAllowlist
      ? config.imageAllowlist.split(',').map((s: string) => s.trim())
      : ['lh3.googleusercontent.com', 'streetviewpixels-pa.googleapis.com']

    const importService = new ImportService(client, {
      geocodingApiKey: config.googleGeocodingApiKey || '',
      imageAllowlist,
    })

    // Process batch
    const batchResult = await importService.processRows(batchRows, startIdx)

    // Update job progress
    const updatedJob = await repository.updateProgress(id, {
      processed_rows: job.processed_rows + batchResult.processed,
      imported_count: job.imported_count + batchResult.imported,
      updated_count: job.updated_count + batchResult.updated,
      skipped_count: job.skipped_count + batchResult.skipped,
      skipped_claimed_count: job.skipped_claimed_count + batchResult.skippedClaimed,
      error_count: job.error_count + batchResult.errors.length,
      pending_image_count: job.pending_image_count + batchResult.pendingImageCount,
      reviews_imported_count: job.reviews_imported_count + batchResult.reviewsImported,
    })

    // Append errors if any
    if (batchResult.errors.length > 0) {
      await repository.appendErrors(id, batchResult.errors)
    }

    // Check if complete
    const isComplete = updatedJob.processed_rows >= updatedJob.total_rows
    if (isComplete) {
      await repository.setStatus(id, 'completed', { completed_at: new Date().toISOString() })
    }

    if (import.meta.dev) {
      consola.success(`POST /api/contractors/import-jobs/${id}/process - Batch complete: ${batchResult.processed} rows, ${isComplete ? 'JOB COMPLETE' : `${updatedJob.processed_rows}/${updatedJob.total_rows}`}`)
    }

    return {
      success: true,
      jobId: id,
      batch: batchResult,
      job: {
        status: isComplete ? 'completed' : 'processing',
        totalRows: updatedJob.total_rows,
        processedRows: updatedJob.processed_rows,
        isComplete,
      },
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error

    consola.error('POST /api/contractors/import-jobs/[id]/process - Error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to process batch',
    })
  }
})

