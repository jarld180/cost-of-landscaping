/**
 * POST /api/jobs/[id]/execute
 *
 * Internal worker endpoint called by pg_cron to execute a job.
 * This endpoint is NOT protected by admin auth - it uses a shared secret instead.
 *
 * Security:
 * - Validates X-Job-Runner-Secret header using constant-time comparison
 * - Only executes jobs that are in 'processing' status (set by pg_cron SQL function)
 * - Rate limited to prevent DOS attacks
 *
 * @returns {Object} Job execution result
 */

import { timingSafeEqual } from 'node:crypto'
import { consola } from 'consola'
import { serverSupabaseServiceRole } from '#supabase/server'
import { JobService } from '../../../services/JobService'
import { applyRateLimit } from '../../../utils/rateLimit'

// Job executors are registered via Nitro plugin (server/plugins/job-executors.ts)

// Rate limit configuration: 10 requests per minute per IP
// This is generous for pg_cron (runs every 15 seconds = 4/min)
// but prevents abuse if the secret is compromised
const RATE_LIMIT_CONFIG = {
  maxRequests: 10,
  windowSeconds: 60,
  keyPrefix: 'job-execute',
} as const

/**
 * Constant-time comparison of two strings
 * Prevents timing attacks by ensuring comparison takes the same time
 * regardless of where the strings differ
 */
function secureCompare(a: string, b: string): boolean {
  // If lengths differ, we still need to do a comparison to avoid timing leak
  // Use the longer length to ensure consistent timing
  const aBuffer = Buffer.from(a, 'utf8')
  const bBuffer = Buffer.from(b, 'utf8')

  // If lengths differ, comparison will fail but we still do constant-time check
  if (aBuffer.length !== bBuffer.length) {
    // Create a buffer of same length to compare against
    // This ensures timing doesn't leak length information
    const paddedBuffer = Buffer.alloc(aBuffer.length)
    timingSafeEqual(aBuffer, paddedBuffer)
    return false
  }

  return timingSafeEqual(aBuffer, bBuffer)
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  try {
    // Apply rate limiting first (before any other processing)
    // This prevents DOS attacks even if the attacker has the secret
    applyRateLimit(event, RATE_LIMIT_CONFIG)

    // Get job ID from route params
    const jobId = getRouterParam(event, 'id')
    if (!jobId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Job ID is required'
      })
    }

    // Validate the job runner secret
    const secretHeader = getHeader(event, 'x-job-runner-secret')
    const expectedSecret = config.jobRunnerSecret

    if (!expectedSecret) {
      consola.error('POST /api/jobs/[id]/execute - jobRunnerSecret not configured')
      throw createError({
        statusCode: 500,
        statusMessage: 'Internal Server Error',
        message: 'Job runner not configured'
      })
    }

    // Use constant-time comparison to prevent timing attacks
    if (!secretHeader || !secureCompare(secretHeader, expectedSecret)) {
      if (import.meta.dev) {
        consola.warn('POST /api/jobs/[id]/execute - Invalid secret', { jobId })
      }
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
        message: 'Invalid job runner secret'
      })
    }

    consola.info(`POST /api/jobs/${jobId}/execute - Executing job`)

    // Use service role client (bypasses RLS) since this is an internal worker
    const client = serverSupabaseServiceRole(event)
    const jobService = new JobService(client)

    // Execute the job
    const result = await jobService.executeJob(jobId)

    consola.success(`POST /api/jobs/${jobId}/execute - Job completed successfully`)

    return {
      success: true,
      data: result
    }
  } catch (error) {
    // Log error but don't expose internal details
    consola.error('POST /api/jobs/[id]/execute - Error:', error)

    // Re-throw if already an H3Error
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    // For execution errors, return 500 but log the details
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: `Job execution failed: ${errorMessage}`
    })
  }
})

