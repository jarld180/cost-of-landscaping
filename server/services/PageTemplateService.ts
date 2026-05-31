/**
 * Page Template Service
 *
 * Business logic layer for template management.
 * Handles template retrieval, validation, and metadata operations.
 */

import { consola } from 'consola'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../app/types/supabase'
import { PageTemplateRepository } from '../repositories/PageTemplateRepository'
import type { PageTemplate, TemplateSlug, TemplateData, TemplateSchemaData } from '../../app/types/templates'

export class PageTemplateService {
  private repository: PageTemplateRepository

  constructor(client: SupabaseClient<Database>) {
    this.repository = new PageTemplateRepository(client)
  }

  /**
   * Get all enabled templates
   */
  async getEnabledTemplates(): Promise<TemplateData[]> {
    if (import.meta.dev) {
      consola.info('[PageTemplateService] getEnabledTemplates() - Fetching enabled templates')
    }

    try {
      const templates = await this.repository.list(true)

      const templateData: TemplateData[] = templates.map(t => ({
        slug: t.slug,
        name: t.name,
        description: t.description,
        componentName: t.component_name,
        color: t.color,
        displayOrder: t.display_order
      }))

      if (import.meta.dev) {
        consola.success(`[PageTemplateService] getEnabledTemplates() - Returning ${templateData.length} templates`)
      }

      return templateData
    } catch (error) {
      if (import.meta.dev) {
        consola.error('[PageTemplateService] getEnabledTemplates() - Error:', error)
      }
      throw error
    }
  }

  /**
   * Get template by slug
   */
  async getTemplateBySlug(slug: TemplateSlug): Promise<PageTemplate | null> {
    if (import.meta.dev) {
      consola.info('[PageTemplateService] getTemplateBySlug() - Fetching template', { slug })
    }

    try {
      const template = await this.repository.getBySlug(slug)

      if (!template) {
        if (import.meta.dev) {
          consola.warn(`[PageTemplateService] getTemplateBySlug() - Template not found: ${slug}`)
        }
        return null
      }

      if (import.meta.dev) {
        consola.success(`[PageTemplateService] getTemplateBySlug() - Found template: ${slug}`)
      }

      return template
    } catch (error) {
      if (import.meta.dev) {
        consola.error('[PageTemplateService] getTemplateBySlug() - Error:', error)
      }
      throw error
    }
  }

  /**
   * Validate that a template slug exists and is enabled
   */
  async validateTemplateSlug(slug: TemplateSlug): Promise<boolean> {
    if (import.meta.dev) {
      consola.info('[PageTemplateService] validateTemplateSlug() - Validating slug', { slug })
    }

    try {
      const isValid = await this.repository.validateSlugExists(slug)

      if (!isValid && import.meta.dev) {
        consola.warn(`[PageTemplateService] validateTemplateSlug() - Invalid template slug: ${slug}`)
      }

      return isValid
    } catch (error) {
      if (import.meta.dev) {
        consola.error('[PageTemplateService] validateTemplateSlug() - Error:', error)
      }
      throw error
    }
  }

  /**
   * Get template schema and default metadata
   */
  async getTemplateSchema(slug: TemplateSlug): Promise<TemplateSchemaData | null> {
    if (import.meta.dev) {
      consola.info('[PageTemplateService] getTemplateSchema() - Fetching schema', { slug })
    }

    try {
      const template = await this.repository.getBySlug(slug)

      if (!template) {
        if (import.meta.dev) {
          consola.warn(`[PageTemplateService] getTemplateSchema() - Template not found: ${slug}`)
        }
        return null
      }

      const schemaData: TemplateSchemaData = {
        slug: template.slug,
        name: template.name,
        description: template.description,
        schema: template.metadata_schema,
        defaultMetadata: template.default_metadata
      }

      if (import.meta.dev) {
        consola.success(`[PageTemplateService] getTemplateSchema() - Returning schema for: ${slug}`)
      }

      return schemaData
    } catch (error) {
      if (import.meta.dev) {
        consola.error('[PageTemplateService] getTemplateSchema() - Error:', error)
      }
      throw error
    }
  }

  /**
   * Get default metadata for a template
   */
  async getTemplateDefaultMetadata(slug: TemplateSlug): Promise<Record<string, any>> {
    const template = await this.repository.getBySlug(slug)
    return template?.default_metadata || {}
  }

  /**
   * Get component name for a template
   */
  async getComponentName(slug: TemplateSlug): Promise<string | null> {
    const template = await this.repository.getBySlug(slug)
    return template?.component_name || null
  }
}

