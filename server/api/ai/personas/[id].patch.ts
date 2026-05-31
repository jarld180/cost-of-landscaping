/**
 * PATCH /api/ai/personas/[id]
 *
 * Update an existing AI persona.
 * Requires admin authentication.
 *
 * Request Body (all fields optional):
 * - name: Persona name
 * - description: Description
 * - systemPrompt: System prompt text
 * - provider: LLM provider
 * - model: Model name
 * - temperature: Generation temperature
 * - maxTokens: Max output tokens
 * - isDefault: Whether this is the default persona
 * - isEnabled: Whether the persona is enabled
 *
 * @returns {Object} Updated persona
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { AIPersonaRepository } from '../../../repositories/AIPersonaRepository'
import {
  upsertPersonaSchema,
  type PersonaResponse,
  type AIPersonaRow,
  type AIPersonaUpdate,
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

// Partial schema for updates (all fields optional except we don't allow changing agentType)
const updatePersonaSchema = upsertPersonaSchema.partial().omit({ agentType: true })

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
      consola.info('PATCH /api/ai/personas/[id] - Updating persona', { userId, personaId })
    }

    // Get and validate request body
    const body = await readBody(event)
    const validatedData = updatePersonaSchema.parse(body)

    if (import.meta.dev) {
      consola.info('PATCH /api/ai/personas/[id] - Validated data:', validatedData)
    }

    // Get Supabase client and repository
    const client = await serverSupabaseClient(event)
    const personaRepo = new AIPersonaRepository(client)

    // Check if persona exists
    const existingPersona = await personaRepo.findById(personaId)
    if (!existingPersona) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: 'Persona not found',
      })
    }

    // Transform to database format (only include provided fields)
    const updateData: AIPersonaUpdate = {}
    if (validatedData.name !== undefined) updateData.name = validatedData.name
    if (validatedData.description !== undefined) updateData.description = validatedData.description
    if (validatedData.systemPrompt !== undefined) updateData.system_prompt = validatedData.systemPrompt
    if (validatedData.provider !== undefined) updateData.provider = validatedData.provider
    if (validatedData.model !== undefined) updateData.model = validatedData.model
    if (validatedData.temperature !== undefined) updateData.temperature = validatedData.temperature
    if (validatedData.maxTokens !== undefined) updateData.max_tokens = validatedData.maxTokens
    if (validatedData.isDefault !== undefined) updateData.is_default = validatedData.isDefault
    if (validatedData.isEnabled !== undefined) updateData.is_enabled = validatedData.isEnabled
    if (validatedData.metadata !== undefined) updateData.metadata = validatedData.metadata

    // Update persona
    const persona = await personaRepo.update(personaId, updateData)

    if (import.meta.dev) {
      consola.success('PATCH /api/ai/personas/[id] - Persona updated:', {
        id: persona.id,
        name: persona.name,
      })
    }

    return {
      success: true,
      persona: toPersonaResponse(persona),
      message: 'Persona updated successfully',
    }
  } catch (error) {
    if (import.meta.dev) {
      consola.error('PATCH /api/ai/personas/[id] - Error:', error)
    }

    // Handle validation errors
    if (error && typeof error === 'object' && 'issues' in error) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Invalid persona data',
      })
    }

    // Re-throw if already an H3Error
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to update persona',
    })
  }
})

