/**
 * GET /api/contractors/import-jobs/[id]
 *
 * Get import job status and progress.
 * Used for polling during batch processing.
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { requireAdmin } from '../../../utils/auth'
import { ImportJobRepository } from '../../../repositories/ImportJobRepository'
import type { Database } from '../../../../app/types/supabase'
import type { ImportJobStatusResponse, ImportJobStatus, ImportError } from '../../../schemas/import.schemas'

export default defineEventHandler(async (event): Promise<ImportJobStatusResponse> => {
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

    if (import.meta.dev) {
      consola.info(`GET /api/contractors/import-jobs/${id} - Getting job status`)
    }

    const client = await serverSupabaseClient<Database>(event)
    const repository = new ImportJobRepository(client)

    const job = await repository.findById(id)

    if (!job) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: 'Import job not found',
      })
    }

    if (import.meta.dev) {
      consola.success(`GET /api/contractors/import-jobs/${id} - Status: ${job.status}, Progress: ${job.processed_rows}/${job.total_rows}`)
    }

    return {
      success: true,
      job: {
        id: job.id,
        status: job.status as ImportJobStatus,
        filename: job.filename,
        totalRows: job.total_rows,
        processedRows: job.processed_rows,
        importedCount: job.imported_count,
        updatedCount: job.updated_count,
        skippedCount: job.skipped_count,
        skippedClaimedCount: job.skipped_claimed_count,
        errorCount: job.error_count,
        pendingImageCount: job.pending_image_count,
        reviewsImportedCount: job.reviews_imported_count ?? 0,
        errors: (job.errors || []) as ImportError[],
        createdAt: job.created_at,
        startedAt: job.started_at,
        completedAt: job.completed_at,
      },
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    consola.error('GET /api/contractors/import-jobs/[id] - Error:', error)

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to get import job status',
    })
  }
})

