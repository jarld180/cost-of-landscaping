/**
 * GET /api/jobs/[id]/children
 *
 * Get child jobs created by a parent job.
 * Links parent jobs (contractor_enrichment, review_enrichment) to their child jobs
 * (stealthy_crawl, reviewer_image_retry) via contractorId matching.
 *
 * Requires admin authentication.
 *
 * @returns {Object} List of child jobs
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { requireAdmin } from '../../../utils/auth'

interface ChildJob {
  id: string
  job_type: string
  status: string
  processed_items: number
  total_items: number | null
  created_at: string
}

export default defineEventHandler(async (event) => {
  try {
    // Require admin authentication
    await requireAdmin(event)

    // Get job ID from route params
    const jobId = getRouterParam(event, 'id')
    if (!jobId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Job ID is required',
      })
    }

    if (import.meta.dev) {
      consola.info(`GET /api/jobs/${jobId}/children - Fetching child jobs`)
    }

    // Get Supabase client
    const client = await serverSupabaseClient(event)

    // Fetch parent job
    const { data: parentJob, error: parentError } = await client
      .from('background_jobs')
      .select('job_type, payload, started_at, created_at')
      .eq('id', jobId)
      .single()

    if (parentError || !parentJob) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: 'Parent job not found',
      })
    }

    // Determine child job type based on parent type
    const childJobTypeMap: Record<string, string> = {
      'contractor_enrichment': 'stealthy_crawl',
      'review_enrichment': 'reviewer_image_retry',
    }

    const childJobType = childJobTypeMap[parentJob.job_type]
    if (!childJobType) {
      // No children for this job type
      return { success: true, data: [] }
    }

    // Extract contractor IDs from parent payload
    const payload = parentJob.payload as Record<string, unknown> | null
    const contractorIds = payload?.contractorIds
    if (!Array.isArray(contractorIds) || contractorIds.length === 0) {
      return { success: true, data: [] }
    }

    // Time window: child must be created after parent started (or created if not started)
    const afterTimestamp = parentJob.started_at ?? parentJob.created_at

    // Query child jobs (one per contractorId, most recent)
    const childJobs: ChildJob[] = []
    for (const contractorId of contractorIds) {
      const { data, error } = await client
        .from('background_jobs')
        .select('id, job_type, status, processed_items, total_items, created_at')
        .eq('job_type', childJobType)
        .eq('payload->>contractorId', contractorId)
        .gte('created_at', afterTimestamp)
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) {
        if (import.meta.dev) {
          consola.warn(`Failed to query child jobs for contractorId ${contractorId}:`, error)
        }
        continue
      }

      if (data?.[0]) {
        childJobs.push(data[0] as ChildJob)
      }
    }

    if (import.meta.dev) {
      consola.success(`GET /api/jobs/${jobId}/children - Returning ${childJobs.length} child jobs`)
    }

    return {
      success: true,
      data: childJobs,
    }
  } catch (error) {
    if (import.meta.dev) {
      consola.error('GET /api/jobs/[id]/children - Error:', error)
    }

    // Re-throw if already an H3Error
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to fetch child jobs',
    })
  }
})
