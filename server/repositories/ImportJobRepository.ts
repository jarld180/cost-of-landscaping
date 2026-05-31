/**
 * Import Job Repository
 *
 * Data access layer for import_jobs table.
 * Handles CRUD operations, progress tracking, and batch import queue management.
 */

import { consola } from 'consola'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../app/types/supabase'
import type { ImportJobStatus, ImportJobRow, ImportJobInsert, ImportJobUpdate, ImportError } from '../schemas/import.schemas'

export interface ImportJobListOptions {
  status?: ImportJobStatus | ImportJobStatus[]
  limit?: number
  offset?: number
  orderBy?: 'created_at' | 'updated_at'
  orderDirection?: 'asc' | 'desc'
}

export interface ProgressUpdate {
  processed_rows?: number
  imported_count?: number
  updated_count?: number
  skipped_count?: number
  skipped_claimed_count?: number
  error_count?: number
  pending_image_count?: number
  reviews_imported_count?: number
}

export class ImportJobRepository {
  private client: SupabaseClient<Database>

  constructor(client: SupabaseClient<Database>) {
    this.client = client
  }

  /**
   * Create a new import job
   */
  async create(data: ImportJobInsert): Promise<ImportJobRow> {
    consola.debug(`Creating import job for file: ${data.filename || 'unknown'}`)

    const { data: job, error } = await this.client
      .from('import_jobs')
      .insert(data)
      .select()
      .single()

    if (error) {
      consola.error('Failed to create import job:', error)
      throw new Error(`Database error: ${error.message}`)
    }

    consola.debug(`Created import job ${job.id}`)
    return job
  }

  /**
   * Find import job by ID
   */
  async findById(id: string): Promise<ImportJobRow | null> {
    const { data, error } = await this.client
      .from('import_jobs')
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
   * List import jobs with filters
   */
  async findAll(options: ImportJobListOptions = {}): Promise<{ jobs: ImportJobRow[], total: number }> {
    const {
      status,
      limit = 50,
      offset = 0,
      orderBy = 'created_at',
      orderDirection = 'desc'
    } = options

    let query = this.client.from('import_jobs').select('*', { count: 'exact' })

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
   * Find pending or processing jobs
   */
  async findActive(): Promise<ImportJobRow[]> {
    const { data, error } = await this.client
      .from('import_jobs')
      .select('*')
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Update job status
   */
  async setStatus(id: string, status: ImportJobStatus, timestamps: { started_at?: string, completed_at?: string } = {}): Promise<ImportJobRow> {
    const updateData: ImportJobUpdate = { status, ...timestamps }

    const { data, error } = await this.client
      .from('import_jobs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Update progress counters (atomic increment-style update)
   */
  async updateProgress(id: string, progress: ProgressUpdate): Promise<ImportJobRow> {
    const { data, error } = await this.client
      .from('import_jobs')
      .update(progress)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Append errors to job (merges with existing errors array)
   */
  async appendErrors(id: string, newErrors: ImportError[]): Promise<ImportJobRow> {
    // Get current job to merge errors
    const job = await this.findById(id)
    if (!job) throw new Error('Import job not found')

    const existingErrors = (job.errors || []) as ImportError[]
    const mergedErrors = [...existingErrors, ...newErrors]

    const { data, error } = await this.client
      .from('import_jobs')
      .update({
        errors: mergedErrors,
        error_count: mergedErrors.length
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

