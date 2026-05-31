/**
 * GET /api/jobs/[id]/logs
 *
 * Get system logs for a specific job.
 * Requires admin authentication.
 *
 * @returns {Object} List of logs for the job
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { SystemLogRepository } from '../../../repositories/SystemLogRepository'
import { requireAdmin } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  try {
    // Require admin authentication
    await requireAdmin(event)

    // Get job ID from route params
    const jobId = getRouterParam(event, 'id')
    if (!jobId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Job ID is required',
      })
    }

    if (import.meta.dev) {
      consola.info(`GET /api/jobs/${jobId}/logs - Fetching logs`)
    }

    // Get Supabase client and create repository
    const client = await serverSupabaseClient(event)
    const logRepository = new SystemLogRepository(client)

    // Get logs for this job (entity_type is 'background_job' as set by SystemLogService)
    const logs = await logRepository.findByEntity('background_job', jobId, { limit: 100 })

    if (import.meta.dev) {
      consola.success(`GET /api/jobs/${jobId}/logs - Returning ${logs.length} logs`)
    }

    return {
      success: true,
      data: logs,
    }
  } catch (error) {
    if (import.meta.dev) {
      consola.error('GET /api/jobs/[id]/logs - Error:', error)
    }

    // Re-throw if already an H3Error
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to fetch job logs',
    })
  }
})

