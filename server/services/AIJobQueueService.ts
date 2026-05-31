/**
 * AI Job Queue Service
 *
 * Manages the queue and execution of AI article generation jobs.
 * Enforces concurrency limits (max 5 concurrent jobs) and coordinates
 * job pickup, execution, and completion.
 */

import { consola } from 'consola'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../app/types/supabase'
import { AIArticleJobRepository } from '../repositories/AIArticleJobRepository'
import { AIJobStepRepository } from '../repositories/AIJobStepRepository'
import { AIPersonaRepository } from '../repositories/AIPersonaRepository'
import { MAX_CONCURRENT_JOBS, type AIArticleJobRow, type AIJobStatus, type AIArticleJobSettings } from '../schemas/ai.schemas'
import { AgentRegistry } from './ai/AgentRegistry'
import { getLLMProvider, type ILLMProvider } from './ai/LLMProvider'
import type { AgentContext, AgentResult } from './ai/AIAgent'

// =====================================================
// SERVICE IMPLEMENTATION
// =====================================================

export class AIJobQueueService {
  private client: SupabaseClient<Database>
  private jobRepository: AIArticleJobRepository
  private stepRepository: AIJobStepRepository
  private personaRepository: AIPersonaRepository
  private activeJobs: Set<string> = new Set()

  constructor(client: SupabaseClient<Database>) {
    this.client = client
    this.jobRepository = new AIArticleJobRepository(client)
    this.stepRepository = new AIJobStepRepository(client)
    this.personaRepository = new AIPersonaRepository(client)
  }

  /**
   * Get current number of active jobs (in-memory tracking)
   */
  get activeJobCount(): number {
    return this.activeJobs.size
  }

  /**
   * Check if we can accept more jobs
   */
  canAcceptJob(): boolean {
    return this.activeJobs.size < MAX_CONCURRENT_JOBS
  }

  /**
   * Get count of active jobs from database
   */
  async getActiveJobCount(): Promise<number> {
    return this.jobRepository.countActive()
  }

  /**
   * Create a new article generation job
   */
  async createJob(data: {
    keyword: string
    settings?: AIArticleJobSettings
    priority?: number
    createdBy?: string
  }): Promise<AIArticleJobRow> {
    const activeCount = await this.getActiveJobCount()
    if (activeCount >= MAX_CONCURRENT_JOBS) {
      consola.warn(`Job queue full: ${activeCount}/${MAX_CONCURRENT_JOBS} active jobs`)
    }

    return this.jobRepository.create({
      keyword: data.keyword,
      settings: data.settings,
      priority: data.priority,
      createdBy: data.createdBy,
    })
  }

  /**
   * Pick up the next pending job for processing
   * Returns null if no jobs available or at capacity
   */
  async pickupNextJob(): Promise<AIArticleJobRow | null> {
    if (!this.canAcceptJob()) {
      consola.debug(`At capacity: ${this.activeJobs.size}/${MAX_CONCURRENT_JOBS} jobs`)
      return null
    }

    const job = await this.jobRepository.findNextPending()
    if (!job) return null

    // Mark as processing
    const updatedJob = await this.jobRepository.startProcessing(job.id)
    this.activeJobs.add(job.id)
    consola.info(`Picked up job ${job.id} for keyword: ${job.keyword}`)

    return updatedJob
  }

  /**
   * Complete a job (success or failure)
   */
  async completeJob(
    jobId: string,
    status: 'completed' | 'failed',
    result?: { pageId?: string; error?: string }
  ): Promise<void> {
    this.activeJobs.delete(jobId)

    if (status === 'completed') {
      await this.jobRepository.updateStatus(jobId, 'completed')
      if (result?.pageId) {
        await this.jobRepository.setPageId(jobId, result.pageId)
      }
      consola.info(`Job ${jobId} completed successfully`)
    } else {
      await this.jobRepository.updateStatus(jobId, 'failed')
      if (result?.error) {
        await this.jobRepository.setError(jobId, result.error)
      }
      consola.error(`Job ${jobId} failed: ${result?.error}`)
    }
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<AIArticleJobRow> {
    this.activeJobs.delete(jobId)
    const job = await this.jobRepository.cancel(jobId)
    consola.info(`Job ${jobId} cancelled`)
    return job
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<AIArticleJobRow | null> {
    return this.jobRepository.findById(jobId)
  }

  /**
   * List jobs with filters
   */
  async listJobs(options: {
    status?: AIJobStatus | AIJobStatus[]
    limit?: number
    offset?: number
  } = {}): Promise<{ jobs: AIArticleJobRow[]; total: number }> {
    return this.jobRepository.findAll(options)
  }

  /**
   * Get default personas for all agent types
   */
  async getDefaultPersonas() {
    return this.personaRepository.findAllDefaults()
  }

  /**
   * Get the LLM provider for a persona
   */
  getLLMProvider(providerType: 'anthropic' | 'openai'): ILLMProvider | undefined {
    return getLLMProvider(providerType)
  }
}

