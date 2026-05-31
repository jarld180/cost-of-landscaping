/**
 * GET /api/jobs/stream
 *
 * Server-Sent Events (SSE) endpoint for real-time updates on all active jobs.
 * Polls the database every 1 second and streams updates for any job that changes.
 * Used by the jobs list page for realtime table updates.
 * Requires admin authentication.
 *
 * Event Types:
 * - jobs: Array of all active jobs with current progress
 * - update: Single job status change (complete, failed, cancelled)
 *
 * @returns SSE stream
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { JobService } from '../../services/JobService'
import { requireAdmin } from '../../utils/auth'

const POLL_INTERVAL_MS = 1000

export default defineEventHandler(async (event) => {
  // Require admin authentication before starting stream
  const userId = await requireAdmin(event)

  if (import.meta.dev) {
    consola.info('GET /api/jobs/stream - Starting SSE stream for all active jobs', { userId })
  }

  // Set SSE headers
  setHeader(event, 'Content-Type', 'text/event-stream')
  setHeader(event, 'Cache-Control', 'no-cache')
  setHeader(event, 'Connection', 'keep-alive')

  // Get Supabase client
  const client = await serverSupabaseClient(event)
  const jobService = new JobService(client)

  // Track previous state to detect changes
  let previousJobsMap = new Map<string, { status: string, processedItems: number, failedItems: number }>()

  // Create readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      let isRunning = true

      // Helper to send SSE event
      const sendEvent = (eventType: string, data: unknown) => {
        const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(message))
      }

      // Poll for updates
      const poll = async () => {
        while (isRunning) {
          try {
            // Fetch all active jobs (pending + processing)
            const { jobs: pendingJobs } = await jobService.listJobs({ status: 'pending', limit: 100 })
            const { jobs: processingJobs } = await jobService.listJobs({ status: 'processing', limit: 100 })

            const allActiveJobs = [...pendingJobs, ...processingJobs]
            const currentJobsMap = new Map<string, { status: string, processedItems: number, failedItems: number }>()

            // Build current state map and transform to response format
            const jobsData = allActiveJobs.map(job => {
              currentJobsMap.set(job.id, {
                status: job.status,
                processedItems: job.processed_items,
                failedItems: job.failed_items,
              })
              return JobService.toResponse(job)
            })

            // Check for changes
            let hasChanges = false

            // Check if any job has updated progress
            for (const [id, current] of currentJobsMap) {
              const previous = previousJobsMap.get(id)
              if (!previous ||
                  previous.processedItems !== current.processedItems ||
                  previous.failedItems !== current.failedItems ||
                  previous.status !== current.status) {
                hasChanges = true
                break
              }
            }

            // Check if any job was removed (completed/failed/cancelled)
            const removedJobIds: string[] = []
            for (const id of previousJobsMap.keys()) {
              if (!currentJobsMap.has(id)) {
                removedJobIds.push(id)
                hasChanges = true
              }
            }

            // Check if jobs were added
            if (currentJobsMap.size > previousJobsMap.size) {
              hasChanges = true
            }

            // Send update if there are changes
            if (hasChanges) {
              sendEvent('jobs', {
                jobs: jobsData,
                removedJobIds,
                timestamp: new Date().toISOString()
              })
              previousJobsMap = currentJobsMap
            }

            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
          } catch (error) {
            consola.error('SSE poll error:', error)
            sendEvent('error', { error: 'Failed to fetch jobs' })
            // Continue polling despite errors
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS * 2))
          }
        }

        controller.close()
      }

      // Send initial jobs immediately
      try {
        const { jobs: pendingJobs } = await jobService.listJobs({ status: 'pending', limit: 100 })
        const { jobs: processingJobs } = await jobService.listJobs({ status: 'processing', limit: 100 })
        const allActiveJobs = [...pendingJobs, ...processingJobs]

        const jobsData = allActiveJobs.map(job => {
          previousJobsMap.set(job.id, {
            status: job.status,
            processedItems: job.processed_items,
            failedItems: job.failed_items,
          })
          return JobService.toResponse(job)
        })

        sendEvent('jobs', { jobs: jobsData, timestamp: new Date().toISOString() })
      } catch {
        // Initial fetch failed, poll will retry
      }

      // Start polling
      poll()

      // Handle client disconnect
      event.node.req.on('close', () => {
        if (import.meta.dev) {
          consola.info('GET /api/jobs/stream - Client disconnected')
        }
        isRunning = false
      })
    }
  })

  return sendStream(event, stream)
})

