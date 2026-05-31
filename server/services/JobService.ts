/**
 * Job Service
 *
 * Business logic for background job management.
 * Handles job creation, execution, retries, and status management.
 */

import { consola } from 'consola'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../app/types/supabase'
import { JobRepository } from '../repositories/JobRepository'
import { SystemLogService } from './SystemLogService'
import { JobExecutorRegistry } from './JobExecutorRegistry'
import type {
  BackgroundJobRow,
  JobType,
  JobPayload,
  JobResult,
  JobResponse,
} from '../schemas/job.schemas'
import {
  RETRY_DELAYS_MINUTES,
  REVIEWER_IMAGE_RETRY_DELAYS_MINUTES,
  REVIEWER_IMAGE_MAX_RETRIES,
} from '../schemas/job.schemas'

export class JobService {
  private repository: JobRepository
  private logService: SystemLogService
  private client: SupabaseClient<Database>

  constructor(client: SupabaseClient<Database>) {
    this.client = client
    this.repository = new JobRepository(client)
    this.logService = new SystemLogService(client)
  }

  /**
   * Create a new background job
   *
   * Uses database-level unique constraint (idx_one_active_job_per_type) to
   * atomically enforce one active job per type. This prevents race conditions
   * that could occur with application-level checks.
   *
   * Job creation and initial logging are handled atomically via RPC function.
   */
  async createJob(
    jobType: JobType,
    payload: JobPayload,
    createdBy?: string,
    scheduledFor?: Date | string
  ): Promise<BackgroundJobRow> {
    try {
      // Repository uses atomic RPC that creates job + log in one transaction
      const job = await this.repository.create({
        jobType,
        payload,
        createdBy,
        scheduledFor,
      })

      // Log is created atomically by RPC - no separate call needed
      const scheduledMsg = scheduledFor
        ? ` (scheduled for ${scheduledFor instanceof Date ? scheduledFor.toISOString() : scheduledFor})`
        : ''
      consola.info(`Created ${jobType} job: ${job.id}${scheduledMsg}`)

      return job
    } catch (error) {
      // Handle unique constraint violation (PostgreSQL error code 23505)
      if (this.isUniqueConstraintViolation(error)) {
        throw new Error(`A ${jobType} job is already queued or processing. Please wait for it to complete.`)
      }
      throw error
    }
  }

  /**
   * Check if error is a PostgreSQL unique constraint violation
   */
  private isUniqueConstraintViolation(error: unknown): boolean {
    if (error && typeof error === 'object') {
      // Supabase/PostgreSQL error format
      const pgError = error as { code?: string; message?: string }
      // 23505 is PostgreSQL's unique_violation error code
      if (pgError.code === '23505') return true
      // Also check message for constraint name as fallback
      if (pgError.message?.includes('idx_one_active_job_per_type')) return true
    }
    return false
  }

