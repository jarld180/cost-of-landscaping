/**
 * AI Golden Example Repository
 *
 * Data access layer for ai_golden_examples table.
 * Handles CRUD operations for high-quality examples used in few-shot learning.
 */

import { consola } from 'consola'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../app/types/supabase'
import type {
  AIGoldenExampleRow,
  AIGoldenExampleInsert,
  AIGoldenExampleUpdate,
  AIAgentType,
} from '../schemas/ai.schemas'

export interface GoldenExampleListOptions {
  agentType?: AIAgentType
  isActive?: boolean
  tags?: string[]
  limit?: number
  offset?: number
}

export class AIGoldenExampleRepository {
  private client: SupabaseClient<Database>

  constructor(client: SupabaseClient<Database>) {
    this.client = client
  }

  /**
   * Create a new golden example
   */
  async create(data: {
    agentType: AIAgentType
    title: string
    description?: string
    inputExample: unknown
    outputExample: unknown
    sourceJobId?: string
    sourceStepId?: string
    qualityScore?: number
    tags?: string[]
    createdBy?: string
  }): Promise<AIGoldenExampleRow> {
    consola.debug(`Creating golden example: ${data.title} (${data.agentType})`)

    const insertData: AIGoldenExampleInsert = {
      agent_type: data.agentType,
      title: data.title,
      description: data.description ?? null,
      input_example: data.inputExample as AIGoldenExampleInsert['input_example'],
      output_example: data.outputExample as AIGoldenExampleInsert['output_example'],
      source_job_id: data.sourceJobId ?? null,
      source_step_id: data.sourceStepId ?? null,
      quality_score: data.qualityScore ?? null,
      tags: data.tags ?? [],
      created_by: data.createdBy ?? null,
      is_active: true,
      usage_count: 0,
    }

    const { data: example, error } = await this.client
      .from('ai_golden_examples')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      consola.error('Failed to create golden example:', error)
      throw error
    }

    return example
  }

  /**
   * Find example by ID
   */
  async findById(id: string): Promise<AIGoldenExampleRow | null> {
    const { data, error } = await this.client
      .from('ai_golden_examples')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  }

  /**
   * Find active examples for an agent type (for few-shot prompts)
   */
  async findForAgent(agentType: AIAgentType, limit: number = 3): Promise<AIGoldenExampleRow[]> {
    const { data, error } = await this.client
      .from('ai_golden_examples')
      .select('*')
      .eq('agent_type', agentType)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('quality_score', { ascending: false, nullsFirst: false })
      .order('usage_count', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }

  /**
   * List examples with filters
   */
  async findAll(options: GoldenExampleListOptions = {}): Promise<{ examples: AIGoldenExampleRow[], total: number }> {
    const { agentType, isActive, tags, limit = 50, offset = 0 } = options

    let query = this.client.from('ai_golden_examples').select('*', { count: 'exact' })
      .is('deleted_at', null)

    if (agentType) query = query.eq('agent_type', agentType)
    if (isActive !== undefined) query = query.eq('is_active', isActive)
    if (tags && tags.length > 0) query = query.overlaps('tags', tags)

    query = query
      .order('quality_score', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query
    if (error) throw error

    return { examples: data || [], total: count || 0 }
  }

  /**
   * Increment usage count
   */
  async incrementUsage(id: string): Promise<void> {
    const example = await this.findById(id)
    if (!example) return

    const { error } = await this.client
      .from('ai_golden_examples')
      .update({
        usage_count: (example.usage_count ?? 0) + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw error
  }

  /**
   * Soft delete an example
   */
  async softDelete(id: string): Promise<void> {
    const { error } = await this.client
      .from('ai_golden_examples')
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq('id', id)

    if (error) throw error
  }
}

