import { consola } from 'consola'
import { serverSupabaseServiceRole } from '#supabase/server'
import { AIOrchestrator } from '../../../../services/ai/AIOrchestrator'
import { AIArticleJobRepository } from '../../../../repositories/AIArticleJobRepository'
import { AnthropicProvider } from '../../../../services/ai/AnthropicProvider'
import {
  type ArticleJobResponse,
  type AIArticleJobRow,
} from '../../../../schemas/ai.schemas'
import { requireAdmin } from '../../../../utils/auth'

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
  const config = useRuntimeConfig()
  const jobId = getRouterParam(event, 'id')

  if (!jobId) {
    throw createError({ statusCode: 400, message: 'Job ID is required' })
  }

  try {
    await requireAdmin(event)
    consola.info(`POST /api/ai/articles/${jobId}/retry - Admin retry request`)

    const client = serverSupabaseServiceRole(event)
    const jobRepo = new AIArticleJobRepository(client)

    const existingJob = await jobRepo.findById(jobId)
    if (!existingJob) {
      throw createError({ statusCode: 404, message: 'Job not found' })
    }

    if (existingJob.status !== 'failed' && existingJob.status !== 'cancelled') {
      throw createError({
        statusCode: 409,
        message: `Cannot retry job with status: ${existingJob.status}. Only failed or cancelled jobs can be retried.`,
      })
    }

    const currentRetryCount = (existingJob as AIArticleJobRow & { retry_count?: number }).retry_count ?? 0

    const { data: updatedJobs, error: updateError } = await client
      .from('ai_article_jobs')
      .update({
        status: 'pending',
        current_agent: null,
        last_error: null,
        current_iteration: 1,
        progress_percent: 0,
        retry_count: currentRetryCount + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .in('status', ['failed', 'cancelled'])
      .select()

    if (updateError) {
      consola.error(`POST /api/ai/articles/${jobId}/retry - Update error:`, updateError)
      throw createError({ statusCode: 500, message: 'Failed to reset job' })
    }

    if (!updatedJobs || updatedJobs.length === 0) {
      throw createError({
        statusCode: 409,
        message: 'Job status changed during retry. Please try again.',
      })
    }

    const job = updatedJobs[0] as AIArticleJobRow
    consola.info(`POST /api/ai/articles/${jobId}/retry - Job reset to pending, starting execution`)

    const llmProvider = new AnthropicProvider(config.anthropicApiKey, config.heliconeApiKey)
    const orchestrator = new AIOrchestrator(client, llmProvider, {}, {
      openaiApiKey: config.openaiApiKey,
      exaApiKey: config.exaApiKey,
      dataforseoApiKey: config.dataforseoApiKey,
      heliconeApiKey: config.heliconeApiKey,
    })
    
    const refetchedJob = await jobRepo.findById(jobId)
    if (!refetchedJob) {
      throw createError({ statusCode: 500, message: 'Failed to refetch job after reset' })
    }

    const result = await orchestrator.execute(refetchedJob)

    consola.success(`POST /api/ai/articles/${jobId}/retry - Completed`, {
      success: result.success,
      status: result.job.status,
    })

    return {
      success: result.success,
      job: toArticleJobResponse(result.job),
      message: result.success ? 'Job retried successfully' : 'Job retry failed',
      error: result.error,
    }
  } catch (error) {
    consola.error(`POST /api/ai/articles/${jobId}/retry - Error:`, error)

    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to retry job',
    })
  }
})
