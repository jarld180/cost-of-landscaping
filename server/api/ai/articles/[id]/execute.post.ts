/**
 * POST /api/ai/articles/[id]/execute
 *
 * Execute an AI article generation job.
 * This triggers the AIOrchestrator to run the full pipeline.
 * Can be called internally after job creation or by a cron job.
 *
 * Requires admin authentication OR internal job runner secret.
 *
 * @returns {Object} Execution result
 */

import { consola } from 'consola'
import { serverSupabaseServiceRole } from '#supabase/server'
import { AIOrchestrator } from '../../../../services/ai/AIOrchestrator'
import { AIArticleJobRepository } from '../../../../repositories/AIArticleJobRepository'
import { AnthropicProvider } from '../../../../services/ai/AnthropicProvider'
import { requireAdmin } from '../../../../utils/auth'

// Vercel Pro with Fluid Compute: max 800s (13+ minutes)
// This allows the full AI pipeline to complete without timeout
export const maxDuration = 800

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const jobId = getRouterParam(event, 'id')

  if (!jobId) {
    throw createError({ statusCode: 400, message: 'Job ID is required' })
  }

  try {
    // Check for internal job runner secret OR require admin auth
    const jobRunnerSecret = getHeader(event, 'X-Job-Runner-Secret')
    const expectedSecret = config.jobRunnerSecret

    if (jobRunnerSecret && expectedSecret && jobRunnerSecret === expectedSecret) {
      // Internal call from cron/scheduler - allowed
      consola.info(`POST /api/ai/articles/${jobId}/execute - Internal execution`)
    } else {
      // Require admin authentication for manual execution
      await requireAdmin(event)
      consola.info(`POST /api/ai/articles/${jobId}/execute - Admin execution`)
    }

    // Use service role client (bypasses RLS)
    const client = serverSupabaseServiceRole(event)
    const jobRepo = new AIArticleJobRepository(client)

    // Fetch the job
    const job = await jobRepo.findById(jobId)
    if (!job) {
      throw createError({ statusCode: 404, message: 'Job not found' })
    }

    // Check job status - only pending or processing jobs can be executed
    if (job.status !== 'pending' && job.status !== 'processing') {
      throw createError({
        statusCode: 400,
        message: `Job cannot be executed (status: ${job.status})`,
      })
    }

    consola.info(`POST /api/ai/articles/${jobId}/execute - Starting orchestrator`)

    // Create LLM provider (Anthropic/Claude) and orchestrator
    const llmProvider = new AnthropicProvider(config.anthropicApiKey, config.heliconeApiKey)
    const orchestrator = new AIOrchestrator(client, llmProvider, {}, {
      openaiApiKey: config.openaiApiKey,
      exaApiKey: config.exaApiKey,
      dataforseoApiKey: config.dataforseoApiKey,
      heliconeApiKey: config.heliconeApiKey,
    })
    const result = await orchestrator.execute(job)

    consola.success(`POST /api/ai/articles/${jobId}/execute - Completed`, {
      success: result.success,
      status: result.job.status,
      totalTokens: result.totalTokens,
    })

    return {
      success: result.success,
      jobId: result.job.id,
      status: result.job.status,
      totalTokensUsed: result.totalTokens,
      iterations: result.iterations,
      cancelled: result.cancelled,
      error: result.error,
    }
  } catch (error) {
    consola.error(`POST /api/ai/articles/${jobId}/execute - Error:`, error)

    // Re-throw if already an H3Error
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to execute job',
    })
  }
})

