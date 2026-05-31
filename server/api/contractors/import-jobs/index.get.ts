/**
 * GET /api/contractors/import-jobs
 *
 * List import jobs with optional filtering.
 * Used for import history view.
 *
 * Query Parameters:
 * - status: Filter by status (pending, processing, completed, failed, cancelled)
 * - limit: Number of results (default: 20, max: 100)
 * - offset: Offset for pagination (default: 0)
 */

import { consola } from 'consola'
import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'
import { requireAdmin } from '../../../utils/auth'
import { ImportJobRepository } from '../../../repositories/ImportJobRepository'
import type { Database } from '../../../../app/types/supabase'
import type { ImportJobStatus, ImportError } from '../../../schemas/import.schemas'

const querySchema = z.object({
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  try {
    const query = getQuery(event)
    const validated = querySchema.parse(query)

    if (import.meta.dev) {
      consola.info('GET /api/contractors/import-jobs - Listing jobs', validated)
    }

    const client = await serverSupabaseClient<Database>(event)
    const repository = new ImportJobRepository(client)

    const { jobs, total } = await repository.findAll({
      status: validated.status as ImportJobStatus | undefined,
      limit: validated.limit,
      offset: validated.offset,
    })

    // Transform to API response format
    const data = jobs.map(job => ({
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
      errors: (job.errors || []) as ImportError[],
      createdAt: job.created_at,
      startedAt: job.started_at,
      completedAt: job.completed_at,
    }))

    if (import.meta.dev) {
      consola.success(`GET /api/contractors/import-jobs - Returning ${data.length} of ${total} jobs`)
    }

    return {
      success: true,
      data,
      pagination: {
        total,
        limit: validated.limit,
        offset: validated.offset,
        totalPages: Math.ceil(total / validated.limit),
      },
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'issues' in error) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Invalid query parameters',
        data: (error as { issues: unknown }).issues,
      })
    }

    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    consola.error('GET /api/contractors/import-jobs - Error:', error)

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to list import jobs',
    })
  }
})

