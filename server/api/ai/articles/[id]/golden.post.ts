/**
 * POST /api/ai/articles/[id]/golden
 *
 * Mark a completed AI article job as a golden example.
 * Creates golden examples from the job's completed steps.
 * Requires admin authentication.
 *
 * Request Body:
 * - title: Title for the golden example
 * - description: Optional description
 * - tags: Optional array of tags
 *
 * @returns {Object} Created golden examples
 */

import { consola } from 'consola'
import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'
import { AIJobQueueService } from '../../../../services/AIJobQueueService'
import { AIJobStepRepository } from '../../../../repositories/AIJobStepRepository'
import { AIGoldenExampleRepository } from '../../../../repositories/AIGoldenExampleRepository'
import type { AIAgentType } from '../../../../schemas/ai.schemas'
import { requireAdmin } from '../../../../utils/auth'

const createGoldenSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
})

export default defineEventHandler(async (event) => {
  try {
    const userId = await requireAdmin(event)
    const jobId = getRouterParam(event, 'id')

    if (!jobId) {
      throw createError({ statusCode: 400, message: 'Job ID is required' })
    }

    const body = await readBody(event)
    const validated = createGoldenSchema.parse(body)

    if (import.meta.dev) {
      consola.info('POST /api/ai/articles/[id]/golden - Creating golden examples', { jobId, userId })
    }

    const client = await serverSupabaseClient(event)
    const queueService = new AIJobQueueService(client)
    const stepRepo = new AIJobStepRepository(client)
    const goldenRepo = new AIGoldenExampleRepository(client)

    // Verify job exists and is completed
    const job = await queueService.getJob(jobId)
    if (!job) {
      throw createError({ statusCode: 404, message: 'Job not found' })
    }

    if (job.status !== 'completed') {
      throw createError({ statusCode: 400, message: 'Only completed jobs can be marked as golden' })
    }

    // Get completed steps
    const steps = await stepRepo.findByJobId(jobId)
    const completedSteps = steps.filter(s => s.status === 'completed' && s.output)

    if (completedSteps.length === 0) {
      throw createError({ statusCode: 400, message: 'No completed steps found' })
    }

    // Create golden examples for each completed step
    const createdExamples = []
    for (const step of completedSteps) {
      const example = await goldenRepo.create({
        agentType: step.agent_type as AIAgentType,
        title: `${validated.title} - ${step.agent_type}`,
        description: validated.description,
        inputExample: step.input ?? {},
        outputExample: step.output ?? {},
        sourceJobId: jobId,
        sourceStepId: step.id,
        qualityScore: 90, // High quality since manually marked
        tags: validated.tags ?? [job.keyword],
        createdBy: userId,
      })
      createdExamples.push({
        id: example.id,
        agentType: example.agent_type,
        title: example.title,
      })
    }

    if (import.meta.dev) {
      consola.success('POST /api/ai/articles/[id]/golden - Created examples', {
        count: createdExamples.length,
      })
    }

    return {
      success: true,
      examples: createdExamples,
      message: `Created ${createdExamples.length} golden example(s)`,
    }
  } catch (error) {
    if (import.meta.dev) {
      consola.error('POST /api/ai/articles/[id]/golden - Error:', error)
    }

    if (error && typeof error === 'object' && 'issues' in error) {
      throw createError({ statusCode: 400, message: 'Invalid request data' })
    }

    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({ statusCode: 500, message: 'Failed to create golden examples' })
  }
})