  /**
   * Execute a job (called by pg_cron via API)
   */
  async executeJob(jobId: string): Promise<JobResult> {
    const job = await this.repository.findById(jobId)
    if (!job) {
      throw new Error(`Job ${jobId} not found`)
    }

    if (job.status !== 'processing') {
      throw new Error(`Job ${jobId} is not in processing status (current: ${job.status})`)
    }

    const jobType = job.job_type as JobType
    await this.logService.logJobStarted(jobId, jobType)
    consola.info(`Executing ${jobType} job: ${jobId}`)

    try {
      // Get executor from registry
      const executor = JobExecutorRegistry.get(jobType)
      if (!executor) {
        throw new Error(`No executor registered for job type: ${jobType}`)
      }

      // Execute the job
      const result = await executor.execute(job, this.client, (progress) => {
        // Progress callback - update database
        this.repository.updateProgress(jobId, progress).catch(err => {
          consola.warn(`Failed to update progress for job ${jobId}:`, err)
        })
      })

      // Mark as completed
      await this.repository.setResult(jobId, result)
      await this.logService.logJobCompleted(jobId, jobType, result as Record<string, unknown>)
      consola.info(`Completed ${jobType} job: ${jobId}`)

      // Handle continuous mode - queue next job if needed
      if (result && typeof result === 'object' && 'shouldContinue' in result && result.shouldContinue) {
        await this.queueNextContinuousJob(job)
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      await this.handleJobFailure(job, errorMessage)
      throw error
    }
  }

  /**
   * Calculate retry delay based on attempt number
   *
   * Uses exponential backoff with predefined delays.
   * This method is public for testability.
   *
   * @param attemptNumber - Current attempt number (1-based)
   * @returns Delay in minutes before next retry
   */
  static calculateRetryDelay(attemptNumber: number): number {
    // attemptNumber is 1-based, RETRY_DELAYS_MINUTES is 0-indexed
    const index = Math.max(0, attemptNumber - 1)
    return RETRY_DELAYS_MINUTES[index] ?? RETRY_DELAYS_MINUTES[RETRY_DELAYS_MINUTES.length - 1]
  }

  /**
   * Calculate the next retry timestamp
   *
   * @param attemptNumber - Current attempt number (1-based)
   * @param baseTime - Base time to calculate from (defaults to now)
   * @returns Date of next retry attempt
   */
  static calculateNextRetryAt(attemptNumber: number, baseTime: Date = new Date()): Date {
    const delayMinutes = JobService.calculateRetryDelay(attemptNumber)
    return new Date(baseTime.getTime() + delayMinutes * 60 * 1000)
  }

  /**
   * Handle job failure with retry logic
   */
  private async handleJobFailure(job: BackgroundJobRow, errorMessage: string): Promise<void> {
    const jobType = job.job_type as JobType
    const attempts = job.attempts
    const maxAttempts = job.max_attempts

    if (attempts < maxAttempts) {
      // Calculate next retry time with exponential backoff
      const delayMinutes = JobService.calculateRetryDelay(attempts)
      const nextRetryAt = JobService.calculateNextRetryAt(attempts)

      await this.repository.setStatus(job.id, 'pending', { error: errorMessage })
      await this.repository.incrementAttempts(job.id, nextRetryAt)
      await this.logService.logJobFailed(job.id, jobType, errorMessage, true)

      consola.warn(`Job ${job.id} failed (attempt ${attempts}/${maxAttempts}), retrying in ${delayMinutes} minutes`)
    } else {
      // Max attempts reached - mark as failed
      await this.repository.setStatus(job.id, 'failed', { error: errorMessage, completedAt: true })
      await this.logService.logJobFailed(job.id, jobType, errorMessage, false)

      consola.error(`Job ${job.id} failed permanently after ${maxAttempts} attempts: ${errorMessage}`)
    }
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string, cancelledBy?: string): Promise<BackgroundJobRow> {
    const job = await this.repository.findById(jobId)
    if (!job) {
      throw new Error(`Job ${jobId} not found`)
    }

    if (job.status === 'completed' || job.status === 'cancelled') {
      throw new Error(`Cannot cancel job with status: ${job.status}`)
    }

    const updatedJob = await this.repository.setStatus(jobId, 'cancelled', { completedAt: true })
    await this.logService.logJobCancelled(jobId, job.job_type, cancelledBy)

    consola.info(`Cancelled job: ${jobId}`)
    return updatedJob
  }

  /**
   * Retry a failed job
   * Resets attempts to 0 and increases max_attempts to allow fresh retries
   */
  async retryJob(jobId: string): Promise<BackgroundJobRow> {
    const job = await this.repository.findById(jobId)
    if (!job) {
      throw new Error(`Job ${jobId} not found`)
    }

    if (job.status !== 'failed') {
      throw new Error(`Can only retry failed jobs (current: ${job.status})`)
    }

    // Reset for retry - clear attempts and increase max_attempts
    const updatedJob = await this.repository.resetForRetry(jobId)
    consola.info(`Queued job for retry: ${jobId}`)

    return updatedJob
  }

  /**
   * Queue next job in continuous chain
   * Called when a job with continuous=true completes and has more items to process
   */
  private async queueNextContinuousJob(completedJob: BackgroundJobRow): Promise<void> {
    const jobType = completedJob.job_type as JobType
    const payload = completedJob.payload as JobPayload

    try {
      // Create next job with same payload (continuous flag preserved)
      const nextJob = await this.createJob(jobType, payload, completedJob.created_by || undefined)
      await this.logService.logJobEvent(completedJob.id, 'chain_queued', `Queued next batch: ${nextJob.id}`, {
        nextJobId: nextJob.id,
      })
      consola.info(`Continuous mode: Queued next ${jobType} job: ${nextJob.id}`)
    } catch (error) {
      // If we can't queue the next job (e.g., one already exists), log but don't fail
      const errorMessage = error instanceof Error ? error.message : String(error)
      consola.warn(`Continuous mode: Could not queue next job: ${errorMessage}`)
    }
  }

  /**
   * Get job details
   */
  async getJob(jobId: string): Promise<BackgroundJobRow | null> {
    return this.repository.findById(jobId)
  }

  /**
   * Get job progress
   */
  async getJobProgress(jobId: string): Promise<{
    id: string
    status: string
    totalItems: number | null
    processedItems: number
    failedItems: number
    percentComplete: number
  } | null> {
    const job = await this.repository.findById(jobId)
    if (!job) return null

    const percentComplete = job.total_items && job.total_items > 0
      ? Math.round((job.processed_items / job.total_items) * 100)
      : 0

    return {
      id: job.id,
      status: job.status,
      totalItems: job.total_items,
      processedItems: job.processed_items,
      failedItems: job.failed_items,
      percentComplete,
    }
  }

  /**
   * List jobs with filters
   */
  async listJobs(options: {
    status?: string
    jobType?: JobType
    limit?: number
    offset?: number
  } = {}): Promise<{ jobs: BackgroundJobRow[], total: number }> {
    return this.repository.findAll(options as Parameters<typeof this.repository.findAll>[0])
  }

  /**
   * Transform database row to API response
   */
  static toResponse(job: BackgroundJobRow): JobResponse {
    return {
      id: job.id,
      jobType: job.job_type as JobType,
      status: job.status as JobResponse['status'],
      attempts: job.attempts,
      maxAttempts: job.max_attempts,
      totalItems: job.total_items,
      processedItems: job.processed_items,
      failedItems: job.failed_items,
      payload: job.payload as JobPayload,
      result: job.result as JobResult | null,
      lastError: job.last_error,
      createdAt: job.created_at,
      startedAt: job.started_at,
      completedAt: job.completed_at,
      createdBy: job.created_by,
    }
  }

  /**
   * Calculate the scheduled time for a reviewer image retry job
   * Uses escalating cooldown: 15m → 30m → 1h → 2h
   *
   * @param attemptNumber Current attempt number (1-based)
   * @returns Date for scheduled execution, or null if max retries exceeded
   */
  static calculateReviewerImageRetryTime(attemptNumber: number): Date | null {
    if (attemptNumber > REVIEWER_IMAGE_MAX_RETRIES) {
      return null // Max retries exceeded
    }

    // Get the delay for this attempt (0-indexed from delays array)
    const delayIndex = Math.min(attemptNumber - 1, REVIEWER_IMAGE_RETRY_DELAYS_MINUTES.length - 1)
    const delayMinutes = REVIEWER_IMAGE_RETRY_DELAYS_MINUTES[delayIndex]

    const scheduledTime = new Date()
    scheduledTime.setMinutes(scheduledTime.getMinutes() + delayMinutes)

    return scheduledTime
  }
}
