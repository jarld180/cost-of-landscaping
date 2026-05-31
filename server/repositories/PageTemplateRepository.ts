/**
 * Page Template Repository
 *
 * Data access layer for page_templates table.
 * Handles all database operations using Supabase client.
 */

import { consola } from 'consola'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../app/types/supabase'
import type { PageTemplate } from '../../app/types/templates'

export class PageTemplateRepository {
  private client: SupabaseClient<Database>

  constructor(client: SupabaseClient<Database>) {
    this.client = client
  }

  /**
   * List all templates (optionally filter by enabled status)
   */
  async list(enabledOnly = true): Promise<PageTemplate[]> {
    if (import.meta.dev) {
      consola.info('[PageTemplateRepository] list() - Fetching templates', { enabledOnly })
    }

    try {
      let query = this.client
        .from('page_templates')
        .select('*')
        .is('deleted_at', null)
        .order('display_order', { ascending: true })

      if (enabledOnly) {
        query = query.eq('is_enabled', true)
      }

      const { data, error } = await query

      if (error) throw error

      if (import.meta.dev) {
        consola.success(`[PageTemplateRepository] list() - Found ${data?.length || 0} templates`)
      }

      return (data || []) as PageTemplate[]
    } catch (error) {
      if (import.meta.dev) {
        consola.error('[PageTemplateRepository] list() - Error:', error)
      }
      throw error
    }
  }

  /**
   * Get template by slug
   */
  async getBySlug(slug: string): Promise<PageTemplate | null> {
    if (import.meta.dev) {
      consola.info('[PageTemplateRepository] getBySlug() - Fetching template', { slug })
    }

    try {
      const { data, error } = await this.client
        .from('page_templates')
        .select('*')
        .eq('slug', slug)
        .is('deleted_at', null)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          if (import.meta.dev) {
            consola.warn(`[PageTemplateRepository] getBySlug() - Template not found: ${slug}`)
          }
          return null
        }
        throw error
      }

      if (import.meta.dev) {
        consola.success(`[PageTemplateRepository] getBySlug() - Found template: ${slug}`)
      }

      return data as PageTemplate
    } catch (error) {
      if (import.meta.dev) {
        consola.error('[PageTemplateRepository] getBySlug() - Error:', error)
      }
      throw error
    }
  }

  /**
   * Get template by ID
   */
  async getById(id: string): Promise<PageTemplate | null> {
    if (import.meta.dev) {
      consola.info('[PageTemplateRepository] getById() - Fetching template', { id })
    }

    try {
      const { data, error } = await this.client
        .from('page_templates')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          if (import.meta.dev) {
            consola.warn(`[PageTemplateRepository] getById() - Template not found: ${id}`)
          }
          return null
        }
        throw error
      }

      if (import.meta.dev) {
        consola.success(`[PageTemplateRepository] getById() - Found template: ${data.slug}`)
      }

      return data as PageTemplate
    } catch (error) {
      if (import.meta.dev) {
        consola.error('[PageTemplateRepository] getById() - Error:', error)
      }
      throw error
    }
  }

  /**
   * Validate that a template slug exists and is enabled
   */
  async validateSlugExists(slug: string): Promise<boolean> {
    if (import.meta.dev) {
      consola.info('[PageTemplateRepository] validateSlugExists() - Validating slug', { slug })
    }

    try {
      const { data, error } = await this.client
        .from('page_templates')
        .select('id')
        .eq('slug', slug)
        .eq('is_enabled', true)
        .is('deleted_at', null)
        .maybeSingle()

      if (error) throw error

      const exists = data !== null

      if (import.meta.dev) {
        consola.success(`[PageTemplateRepository] validateSlugExists() - Slug ${slug}: ${exists ? 'valid' : 'invalid'}`)
      }

      return exists
    } catch (error) {
      if (import.meta.dev) {
        consola.error('[PageTemplateRepository] validateSlugExists() - Error:', error)
      }
      throw error
    }
  }
}

