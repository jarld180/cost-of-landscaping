/**
 * POST /api/jobs
 *
 * Create a new background job.
 * Requires admin authentication.
 *
 * Request Body:
 * - jobType: Type of job to create (e.g., 'image_enrichment')
 * - payload: Job-specific configuration (optional)
 *
 * @returns {Object} Created job data
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { JobService } from '../../services/JobService'
import { createJobSchema, type JobType, type JobPayload } from '../../schemas/job.schemas'
import { requireAdmin } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  try {
    // Require admin authentication
    const userId = await requireAdmin(event)

    if (import.meta.dev) {
      consola.info('POST /api/jobs - Creating new job', { userId })
    }

    // Get and validate request body
    const body = await readBody(event)

    if (import.meta.dev) {
      consola.info('POST /api/jobs - Raw body:', JSON.stringify(body, null, 2))
    }

    const validatedData = createJobSchema.parse(body)

    if (import.meta.dev) {
      consola.info('POST /api/jobs - Validated data:', {
        jobType: validatedData.jobType,
        payload: validatedData.payload
      })
    }

    // Get Supabase client and create service
    const client = await serverSupabaseClient(event)
    const jobService = new JobService(client)

    // Create job using service
    const job = await jobService.createJob(
      validatedData.jobType as JobType,
      validatedData.payload as JobPayload,
      userId
    )

    if (import.meta.dev) {
      consola.success('POST /api/jobs - Job created:', {
        id: job.id,
        jobType: job.job_type,
        status: job.status
      })
    }

    return {
      success: true,
      data: JobService.toResponse(job),
      message: 'Job queued successfully'
    }
  } catch (error) {
    if (import.meta.dev) {
      consola.error('POST /api/jobs - Error:', error)
    }

    // Handle validation errors
    if (error && typeof error === 'object' && 'issues' in error) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Invalid request data',
        data: error.issues
      })
    }

    // Handle business logic errors (already queued, etc.)
    if (error instanceof Error) {
      if (error.message.includes('already processing') || error.message.includes('already queued')) {
        throw createError({
          statusCode: 409,
          statusMessage: 'Conflict',
          message: error.message
        })
      }
    }

    // Re-throw if already an H3Error
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to create job'
    })
  }
})

