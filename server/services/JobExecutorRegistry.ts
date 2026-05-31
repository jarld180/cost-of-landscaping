/**
 * Job Executor Registry
 *
 * Registry pattern for job executors.
 * Each job type registers its executor, and the JobService uses this registry
 * to dispatch jobs to the appropriate executor.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../app/types/supabase'
import type { BackgroundJobRow, JobType, JobResult, JobProgressUpdate } from '../schemas/job.schemas'

/**
 * Progress callback type for updating job progress during execution
 */
export type ProgressCallback = (progress: JobProgressUpdate) => void

/**
 * Interface that all job executors must implement
 */
export interface JobExecutor {
  /**
   * Execute the job
   * @param job - The job row from the database
   * @param client - Supabase client for database operations
   * @param onProgress - Callback to report progress updates
   * @returns The job result
   */
  execute(
    job: BackgroundJobRow,
    client: SupabaseClient<Database>,
    onProgress: ProgressCallback
  ): Promise<JobResult>
}

/**
 * Registry for job executors
 * Singleton pattern - executors register themselves on module load
 */
class JobExecutorRegistryClass {
  private executors: Map<JobType, JobExecutor> = new Map()

  /**
   * Register an executor for a job type
   */
  register(jobType: JobType, executor: JobExecutor): void {
    if (this.executors.has(jobType)) {
      throw new Error(`Executor already registered for job type: ${jobType}`)
    }
    this.executors.set(jobType, executor)
  }

  /**
   * Get an executor for a job type
   */
  get(jobType: JobType): JobExecutor | undefined {
    return this.executors.get(jobType)
  }

  /**
   * Check if an executor is registered for a job type
   */
  has(jobType: JobType): boolean {
    return this.executors.has(jobType)
  }

  /**
   * Get all registered job types
   */
  getRegisteredTypes(): JobType[] {
    return Array.from(this.executors.keys())
  }
}

// Export singleton instance
export const JobExecutorRegistry = new JobExecutorRegistryClass()

