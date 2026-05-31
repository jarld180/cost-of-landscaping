/**
 * GET /api/ai/articles
 *
 * List AI article generation jobs with optional filtering and pagination.
 * Requires admin authentication.
 *
 * Query Parameters:
 * - status: Filter by status (pending, processing, completed, failed, cancelled)
 * - limit: Number of results (default: 20, max: 100)
 * - offset: Offset for pagination (default: 0)
 * - orderBy: Sort field (created_at, updated_at, priority)
 * - orderDirection: Sort direction (asc, desc)
 *
 * @returns {Object} Paginated list of jobs
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { AIJobQueueService } from '../../../services/AIJobQueueService'
import {
  listArticleJobsQuerySchema,
  type ArticleJobResponse,
  type AIArticleJobRow,
} from '../../../schemas/ai.schemas'
import { requireAdmin } from '../../../utils/auth'

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
      consola.info('GET /api/ai/articles - Listing jobs', { userId })
    }

    // Get and validate query parameters
    const query = getQuery(event)
    const validatedQuery = listArticleJobsQuerySchema.parse(query)

    if (import.meta.dev) {
      consola.info('GET /api/ai/articles - Query params:', validatedQuery)
    }

    // Get Supabase client and create service
    const client = await serverSupabaseClient(event)
    const queueService = new AIJobQueueService(client)

    // List jobs
    const { jobs, total } = await queueService.listJobs({
      status: validatedQuery.status,
      limit: validatedQuery.limit,
      offset: validatedQuery.offset,
    })

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / validatedQuery.limit)
    const currentPage = Math.floor(validatedQuery.offset / validatedQuery.limit) + 1

    if (import.meta.dev) {
      consola.success(`GET /api/ai/articles - Returning ${jobs.length} of ${total} jobs`)
    }

    return {
      success: true,
      jobs: jobs.map(toArticleJobResponse),
      total,
      pagination: {
        page: currentPage,
        limit: validatedQuery.limit,
        offset: validatedQuery.offset,
        totalPages,
      },
    }
  } catch (error) {
    if (import.meta.dev) {
      consola.error('GET /api/ai/articles - Error:', error)
    }

    // Handle validation errors
    if (error && typeof error === 'object' && 'issues' in error) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Invalid query parameters',
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
      message: 'Failed to list article jobs',
    })
  }
})

