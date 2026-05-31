/**
 * POST /api/jobs/[id]/retry
 *
 * Retry a failed background job.
 * Resets attempts and sets status back to 'pending'.
 * Requires admin authentication.
 *
 * @returns {Object} Retried job data
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
      consola.info('POST /api/jobs/[id]/retry - Retrying job', { jobId, userId })
    }

    // Get Supabase client and create service
    const client = await serverSupabaseClient(event)
    const jobService = new JobService(client)

    // Retry the job
    const job = await jobService.retryJob(jobId)

    if (import.meta.dev) {
      consola.success('POST /api/jobs/[id]/retry - Job queued for retry:', {
        id: job.id,
        status: job.status
      })
    }

    return {
      success: true,
      data: JobService.toResponse(job),
      message: 'Job queued for retry'
    }
  } catch (error) {
    if (import.meta.dev) {
      consola.error('POST /api/jobs/[id]/retry - Error:', error)
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
      if (error.message.includes('Can only retry')) {
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
      message: 'Failed to retry job'
    })
  }
})

