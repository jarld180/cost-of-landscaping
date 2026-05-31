/**
 * System Log Repository
 *
 * Data access layer for system_logs table.
 * Handles log creation and querying for activity, audit, and error logs.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../app/types/supabase'
import type { SystemLogRow, SystemLogInsert } from '../schemas/job.schemas'

export type LogType = 'activity' | 'audit' | 'error'
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
export type ActorType = 'user' | 'system' | 'job'

export interface LogContext {
  entityType?: string
  entityId?: string
  actorType?: ActorType
  actorId?: string
  metadata?: Record<string, unknown>
}

export interface LogListOptions {
  logType?: LogType
  category?: string
  level?: LogLevel
  entityType?: string
  entityId?: string
  limit?: number
  offset?: number
  includeArchived?: boolean
}

export class SystemLogRepository {
  private client: SupabaseClient<Database>

  constructor(client: SupabaseClient<Database>) {
    this.client = client
  }

  /**
   * Create a log entry
   */
  async create(data: {
    logType: LogType
    category: string
    action: string
    message?: string
    level?: LogLevel
    context?: LogContext
  }): Promise<SystemLogRow> {
    const insertData: SystemLogInsert = {
      log_type: data.logType,
      category: data.category,
      action: data.action,
      message: data.message ?? null,
      level: data.level ?? 'info',
      entity_type: data.context?.entityType ?? null,
      entity_id: data.context?.entityId ?? null,
      actor_type: data.context?.actorType ?? null,
      actor_id: data.context?.actorId ?? null,
      metadata: (data.context?.metadata ?? {}) as SystemLogInsert['metadata'],
    }

    const { data: log, error } = await this.client
      .from('system_logs')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error
    return log
  }

  /**
   * Find logs by entity (e.g., all logs for a specific job)
   */
  async findByEntity(
    entityType: string,
    entityId: string,
    options: { limit?: number, offset?: number } = {}
  ): Promise<SystemLogRow[]> {
    const { limit = 100, offset = 0 } = options

    const { data, error } = await this.client
      .from('system_logs')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error
    return data || []
  }

  /**
   * List logs with filters
   */
  async findAll(options: LogListOptions = {}): Promise<{ logs: SystemLogRow[], total: number }> {
    const {
      logType,
      category,
      level,
      entityType,
      entityId,
      limit = 50,
      offset = 0,
      includeArchived = false,
    } = options

    let query = this.client.from('system_logs').select('*', { count: 'exact' })

    if (logType) query = query.eq('log_type', logType)
    if (category) query = query.eq('category', category)
    if (level) query = query.eq('level', level)
    if (entityType) query = query.eq('entity_type', entityType)
    if (entityId) query = query.eq('entity_id', entityId)
    if (!includeArchived) query = query.is('archived_at', null)

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query
    if (error) throw error

    return { logs: data || [], total: count || 0 }
  }

  /**
   * Find recent error logs
   */
  async findRecentErrors(limit = 20): Promise<SystemLogRow[]> {
    const { data, error } = await this.client
      .from('system_logs')
      .select('*')
      .eq('level', 'error')
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }
}

