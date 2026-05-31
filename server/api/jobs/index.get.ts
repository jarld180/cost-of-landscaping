/**
 * GET /api/jobs
 *
 * List background jobs with optional filtering and pagination.
 * Requires admin authentication.
 *
 * Query Parameters:
 * - status: Filter by status (pending, processing, completed, failed, cancelled)
 * - jobType: Filter by job type (e.g., 'image_enrichment')
 * - limit: Number of results (default: 20, max: 100)
 * - offset: Offset for pagination (default: 0)
 *
 * @returns {Object} Paginated list of jobs
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { JobService } from '../../services/JobService'
import { listJobsQuerySchema } from '../../schemas/job.schemas'
import { requireAdmin } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  try {
    // Require admin authentication
    const userId = await requireAdmin(event)

    if (import.meta.dev) {
      consola.info('GET /api/jobs - Listing jobs', { userId })
    }

    // Get and validate query parameters
    const query = getQuery(event)
    const validatedQuery = listJobsQuerySchema.parse(query)

    if (import.meta.dev) {
      consola.info('GET /api/jobs - Query params:', validatedQuery)
    }

    // Get Supabase client and create service
    const client = await serverSupabaseClient(event)
    const jobService = new JobService(client)

    // List jobs using service
    const { jobs, total } = await jobService.listJobs({
      status: validatedQuery.status,
      jobType: validatedQuery.jobType,
      limit: validatedQuery.limit,
      offset: validatedQuery.offset
    })

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / validatedQuery.limit)
    const currentPage = Math.floor(validatedQuery.offset / validatedQuery.limit) + 1

    if (import.meta.dev) {
      consola.success(`GET /api/jobs - Returning ${jobs.length} of ${total} jobs`)
    }

    return {
      success: true,
      data: jobs.map(job => JobService.toResponse(job)),
      pagination: {
        total,
        page: currentPage,
        limit: validatedQuery.limit,
        offset: validatedQuery.offset,
        totalPages
      }
    }
  } catch (error) {
    if (import.meta.dev) {
      consola.error('GET /api/jobs - Error:', error)
    }

    // Handle validation errors
    if (error && typeof error === 'object' && 'issues' in error) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Invalid query parameters',
        data: error.issues
      })
    }

    // Re-throw if already an H3Error
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to list jobs'
    })
  }
})

