/**
 * AI Job Step Repository
 *
 * Data access layer for ai_article_job_steps table.
 * Handles CRUD operations for individual agent execution steps within article jobs.
 */

import { consola } from 'consola'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../app/types/supabase'
import type {
  AIArticleJobStepRow,
  AIArticleJobStepInsert,
  AIArticleJobStepUpdate,
  AIAgentType,
  AIStepStatus,
  PersonaSnapshot,
} from '../schemas/ai.schemas'

export interface StepLogEntry {
  timestamp: string
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  data?: unknown
}

export class AIJobStepRepository {
  private client: SupabaseClient<Database>

  constructor(client: SupabaseClient<Database>) {
    this.client = client
  }

  /**
   * Create a new job step
   */
  async create(data: {
    jobId: string
    agentType: AIAgentType
    personaId?: string
    personaSnapshot?: PersonaSnapshot
    iteration?: number
    input?: unknown
  }): Promise<AIArticleJobStepRow> {
    consola.debug(`Creating job step: ${data.agentType} for job ${data.jobId}`)

    const insertData: AIArticleJobStepInsert = {
      job_id: data.jobId,
      agent_type: data.agentType,
      persona_id: data.personaId ?? null,
      persona_snapshot: (data.personaSnapshot ?? null) as AIArticleJobStepInsert['persona_snapshot'],
      iteration: data.iteration ?? 1,
      input: data.input as AIArticleJobStepInsert['input'],
      status: 'pending',
      logs: [],
    }

    const { data: step, error } = await this.client
      .from('ai_article_job_steps')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      consola.error('Failed to create job step:', error)
      throw error
    }

    return step
  }

  /**
   * Find step by ID
   */
  async findById(id: string): Promise<AIArticleJobStepRow | null> {
    const { data, error } = await this.client
      .from('ai_article_job_steps')
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
   * Find all steps for a job
   */
  async findByJobId(jobId: string): Promise<AIArticleJobStepRow[]> {
    const { data, error } = await this.client
      .from('ai_article_job_steps')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Find latest step for a job and agent type
   */
  async findLatest(jobId: string, agentType: AIAgentType): Promise<AIArticleJobStepRow | null> {
    const { data, error } = await this.client
      .from('ai_article_job_steps')
      .select('*')
      .eq('job_id', jobId)
      .eq('agent_type', agentType)
      .order('iteration', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  }

  /**
   * Start a step (set status to running)
   */
  async start(id: string): Promise<AIArticleJobStepRow> {
    const { data, error } = await this.client
      .from('ai_article_job_steps')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Complete a step with output
   */
  async complete(id: string, data: {
    output: unknown
    tokensUsed?: number
    promptTokens?: number
    completionTokens?: number
  }): Promise<AIArticleJobStepRow> {
    const startedAt = (await this.findById(id))?.started_at
    const now = new Date()
    const durationMs = startedAt ? now.getTime() - new Date(startedAt).getTime() : null

    const { data: step, error } = await this.client
      .from('ai_article_job_steps')
      .update({
        status: 'completed',
        output: data.output as AIArticleJobStepUpdate['output'],
        tokens_used: data.tokensUsed ?? 0,
        prompt_tokens: data.promptTokens ?? 0,
        completion_tokens: data.completionTokens ?? 0,
        duration_ms: durationMs,
        completed_at: now.toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return step
  }

  /**
   * Fail a step with error
   */
  async fail(id: string, errorMessage: string, errorDetails?: unknown): Promise<AIArticleJobStepRow> {
    const startedAt = (await this.findById(id))?.started_at
    const now = new Date()
    const durationMs = startedAt ? now.getTime() - new Date(startedAt).getTime() : null

    const { data: step, error } = await this.client
      .from('ai_article_job_steps')
      .update({
        status: 'failed',
        error_message: errorMessage,
        error_details: errorDetails as AIArticleJobStepUpdate['error_details'],
        duration_ms: durationMs,
        completed_at: now.toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return step
  }

  /**
   * Skip a step
   */
  async skip(id: string): Promise<AIArticleJobStepRow> {
    const { data: step, error } = await this.client
      .from('ai_article_job_steps')
      .update({
        status: 'skipped',
        completed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return step
  }

  /**
   * Append a log entry to a step
   */
  async appendLog(id: string, entry: StepLogEntry): Promise<void> {
    const step = await this.findById(id)
    if (!step) throw new Error('Step not found')

    const logs = Array.isArray(step.logs) ? [...step.logs, entry] : [entry]

    const { error } = await this.client
      .from('ai_article_job_steps')
      .update({ logs: logs as AIArticleJobStepUpdate['logs'] })
      .eq('id', id)

    if (error) throw error
  }
}

