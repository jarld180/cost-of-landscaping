/**
 * GET /api/jobs/[id]/stream
 *
 * Server-Sent Events (SSE) endpoint for real-time job progress updates.
 * Polls the database every 500ms and streams progress to the client.
 * Automatically closes when job completes, fails, or is cancelled.
 * Requires admin authentication.
 *
 * Event Types:
 * - progress: Job progress update
 * - complete: Job completed successfully
 * - failed: Job failed
 * - cancelled: Job was cancelled
 * - error: Stream error occurred
 *
 * @returns SSE stream
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { JobService } from '../../../services/JobService'
import { requireAdmin } from '../../../utils/auth'

const POLL_INTERVAL_MS = 500

export default defineEventHandler(async (event) => {
  // Require admin authentication before starting stream
  const userId = await requireAdmin(event)

  // Get job ID from route params
  const jobId = getRouterParam(event, 'id')
  if (!jobId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Job ID is required'
    })
  }

  if (import.meta.dev) {
    consola.info('GET /api/jobs/[id]/stream - Starting SSE stream', { jobId, userId })
  }

  // Set SSE headers
  setHeader(event, 'Content-Type', 'text/event-stream')
  setHeader(event, 'Cache-Control', 'no-cache')
  setHeader(event, 'Connection', 'keep-alive')

  // Get Supabase client
  const client = await serverSupabaseClient(event)
  const jobService = new JobService(client)

  // Verify job exists
  const initialJob = await jobService.getJob(jobId)
  if (!initialJob) {
    // Send error event and close
    return `event: error\ndata: ${JSON.stringify({ error: 'Job not found' })}\n\n`
  }

  // Create readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      let isRunning = true

      // Helper to send SSE event
      const sendEvent = (eventType: string, data: Record<string, unknown>) => {
        const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(message))
      }

      // Poll for updates
      const poll = async () => {
        while (isRunning) {
          try {
            const progress = await jobService.getJobProgress(jobId)
            
            if (!progress) {
              sendEvent('error', { error: 'Job not found' })
              break
            }

            // Send appropriate event based on status
            switch (progress.status) {
              case 'completed':
                sendEvent('complete', progress)
                isRunning = false
                break
              case 'failed':
                sendEvent('failed', progress)
                isRunning = false
                break
              case 'cancelled':
                sendEvent('cancelled', progress)
                isRunning = false
                break
              default:
                sendEvent('progress', progress)
            }

            if (isRunning) {
              await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
            }
          } catch (error) {
            consola.error('SSE poll error:', error)
            sendEvent('error', { error: 'Failed to fetch job progress' })
            isRunning = false
          }
        }

        controller.close()
      }

      // Start polling
      poll()

      // Handle client disconnect
      event.node.req.on('close', () => {
        if (import.meta.dev) {
          consola.info('GET /api/jobs/[id]/stream - Client disconnected', { jobId })
        }
        isRunning = false
      })
    }
  })

  return sendStream(event, stream)
})

