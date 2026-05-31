/**
 * POST /api/jobs/[id]/cancel
 *
 * Cancel a pending background job.
 * Only works for jobs with 'pending' status.
 * Requires admin authentication.
 *
 * @returns {Object} Cancelled job data
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { JobService } from '../../../services/JobService'
import { requireAdmin } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  try {
    // Require admin authentication
    const userId = await requireAdmin(event)

    // Get job ID from route params
    const jobId = getRouterParam(event, 'id')
    if (!jobId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Job ID is required'
      })
    }

    if (import.meta.dev) {
      consola.info('POST /api/jobs/[id]/cancel - Cancelling job', { jobId, userId })
    }

    // Get Supabase client and create service
    const client = await serverSupabaseClient(event)
    const jobService = new JobService(client)

    // Cancel the job
    const job = await jobService.cancelJob(jobId, userId)

    if (import.meta.dev) {
      consola.success('POST /api/jobs/[id]/cancel - Job cancelled:', {
        id: job.id,
        status: job.status
      })
    }

    return {
      success: true,
      data: JobService.toResponse(job),
      message: 'Job cancelled successfully'
    }
  } catch (error) {
    if (import.meta.dev) {
      consola.error('POST /api/jobs/[id]/cancel - Error:', error)
    }

    // Handle business logic errors
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Not Found',
          message: error.message
        })
      }
      if (error.message.includes('Cannot cancel')) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Bad Request',
          message: error.message
        })
      }
    }

    // Re-throw if already an H3Error
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to cancel job'
    })
  }
})

