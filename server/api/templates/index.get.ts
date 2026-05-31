/**
 * GET /api/templates
 *
 * List all enabled page templates from the database.
 *
 * @returns {Object} List of templates with metadata
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { PageTemplateService } from '../../services/PageTemplateService'

export default defineEventHandler(async (event) => {
  try {
    if (import.meta.dev) {
      consola.info('GET /api/templates - Fetching all enabled templates from database')
    }

    const client = await serverSupabaseClient(event)
    const templateService = new PageTemplateService(client)

    const templates = await templateService.getEnabledTemplates()

    if (import.meta.dev) {
      consola.success(`GET /api/templates - Returning ${templates.length} templates`)
    }

    return {
      success: true,
      data: templates,
      total: templates.length
    }
  } catch (error) {
    if (import.meta.dev) {
      consola.error('GET /api/templates - Error:', error)
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to fetch templates'
    })
  }
})

