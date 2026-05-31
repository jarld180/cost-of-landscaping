/**
 * GET /api/ai/personas
 *
 * List AI personas with optional filtering.
 * Requires admin authentication.
 *
 * Query Parameters:
 * - agentType: Filter by agent type (research, writer, seo, qa, project_manager)
 * - isEnabled: Filter by enabled status (true/false)
 * - includeDeleted: Include soft-deleted personas (default: false)
 *
 * @returns {Object} List of personas
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { AIPersonaRepository } from '../../../repositories/AIPersonaRepository'
import {
  listPersonasQuerySchema,
  type PersonaResponse,
  type AIPersonaRow,
} from '../../../schemas/ai.schemas'
import { requireAdmin } from '../../../utils/auth'

/** Transform persona row to API response */
function toPersonaResponse(persona: AIPersonaRow): PersonaResponse {
  return {
    id: persona.id,
    agentType: persona.agent_type as PersonaResponse['agentType'],
    name: persona.name,
    description: persona.description,
    systemPrompt: persona.system_prompt,
    provider: persona.provider as PersonaResponse['provider'],
    model: persona.model,
    temperature: persona.temperature,
    maxTokens: persona.max_tokens,
    isDefault: persona.is_default,
    isEnabled: persona.is_enabled,
    createdAt: persona.created_at,
    updatedAt: persona.updated_at,
  }
}

export default defineEventHandler(async (event) => {
  try {
    // Require admin authentication
    const userId = await requireAdmin(event)

    if (import.meta.dev) {
      consola.info('GET /api/ai/personas - Listing personas', { userId })
    }

    // Get and validate query parameters
    const query = getQuery(event)
    const validatedQuery = listPersonasQuerySchema.parse(query)

    if (import.meta.dev) {
      consola.info('GET /api/ai/personas - Query params:', validatedQuery)
    }

    // Get Supabase client and repository
    const client = await serverSupabaseClient(event)
    const personaRepo = new AIPersonaRepository(client)

    // List personas
    const { personas, total } = await personaRepo.findAll({
      agentType: validatedQuery.agentType,
      isEnabled: validatedQuery.isEnabled,
      includeDeleted: validatedQuery.includeDeleted,
    })

    if (import.meta.dev) {
      consola.success(`GET /api/ai/personas - Returning ${personas.length} personas`)
    }

    return {
      success: true,
      personas: personas.map(toPersonaResponse),
      total,
    }
  } catch (error) {
    if (import.meta.dev) {
      consola.error('GET /api/ai/personas - Error:', error)
    }

    // Handle validation errors
    if (error && typeof error === 'object' && 'issues' in error) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Invalid query parameters',
      })
    }

    // Re-throw if already an H3Error
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to list personas',
    })
  }
})

