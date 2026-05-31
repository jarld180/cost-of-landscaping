/**
 * GET /api/templates/[slug]/schema
 *
 * Get the JSON Schema for a specific template's metadata from the database.
 *
 * @param {string} slug - Template slug (hub, spoke, sub-spoke, article, custom, default, or custom template)
 * @returns {Object} Template metadata schema
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { PageTemplateService } from '../../../services/PageTemplateService'

export default defineEventHandler(async (event) => {
  try {
    // Get template slug from route params
    const slug = getRouterParam(event, 'slug')

    if (import.meta.dev) {
      consola.info(`GET /api/templates/${slug}/schema - Fetching schema from database`)
    }

    if (!slug) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Template slug is required'
      })
    }

    const client = await serverSupabaseClient(event)
    const templateService = new PageTemplateService(client)

    const schemaData = await templateService.getTemplateSchema(slug)

    if (!schemaData) {
      if (import.meta.dev) {
        consola.warn(`GET /api/templates/${slug}/schema - Template not found`)
      }

      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: `Template '${slug}' not found`
      })
    }

    if (import.meta.dev) {
      consola.success(`GET /api/templates/${slug}/schema - Returning schema`)
    }

    return {
      success: true,
      data: schemaData
    }
  } catch (error) {
    if (import.meta.dev) {
      consola.error('GET /api/templates/[slug]/schema - Error:', error)
    }

    // Re-throw if already an H3Error
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to fetch template schema'
    })
  }
})

