/**
 * DELETE /api/ai/personas/[id]
 *
 * Soft delete an AI persona.
 * Requires admin authentication.
 *
 * @returns {Object} Success message
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { AIPersonaRepository } from '../../../repositories/AIPersonaRepository'
import { requireAdmin } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  try {
    // Require admin authentication
    const userId = await requireAdmin(event)
    const personaId = getRouterParam(event, 'id')

    if (!personaId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Persona ID is required',
      })
    }

    if (import.meta.dev) {
      consola.info('DELETE /api/ai/personas/[id] - Deleting persona', { userId, personaId })
    }

    // Get Supabase client and repository
    const client = await serverSupabaseClient(event)
    const personaRepo = new AIPersonaRepository(client)

    // Check persona exists
    const existing = await personaRepo.findById(personaId)
    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: 'Persona not found',
      })
    }

    // Prevent deletion of default personas
    if (existing.is_default) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Cannot delete default persona. Set another persona as default first.',
      })
    }

    // Soft delete
    await personaRepo.softDelete(personaId)

    if (import.meta.dev) {
      consola.success(`DELETE /api/ai/personas/${personaId} - Persona deleted`)
    }

    return {
      success: true,
      message: 'Persona deleted successfully',
    }
  } catch (error) {
    if (import.meta.dev) {
      consola.error('DELETE /api/ai/personas/[id] - Error:', error)
    }

    // Re-throw H3 errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to delete persona',
    })
  }
})

