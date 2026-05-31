/**
 * System Log Service
 *
 * Business logic for system logging.
 * Provides convenient methods for logging job events and system activity.
 */

import { consola } from 'consola'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../app/types/supabase'
import { SystemLogRepository, type LogType, type LogLevel, type LogContext } from '../repositories/SystemLogRepository'
import type { SystemLogRow } from '../schemas/job.schemas'

export class SystemLogService {
  private repository: SystemLogRepository

  constructor(client: SupabaseClient<Database>) {
    this.repository = new SystemLogRepository(client)
  }

  /**
   * Create a general log entry
   */
  async log(
    type: LogType,
    category: string,
    action: string,
    message?: string,
    context?: LogContext,
    level: LogLevel = 'info'
  ): Promise<SystemLogRow> {
    try {
      return await this.repository.create({
        logType: type,
        category,
        action,
        message,
        level,
        context,
      })
    } catch (error) {
      // Log to console but don't throw - logging should not break the app
      consola.error('Failed to write system log:', error)
      throw error
    }
  }

  // =====================================================
  // JOB LOGGING HELPERS
  // =====================================================

  /**
   * Log a job event
   */
  async logJobEvent(
    jobId: string,
    action: string,
    message: string,
    metadata?: Record<string, unknown>,
    level: LogLevel = 'info'
  ): Promise<SystemLogRow> {
    return this.log('activity', 'job', action, message, {
      entityType: 'background_job',
      entityId: jobId,
      actorType: 'system',
      metadata,
    }, level)
  }

  /**
   * Log job created
   */
  async logJobCreated(jobId: string, jobType: string, createdBy?: string): Promise<SystemLogRow> {
    return this.log('activity', 'job', 'job_created', `Job ${jobType} created`, {
      entityType: 'background_job',
      entityId: jobId,
      actorType: createdBy ? 'user' : 'system',
      actorId: createdBy,
      metadata: { jobType },
    })
  }

  /**
   * Log job started
   */
  async logJobStarted(jobId: string, jobType: string): Promise<SystemLogRow> {
    return this.logJobEvent(jobId, 'job_started', `Job ${jobType} started processing`, { jobType })
  }

  /**
   * Log job completed
   */
  async logJobCompleted(
    jobId: string,
    jobType: string,
    result: Record<string, unknown>
  ): Promise<SystemLogRow> {
    return this.logJobEvent(jobId, 'job_completed', `Job ${jobType} completed successfully`, {
      jobType,
      result,
    })
  }

  /**
   * Log job failed
   */
  async logJobFailed(
    jobId: string,
    jobType: string,
    error: string,
    willRetry: boolean
  ): Promise<SystemLogRow> {
    return this.logJobEvent(
      jobId,
      'job_failed',
      `Job ${jobType} failed: ${error}${willRetry ? ' (will retry)' : ' (max attempts reached)'}`,
      { jobType, error, willRetry },
      'error'
    )
  }

  /**
   * Log job cancelled
   */
  async logJobCancelled(jobId: string, jobType: string, cancelledBy?: string): Promise<SystemLogRow> {
    return this.log('activity', 'job', 'job_cancelled', `Job ${jobType} cancelled`, {
      entityType: 'background_job',
      entityId: jobId,
      actorType: cancelledBy ? 'user' : 'system',
      actorId: cancelledBy,
      metadata: { jobType },
    })
  }

  /**
   * Log job progress update
   */
  async logJobProgress(
    jobId: string,
    jobType: string,
    processed: number,
    total: number
  ): Promise<SystemLogRow> {
    return this.logJobEvent(jobId, 'job_progress', `Job ${jobType}: ${processed}/${total} items`, {
      jobType,
      processed,
      total,
      percentComplete: total > 0 ? Math.round((processed / total) * 100) : 0,
    })
  }

  // =====================================================
  // QUERY HELPERS
  // =====================================================

  /**
   * Get logs for a specific job
   */
  async getJobLogs(jobId: string): Promise<SystemLogRow[]> {
    return this.repository.findByEntity('background_job', jobId)
  }

  /**
   * Get recent error logs
   */
  async getRecentErrors(limit = 20): Promise<SystemLogRow[]> {
    return this.repository.findRecentErrors(limit)
  }
}

