/**
 * GET /api/jobs/[id]
 *
 * Get detailed information about a specific background job.
 * Includes recent system logs for this job.
 * Requires admin authentication.
 *
 * @returns {Object} Job details with logs
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { JobService } from '../../services/JobService'
import { SystemLogService } from '../../services/SystemLogService'
import { requireAdmin } from '../../utils/auth'

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
      consola.info('GET /api/jobs/[id] - Fetching job', { jobId, userId })
    }

    // Get Supabase client and create services
    const client = await serverSupabaseClient(event)
    const jobService = new JobService(client)
    const logService = new SystemLogService(client)

    // Get job details
    const job = await jobService.getJob(jobId)
    if (!job) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: 'Job not found'
      })
    }

    // Get recent logs for this job
    const logs = await logService.getJobLogs(jobId)

    if (import.meta.dev) {
      consola.success('GET /api/jobs/[id] - Returning job:', {
        id: job.id,
        status: job.status,
        logsCount: logs.length
      })
    }

    return {
      success: true,
      data: {
        ...JobService.toResponse(job),
        logs: logs.map(log => ({
          id: log.id,
          action: log.action,
          message: log.message,
          level: log.level,
          createdAt: log.created_at,
          metadata: log.metadata
        }))
      }
    }
  } catch (error) {
    if (import.meta.dev) {
      consola.error('GET /api/jobs/[id] - Error:', error)
    }

    // Re-throw if already an H3Error
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to fetch job'
    })
  }
})

