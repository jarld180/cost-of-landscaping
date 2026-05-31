/**
 * GET /api/ai/articles/[id]/stream
 *
 * Server-Sent Events (SSE) endpoint for real-time AI article job progress.
 * Polls the database and streams updates as agents process the article.
 * Automatically closes when job completes, fails, or is cancelled.
 * Requires admin authentication.
 *
 * Event Types:
 * - progress: Job progress update (agent, percent, iteration)
 * - step:start: Agent step started
 * - step:complete: Agent step completed
 * - complete: Job completed successfully
 * - failed: Job failed
 * - cancelled: Job was cancelled
 * - error: Stream error occurred
 *
 * @returns SSE stream
 */

import { consola } from 'consola'
import { createEventStream } from 'h3'
import { serverSupabaseClient } from '#supabase/server'
import { AIJobQueueService } from '../../../../services/AIJobQueueService'
import { AIJobStepRepository } from '../../../../repositories/AIJobStepRepository'
import { requireAdmin } from '../../../../utils/auth'

const POLL_INTERVAL_MS = 1000

interface ProgressEvent {
  type: 'progress' | 'step:start' | 'step:complete' | 'complete' | 'failed' | 'cancelled'
  jobId: string
  status: string
  progressPercent: number
  currentAgent: string | null
  currentIteration: number
  maxIterations: number
  totalTokensUsed: number
  estimatedCostUsd: number
  stepId?: string
  stepStatus?: string
  timestamp: string
}

export default defineEventHandler(async (event) => {
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
    consola.info('SSE /api/ai/articles/[id]/stream - Connection opened', { userId, jobId })
  }

  // Create SSE event stream
  const eventStream = createEventStream(event)

  // Track if client disconnected
  let isAborted = false
  let lastStepCount = 0
  let lastStepStatuses: Record<string, string> = {} // Track step status changes

  // Handle client disconnect
  eventStream.onClosed(() => {
    isAborted = true
    if (import.meta.dev) {
      consola.info('SSE /api/ai/articles/[id]/stream - Connection closed', { jobId })
    }
  })

  // Start polling in background
  ;(async () => {
    try {
      const client = await serverSupabaseClient(event)
      const queueService = new AIJobQueueService(client)
      const stepRepository = new AIJobStepRepository(client)

      // Verify job exists
      const initialJob = await queueService.getJob(jobId)
      if (!initialJob) {
        await eventStream.push({
          event: 'error',
          data: JSON.stringify({ type: 'error', message: 'Job not found' }),
        })
        await eventStream.close()
        return
      }

      // Poll for updates
      while (!isAborted) {
        try {
          const job = await queueService.getJob(jobId)
          if (!job) {
            await eventStream.push({
              event: 'error',
              data: JSON.stringify({ type: 'error', message: 'Job not found' }),
            })
            break
          }

          // Check for new steps and step status changes
          const steps = await stepRepository.findByJobId(jobId)

          // Check for status changes on existing steps (e.g., running -> completed)
          for (const step of steps) {
            const prevStatus = lastStepStatuses[step.id]
            const currStatus = step.status

            // Emit step:complete when a step transitions to a terminal status
            if (prevStatus && prevStatus !== currStatus && ['completed', 'failed'].includes(currStatus)) {
              await eventStream.push({
                event: 'step:complete',
                data: JSON.stringify({
                  type: 'step:complete',
                  jobId,
                  stepId: step.id,
                  agentType: step.agent_type,
                  stepStatus: step.status,
                  iteration: step.iteration,
                  timestamp: new Date().toISOString(),
                }),
              })
            }

            // Track current status
            lastStepStatuses[step.id] = currStatus
          }

          // Emit events for new steps
          if (steps.length > lastStepCount) {
            for (let i = lastStepCount; i < steps.length; i++) {
              const step = steps[i]
              const stepEvent = step.status === 'running' ? 'step:start' : 'step:complete'
              await eventStream.push({
                event: stepEvent,
                data: JSON.stringify({
                  type: stepEvent,
                  jobId,
                  stepId: step.id,
                  agentType: step.agent_type,
                  stepStatus: step.status,
                  iteration: step.iteration,
                  timestamp: new Date().toISOString(),
                }),
              })
              // Track new step status
              lastStepStatuses[step.id] = step.status
            }
            lastStepCount = steps.length
          }

          // Build progress event
          const progressEvent: ProgressEvent = {
            type: 'progress',
            jobId: job.id,
            status: job.status,
            progressPercent: job.progress_percent ?? 0,
            currentAgent: job.current_agent,
            currentIteration: job.current_iteration ?? 1,
            maxIterations: job.max_iterations ?? 3,
            totalTokensUsed: job.total_tokens_used ?? 0,
            estimatedCostUsd: Number(job.estimated_cost_usd) || 0,
            timestamp: new Date().toISOString(),
          }

          // Determine event type based on status
          const terminalStatuses = ['completed', 'failed', 'cancelled']
          if (terminalStatuses.includes(job.status)) {
            progressEvent.type = job.status as ProgressEvent['type']
            await eventStream.push({
              event: job.status,
              data: JSON.stringify(progressEvent),
            })
            break
          }

          // Send progress update
          await eventStream.push({
            event: 'progress',
            data: JSON.stringify(progressEvent),
          })

          // Wait before next poll
          await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
        } catch (pollError) {
          consola.error('SSE poll error:', pollError)
          if (!isAborted) {
            await eventStream.push({
              event: 'error',
              data: JSON.stringify({ type: 'error', message: 'Poll error' }),
            })
          }
          break
        }
      }

      // Close stream
      if (!isAborted) {
        await eventStream.close()
      }
    } catch (error) {
      consola.error('SSE /api/ai/articles/[id]/stream - Error:', error)
      if (!isAborted) {
        try {
          await eventStream.push({
            event: 'error',
            data: JSON.stringify({
              type: 'error',
              message: error instanceof Error ? error.message : 'Unknown error',
            }),
          })
        } catch {
          // Ignore - stream may be closed
        }
        await eventStream.close()
      }
    }
  })()

  return eventStream.send()
})

