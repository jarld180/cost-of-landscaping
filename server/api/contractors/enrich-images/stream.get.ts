/**
 * GET /api/contractors/enrich-images/stream
 *
 * Server-Sent Events (SSE) endpoint for real-time image enrichment progress.
 *
 * Streams events as contractors and images are processed:
 * - enrichment:start - When batch processing begins
 * - contractor:start - When starting a contractor
 * - image:progress - When downloading/uploading/completing an image
 * - contractor:complete - When a contractor is done
 * - enrichment:complete - When batch is complete
 *
 * Use EventSource on the client to consume this stream.
 */

import { consola } from 'consola'
import { createEventStream } from 'h3'
import { serverSupabaseClient } from '#supabase/server'
import { requireAdmin } from '../../../utils/auth'
import { ImageEnrichmentService, type EnrichmentEvent } from '../../../services/ImageEnrichmentService'

export default defineEventHandler(async (event) => {
  // Require admin authentication
  await requireAdmin(event)

  if (import.meta.dev) {
    consola.info('SSE /api/contractors/enrich-images/stream - Connection opened')
  }

  // Create SSE event stream
  const eventStream = createEventStream(event)

  // Track if client disconnected
  let isAborted = false

  // Handle client disconnect
  eventStream.onClosed(() => {
    isAborted = true
    if (import.meta.dev) {
      consola.info('SSE /api/contractors/enrich-images/stream - Connection closed by client')
    }
  })

  // Start processing in the background
  ;(async () => {
    try {
      const client = await serverSupabaseClient(event)
      const enrichmentService = new ImageEnrichmentService(client)

      // Event callback that pushes to SSE stream
      const onEvent = async (enrichmentEvent: EnrichmentEvent): Promise<void> => {
        if (isAborted) return

        try {
          await eventStream.push({
            event: enrichmentEvent.type,
            data: JSON.stringify(enrichmentEvent),
          })
        } catch (err) {
          // Stream may be closed, that's okay
          if (import.meta.dev) {
            consola.warn('SSE push failed (client may have disconnected):', err)
          }
        }
      }

      // Process with event streaming
      await enrichmentService.processAllPendingImages(10, onEvent)

      // Close the stream when done
      if (!isAborted) {
        await eventStream.close()
      }
    } catch (error) {
      consola.error('SSE /api/contractors/enrich-images/stream - Error:', error)

      // Try to send error event before closing
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
          // Ignore - stream may already be closed
        }
        await eventStream.close()
      }
    }
  })()

  return eventStream.send()
})

