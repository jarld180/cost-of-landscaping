/**
 * POST /api/ai/articles
 *
 * Create a new AI article generation job.
 * Requires admin authentication.
 *
 * Request Body:
 * - keyword: Target keyword for the article (required)
 * - settings: Optional job settings (autoPost, targetWordCount, etc.)
 * - priority: Optional priority (0-100, higher = processed first)
 *
 * @returns {Object} Created job data
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { AIJobQueueService } from '../../../services/AIJobQueueService'
import {
  createArticleJobSchema,
  type ArticleJobResponse,
  type AIArticleJobRow,
} from '../../../schemas/ai.schemas'
import { requireAdmin } from '../../../utils/auth'
import { sanitizeSecondaryKeywords } from '../../../utils/sanitize'

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

    if (import.meta.dev) {
      consola.info('POST /api/ai/articles - Creating new AI article job', { userId })
    }

     // Get and sanitize request body
     const body = await readBody(event)
     
     // Sanitize secondaryKeywords BEFORE schema validation
     if (body.settings?.secondaryKeywords) {
       body.settings.secondaryKeywords = sanitizeSecondaryKeywords(body.settings.secondaryKeywords)
     }
     
     const validatedData = createArticleJobSchema.parse(body)

    if (import.meta.dev) {
      consola.info('POST /api/ai/articles - Validated data:', {
        keyword: validatedData.keyword,
        priority: validatedData.priority,
      })
    }

    // Get Supabase client and create service
    const client = await serverSupabaseClient(event)
    const queueService = new AIJobQueueService(client)

    // Create job
    const job = await queueService.createJob({
      keyword: validatedData.keyword,
      settings: validatedData.settings,
      priority: validatedData.priority,
      createdBy: userId,
    })

    if (import.meta.dev) {
      consola.success('POST /api/ai/articles - Job created:', {
        id: job.id,
        keyword: job.keyword,
        status: job.status,
      })
    }

    // Fire off execution asynchronously (don't await - let it run in background)
    // In production, this would be triggered by pg_cron instead
    const baseUrl = getRequestURL(event).origin
    $fetch(`${baseUrl}/api/ai/articles/${job.id}/execute`, {
      method: 'POST',
      headers: {
        // Forward auth cookie for the execute request
        cookie: getHeader(event, 'cookie') || '',
      },
    }).catch((err) => {
      consola.error(`POST /api/ai/articles - Failed to trigger execution for job ${job.id}:`, err)
    })

    consola.info(`POST /api/ai/articles - Triggered async execution for job ${job.id}`)

    return {
      success: true,
      job: toArticleJobResponse(job),
      message: 'Article job queued and execution started',
    }
  } catch (error) {
    if (import.meta.dev) {
      consola.error('POST /api/ai/articles - Error:', error)
    }

    // Handle validation errors
    if (error && typeof error === 'object' && 'issues' in error) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Invalid request data',
        data: (error as { issues: unknown }).issues,
      })
    }

    // Re-throw if already an H3Error
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to create article job',
    })
  }
})

