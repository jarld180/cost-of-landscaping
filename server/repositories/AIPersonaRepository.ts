/**
 * AI Persona Repository
 *
 * Data access layer for ai_personas table.
 * Handles CRUD operations for agent personas with system prompts and model configuration.
 */

import { consola } from 'consola'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../app/types/supabase'
import type {
  AIPersonaRow,
  AIPersonaInsert,
  AIPersonaUpdate,
  AIAgentType,
} from '../schemas/ai.schemas'

export interface PersonaListOptions {
  agentType?: AIAgentType
  isEnabled?: boolean
  includeDeleted?: boolean
  limit?: number
  offset?: number
}

export class AIPersonaRepository {
  private client: SupabaseClient<Database>

  constructor(client: SupabaseClient<Database>) {
    this.client = client
  }

  /**
   * Create a new persona
   */
  async create(data: AIPersonaInsert): Promise<AIPersonaRow> {
    consola.debug(`Creating AI persona: ${data.name} (${data.agent_type})`)

    const { data: persona, error } = await this.client
      .from('ai_personas')
      .insert(data)
      .select()
      .single()

    if (error) {
      consola.error('Failed to create AI persona:', error)
      throw error
    }

    return persona
  }

  /**
   * Find persona by ID
   */
  async findById(id: string): Promise<AIPersonaRow | null> {
    const { data, error } = await this.client
      .from('ai_personas')
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
   * Find default persona for an agent type
   */
  async findDefault(agentType: AIAgentType): Promise<AIPersonaRow | null> {
    const { data, error } = await this.client
      .from('ai_personas')
      .select('*')
      .eq('agent_type', agentType)
      .eq('is_default', true)
      .eq('is_enabled', true)
      .is('deleted_at', null)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  }

  /**
   * Find all default personas (one per agent type)
   */
  async findAllDefaults(): Promise<AIPersonaRow[]> {
    const { data, error } = await this.client
      .from('ai_personas')
      .select('*')
      .eq('is_default', true)
      .eq('is_enabled', true)
      .is('deleted_at', null)
      .order('agent_type')

    if (error) throw error
    return data || []
  }

  /**
   * List personas with filters
   */
  async findAll(options: PersonaListOptions = {}): Promise<{ personas: AIPersonaRow[], total: number }> {
    const { agentType, isEnabled, includeDeleted = false, limit = 50, offset = 0 } = options

    let query = this.client.from('ai_personas').select('*', { count: 'exact' })

    if (!includeDeleted) {
      query = query.is('deleted_at', null)
    }
    if (agentType) {
      query = query.eq('agent_type', agentType)
    }
    if (isEnabled !== undefined) {
      query = query.eq('is_enabled', isEnabled)
    }

    query = query
      .order('agent_type')
      .order('is_default', { ascending: false })
      .order('name')
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query
    if (error) throw error

    return { personas: data || [], total: count || 0 }
  }

  /**
   * Update a persona
   */
  async update(id: string, data: AIPersonaUpdate): Promise<AIPersonaRow> {
    const { data: persona, error } = await this.client
      .from('ai_personas')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return persona
  }

  /**
   * Soft delete a persona
   */
  async softDelete(id: string): Promise<void> {
    const { error } = await this.client
      .from('ai_personas')
      .update({ deleted_at: new Date().toISOString(), is_enabled: false })
      .eq('id', id)

    if (error) throw error
  }
}

