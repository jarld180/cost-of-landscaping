/**
 * GET /api/ai/articles/[id]
 *
 * Get detailed information about an AI article generation job.
 * Includes steps and evaluations.
 * Requires admin authentication.
 *
 * @returns {Object} Job details with steps and evals
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { AIJobQueueService } from '../../../services/AIJobQueueService'
import { AIJobStepRepository } from '../../../repositories/AIJobStepRepository'
import { AIEvalRepository } from '../../../repositories/AIEvalRepository'
import {
  type ArticleJobDetailResponse,
  type ArticleJobStepResponse,
  type ArticleEvalResponse,
  type AIArticleJobRow,
  type AIArticleJobStepRow,
  type AIArticleEvalRow,
} from '../../../schemas/ai.schemas'
import { requireAdmin } from '../../../utils/auth'

/** Transform job row to API response */
function toArticleJobResponse(job: AIArticleJobRow): ArticleJobDetailResponse {
  return {
    id: job.id,
    keyword: job.keyword,
    status: job.status as ArticleJobDetailResponse['status'],
    currentAgent: job.current_agent as ArticleJobDetailResponse['currentAgent'],
    progressPercent: job.progress_percent ?? 0,
    currentIteration: job.current_iteration ?? 1,
    maxIterations: job.max_iterations ?? 3,
    totalTokensUsed: job.total_tokens_used ?? 0,
    estimatedCostUsd: Number(job.estimated_cost_usd) || 0,
    priority: job.priority ?? 0,
    settings: (job.settings ?? {}) as ArticleJobDetailResponse['settings'],
    pageId: job.page_id,
    lastError: job.last_error,
    createdAt: job.created_at,
    startedAt: job.started_at,
    completedAt: job.completed_at,
    createdBy: job.created_by,
    steps: [],
    evals: [],
    finalOutput: null,
  }
}

/** Transform step row to API response */
function toStepResponse(step: AIArticleJobStepRow): ArticleJobStepResponse {
  return {
    id: step.id,
    agentType: step.agent_type as ArticleJobStepResponse['agentType'],
    iteration: step.iteration ?? 1,
    status: step.status as ArticleJobStepResponse['status'],
    tokensUsed: step.tokens_used ?? 0,
    promptTokens: step.prompt_tokens ?? 0,
    completionTokens: step.completion_tokens ?? 0,
    durationMs: step.duration_ms,
    input: step.input,
    output: step.output,
    logs: (step.logs ?? []) as unknown[],
    errorMessage: step.error_message,
    startedAt: step.started_at,
    completedAt: step.completed_at,
  }
}

/** Transform eval row to API response */
function toEvalResponse(evalRow: AIArticleEvalRow): ArticleEvalResponse {
  return {
    id: evalRow.id,
    evalType: evalRow.eval_type as ArticleEvalResponse['evalType'],
    iteration: evalRow.iteration ?? 1,
    overallScore: evalRow.overall_score,
    dimensionScores: evalRow.readability_score !== null ? {
      readability: evalRow.readability_score ?? 0,
      seo: evalRow.seo_score ?? 0,
      accuracy: evalRow.accuracy_score ?? 0,
      engagement: evalRow.engagement_score ?? 0,
      brandVoice: evalRow.brand_voice_score ?? 0,
    } : null,
    passed: evalRow.passed,
    issues: (evalRow.issues ?? []) as ArticleEvalResponse['issues'],
    feedback: evalRow.feedback,
    ratedBy: evalRow.rated_by,
    ratedAt: evalRow.rated_at,
    createdAt: evalRow.created_at,
  }
}

export default defineEventHandler(async (event) => {
  try {
    // Require admin authentication
    const userId = await requireAdmin(event)
    const jobId = getRouterParam(event, 'id')

    if (!jobId) {
      throw createError({ statusCode: 400, message: 'Job ID is required' })
    }

    if (import.meta.dev) {
      consola.info('GET /api/ai/articles/[id] - Fetching job details', { userId, jobId })
    }

    // Get Supabase client and services
    const client = await serverSupabaseClient(event)
    const queueService = new AIJobQueueService(client)
    const stepRepository = new AIJobStepRepository(client)
    const evalRepository = new AIEvalRepository(client)

    // Get job
    const job = await queueService.getJob(jobId)
    if (!job) {
      throw createError({ statusCode: 404, message: 'Job not found' })
    }

    // Get steps and evals
    const steps = await stepRepository.findByJobId(jobId)
    const evals = await evalRepository.findByJobId(jobId)

    const personaIds = Array.from(new Set(
      steps.map(step => step.persona_id).filter((id): id is string => !!id)
    ))

    const personaModels = personaIds.length > 0
      ? await client
        .from('ai_personas')
        .select('id, model')
        .in('id', personaIds)
      : { data: [], error: null }

    if (personaModels.error) {
      throw personaModels.error
    }

    const personaModelMap = new Map(
      (personaModels.data ?? []).map(row => [row.id, row.model])
    )

    // Build response
    const response = toArticleJobResponse(job)
    response.steps = steps.map((step) => ({
      ...toStepResponse(step),
      model: step.persona_id ? personaModelMap.get(step.persona_id) ?? null : null,
    }))
    response.evals = evals.map(toEvalResponse)

    // Use final_output from job if available, otherwise fall back to PM step output
    if (job.final_output) {
      response.finalOutput = job.final_output as ArticleJobDetailResponse['finalOutput']
    } else {
      // Legacy fallback: Extract from project_manager step if completed
      const pmStep = steps.find(s => s.agent_type === 'project_manager' && s.status === 'completed')
      if (pmStep?.output) {
        response.finalOutput = pmStep.output as ArticleJobDetailResponse['finalOutput']
      }
    }

    return { success: true, job: response }
  } catch (error) {
    if (import.meta.dev) {
      consola.error('GET /api/ai/articles/[id] - Error:', error)
    }

    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({ statusCode: 500, message: 'Failed to get job details' })
  }
})

