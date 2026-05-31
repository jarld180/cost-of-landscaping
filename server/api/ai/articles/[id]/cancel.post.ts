/**
 * POST /api/ai/articles/[id]/cancel
 *
 * Cancel an AI article generation job.
 * Only pending or processing jobs can be cancelled.
 * Requires admin authentication.
 *
 * @returns {Object} Updated job data
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { AIJobQueueService } from '../../../../services/AIJobQueueService'
import {
  type ArticleJobResponse,
  type AIArticleJobRow,
} from '../../../../schemas/ai.schemas'
import { requireAdmin } from '../../../../utils/auth'

/** Transform database row to API response */
function toArticleJobResponse(job: AIArticleJobRow): ArticleJobResponse {
  return {
    id: job.id,
    keyword: job.keyword,
    status: job.status as ArticleJobResponse['status'],
    currentAgent: job.current_agent as ArticleJobResponse['currentAgent'],
    progressPercent: job.progress_percent ?? 0,
    currentIteration: job.current_iteration ?? 1,
    maxIterations: job.max_iterations ?? 3,
    totalTokensUsed: job.total_tokens_used ?? 0,
    estimatedCostUsd: Number(job.estimated_cost_usd) || 0,
    priority: job.priority ?? 0,
    settings: (job.settings ?? {}) as ArticleJobResponse['settings'],
    pageId: job.page_id,
    lastError: job.last_error,
    createdAt: job.created_at,
    startedAt: job.started_at,
    completedAt: job.completed_at,
    createdBy: job.created_by,
  }
}

export default defineEventHandler(async (event) => {
  try {
    // Require admin authentication
    const userId = await requireAdmin(event)
    const jobId = getRouterParam(event, 'id')

    if (!jobId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Job ID is required',
      })
    }

    if (import.meta.dev) {
      consola.info('POST /api/ai/articles/[id]/cancel - Cancelling job', { userId, jobId })
    }

    // Get Supabase client and service
    const client = await serverSupabaseClient(event)
    const queueService = new AIJobQueueService(client)

    // Get job first to check if it exists and can be cancelled
    const existingJob = await queueService.getJob(jobId)
    if (!existingJob) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: 'Job not found',
      })
    }

    // Check if job can be cancelled
    if (existingJob.status === 'completed' || existingJob.status === 'cancelled') {
      throw createError({
        statusCode: 409,
        statusMessage: 'Conflict',
        message: `Cannot cancel job with status: ${existingJob.status}`,
      })
    }

    // Cancel the job
    const job = await queueService.cancelJob(jobId)

    if (import.meta.dev) {
      consola.success('POST /api/ai/articles/[id]/cancel - Job cancelled:', {
        id: job.id,
        status: job.status,
      })
    }

    return {
      success: true,
      job: toArticleJobResponse(job),
      message: 'Job cancelled successfully',
    }
  } catch (error) {
    if (import.meta.dev) {
      consola.error('POST /api/ai/articles/[id]/cancel - Error:', error)
    }

    // Re-throw if already an H3Error
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to cancel job',
    })
  }
})

