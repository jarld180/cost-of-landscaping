/**
 * AI Article Job Repository
 *
 * Data access layer for ai_article_jobs table.
 * Handles CRUD operations, status transitions, and progress tracking for article generation jobs.
 */

import { consola } from 'consola'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../app/types/supabase'
import {
  DEFAULT_MAX_ITERATIONS,
  type AIArticleJobRow,
  type AIArticleJobInsert,
  type AIArticleJobUpdate,
  type AIJobStatus,
  type AIAgentType,
  type AIArticleJobSettings,
} from '../schemas/ai.schemas'

export interface ArticleJobListOptions {
  status?: AIJobStatus | AIJobStatus[]
  limit?: number
  offset?: number
  orderBy?: 'created_at' | 'updated_at' | 'priority'
  orderDirection?: 'asc' | 'desc'
}

export interface ArticleJobProgressUpdate {
  progressPercent?: number
  currentAgent?: AIAgentType | null
  currentIteration?: number
  totalTokensUsed?: number
  estimatedCostUsd?: number
}

export class AIArticleJobRepository {
  private client: SupabaseClient<Database>

  constructor(client: SupabaseClient<Database>) {
    this.client = client
  }

  /**
   * Create a new article job
   */
  async create(data: {
    keyword: string
    settings?: AIArticleJobSettings
    priority?: number
    createdBy?: string
  }): Promise<AIArticleJobRow> {
    consola.debug(`Creating AI article job for keyword: ${data.keyword}`)

    const insertData: AIArticleJobInsert = {
      keyword: data.keyword,
      settings: data.settings as AIArticleJobInsert['settings'],
      priority: data.priority ?? 0,
      created_by: data.createdBy ?? null,
      status: 'pending',
      progress_percent: 0,
      current_iteration: 1,
      max_iterations: data.settings?.maxIterations ?? DEFAULT_MAX_ITERATIONS,
    }

    const { data: job, error } = await this.client
      .from('ai_article_jobs')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      consola.error('Failed to create AI article job:', error)
      throw error
    }

    return job
  }

  /**
   * Find job by ID
   */
  async findById(id: string): Promise<AIArticleJobRow | null> {
    const { data, error } = await this.client
      .from('ai_article_jobs')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  }

  /**
   * List jobs with filters and pagination
   */
  async findAll(options: ArticleJobListOptions = {}): Promise<{ jobs: AIArticleJobRow[], total: number }> {
    const {
      status,
      limit = 50,
      offset = 0,
      orderBy = 'created_at',
      orderDirection = 'desc',
    } = options

    let query = this.client.from('ai_article_jobs').select('*', { count: 'exact' })

    if (status) {
      if (Array.isArray(status)) {
        query = query.in('status', status)
      } else {
        query = query.eq('status', status)
      }
    }

    query = query
      .order(orderBy, { ascending: orderDirection === 'asc' })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query
    if (error) throw error

    return { jobs: data || [], total: count || 0 }
  }

  /**
   * Find next pending job (priority queue)
   */
  async findNextPending(): Promise<AIArticleJobRow | null> {
    const { data, error } = await this.client
      .from('ai_article_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  }

  /**
   * Count active jobs (pending or processing)
   */
  async countActive(): Promise<number> {
    const { count, error } = await this.client
      .from('ai_article_jobs')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'processing'])

    if (error) throw error
    return count || 0
  }

  /**
   * Count processing jobs
   */
  async countProcessing(): Promise<number> {
    const { count, error } = await this.client
      .from('ai_article_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'processing')

    if (error) throw error
    return count || 0
  }

  /**
   * Update job status with optional timestamps
   */
  async setStatus(
    id: string,
    status: AIJobStatus,
    options: { error?: string, startedAt?: boolean, completedAt?: boolean } = {}
  ): Promise<AIArticleJobRow> {
    const updateData: AIArticleJobUpdate = { status }

    if (options.error) updateData.last_error = options.error
    if (options.startedAt) updateData.started_at = new Date().toISOString()
    if (options.completedAt) updateData.completed_at = new Date().toISOString()

    const { data, error } = await this.client
      .from('ai_article_jobs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Update job progress
   */
  async updateProgress(id: string, progress: ArticleJobProgressUpdate): Promise<AIArticleJobRow> {
    const updateData: AIArticleJobUpdate = {}

    if (progress.progressPercent !== undefined) updateData.progress_percent = progress.progressPercent
    if (progress.currentAgent !== undefined) updateData.current_agent = progress.currentAgent
    if (progress.currentIteration !== undefined) updateData.current_iteration = progress.currentIteration
    if (progress.totalTokensUsed !== undefined) updateData.total_tokens_used = progress.totalTokensUsed
    if (progress.estimatedCostUsd !== undefined) updateData.estimated_cost_usd = progress.estimatedCostUsd

    const { data, error } = await this.client
      .from('ai_article_jobs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Set final output and complete job
   */
  async setFinalOutput(id: string, finalOutput: unknown, pageId?: string): Promise<AIArticleJobRow> {
    const { data, error } = await this.client
      .from('ai_article_jobs')
      .update({
        final_output: finalOutput as AIArticleJobUpdate['final_output'],
        page_id: pageId ?? null,
        status: 'completed',
        progress_percent: 100,
        completed_at: new Date().toISOString(),
        current_agent: null,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Start processing a job (sets status to 'processing' and started_at timestamp)
   */
  async startProcessing(id: string): Promise<AIArticleJobRow> {
    return this.setStatus(id, 'processing', { startedAt: true })
  }

  /**
   * Update job status (alias for setStatus for convenience)
   */
  async updateStatus(id: string, status: AIJobStatus): Promise<AIArticleJobRow> {
    const options: { startedAt?: boolean; completedAt?: boolean } = {}
    if (status === 'processing') options.startedAt = true
    if (status === 'completed' || status === 'failed' || status === 'cancelled') options.completedAt = true
    return this.setStatus(id, status, options)
  }

  /**
   * Set the page ID for a completed job
   */
  async setPageId(id: string, pageId: string): Promise<AIArticleJobRow> {
    const { data, error } = await this.client
      .from('ai_article_jobs')
      .update({ page_id: pageId })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Set the last error for a job
   */
  async setError(id: string, errorMessage: string): Promise<AIArticleJobRow> {
    const { data, error } = await this.client
      .from('ai_article_jobs')
      .update({ last_error: errorMessage })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Cancel a job
   */
  async cancel(id: string): Promise<AIArticleJobRow> {
    const { data, error } = await this.client
      .from('ai_article_jobs')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
        current_agent: null,
      })
      .eq('id', id)
      .in('status', ['pending', 'processing'])
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Check if a job has been cancelled
   * Used by orchestrator to check for cancellation between agent executions
   */
  async isCancelled(id: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('ai_article_jobs')
      .select('status')
      .eq('id', id)
      .single()

    if (error) {
      // If job not found, treat as not cancelled (will fail elsewhere)
      if (error.code === 'PGRST116') return false
      throw error
    }

    return data?.status === 'cancelled'
  }
}

