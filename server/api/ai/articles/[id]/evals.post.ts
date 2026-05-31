/**
 * POST /api/ai/articles/[id]/evals
 *
 * Submit a human evaluation for an AI article job.
 * Requires admin authentication.
 *
 * Request Body:
 * - dimensionScores: { readability, seo, accuracy, engagement, brandVoice } (0-100)
 * - feedback: Optional text feedback
 * - issues: Optional array of issues
 *
 * @returns {Object} Created evaluation
 */

import { consola } from 'consola'
import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'
import { AIEvalRepository } from '../../../../repositories/AIEvalRepository'
import { AIJobQueueService } from '../../../../services/AIJobQueueService'
import { evalDimensionScoresSchema, evalIssueSchema } from '../../../../schemas/ai.schemas'
import { requireAdmin } from '../../../../utils/auth'

const createHumanEvalSchema = z.object({
  dimensionScores: evalDimensionScoresSchema,
  feedback: z.string().max(5000).optional(),
  issues: z.array(evalIssueSchema).max(20).optional(),
})

export default defineEventHandler(async (event) => {
  try {
    const userId = await requireAdmin(event)
    const jobId = getRouterParam(event, 'id')

    if (!jobId) {
      throw createError({ statusCode: 400, message: 'Job ID is required' })
    }

    const body = await readBody(event)
    const validated = createHumanEvalSchema.parse(body)

    if (import.meta.dev) {
      consola.info('POST /api/ai/articles/[id]/evals - Creating human eval', { jobId, userId })
    }

    const client = await serverSupabaseClient(event)
    const queueService = new AIJobQueueService(client)
    const evalRepo = new AIEvalRepository(client)

    // Verify job exists
    const job = await queueService.getJob(jobId)
    if (!job) {
      throw createError({ statusCode: 404, message: 'Job not found' })
    }

    // Calculate overall score as average of dimension scores
    const scores = validated.dimensionScores
    const overallScore = Math.round(
      (scores.readability + scores.seo + scores.accuracy + scores.engagement + scores.brandVoice) / 5
    )

    // Create human evaluation
    const evalRecord = await evalRepo.create({
      jobId,
      evalType: 'human',
      iteration: job.current_iteration ?? 1,
      overallScore,
      dimensionScores: validated.dimensionScores,
      passed: overallScore >= 70,
      issues: validated.issues ?? [],
      feedback: validated.feedback,
    })

    // Update rated_by and rated_at
    await client
      .from('ai_article_evals')
      .update({
        rated_by: userId,
        rated_at: new Date().toISOString(),
      })
      .eq('id', evalRecord.id)

    if (import.meta.dev) {
      consola.success('POST /api/ai/articles/[id]/evals - Eval created', { id: evalRecord.id })
    }

    return {
      success: true,
      eval: {
        id: evalRecord.id,
        evalType: 'human',
        overallScore,
        dimensionScores: validated.dimensionScores,
        passed: overallScore >= 70,
        feedback: validated.feedback,
        issues: validated.issues ?? [],
      },
    }
  } catch (error) {
    if (import.meta.dev) {
      consola.error('POST /api/ai/articles/[id]/evals - Error:', error)
    }

    if (error && typeof error === 'object' && 'issues' in error) {
      throw createError({ statusCode: 400, message: 'Invalid request data' })
    }

    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({ statusCode: 500, message: 'Failed to create evaluation' })
  }
})

