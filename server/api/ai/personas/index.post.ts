/**
 * POST /api/ai/personas
 *
 * Create a new AI persona.
 * Requires admin authentication.
 *
 * Request Body:
 * - agentType: Agent type (research, writer, seo, qa, project_manager)
 * - name: Persona name (required)
 * - description: Optional description
 * - systemPrompt: System prompt text (required)
 * - provider: LLM provider (anthropic, openai)
 * - model: Model name
 * - temperature: Generation temperature (0-2)
 * - maxTokens: Max output tokens
 * - isDefault: Whether this is the default persona for the agent type
 * - isEnabled: Whether the persona is enabled
 *
 * @returns {Object} Created persona
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { AIPersonaRepository } from '../../../repositories/AIPersonaRepository'
import {
  upsertPersonaSchema,
  type PersonaResponse,
  type AIPersonaRow,
  type AIPersonaInsert,
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
      consola.info('POST /api/ai/personas - Creating persona', { userId })
    }

    // Get and validate request body
    const body = await readBody(event)
    const validatedData = upsertPersonaSchema.parse(body)

    if (import.meta.dev) {
      consola.info('POST /api/ai/personas - Validated data:', {
        agentType: validatedData.agentType,
        name: validatedData.name,
      })
    }

    // Get Supabase client and repository
    const client = await serverSupabaseClient(event)
    const personaRepo = new AIPersonaRepository(client)

    // Transform to database format
    const insertData: AIPersonaInsert = {
      agent_type: validatedData.agentType,
      name: validatedData.name,
      description: validatedData.description || null,
      system_prompt: validatedData.systemPrompt,
      provider: validatedData.provider,
      model: validatedData.model,
      temperature: validatedData.temperature,
      max_tokens: validatedData.maxTokens,
      is_default: validatedData.isDefault,
      is_enabled: validatedData.isEnabled,
      metadata: validatedData.metadata || null,
    }

    // Create persona
    const persona = await personaRepo.create(insertData)

    if (import.meta.dev) {
      consola.success('POST /api/ai/personas - Persona created:', {
        id: persona.id,
        name: persona.name,
      })
    }

    return {
      success: true,
      persona: toPersonaResponse(persona),
      message: 'Persona created successfully',
    }
  } catch (error) {
    if (import.meta.dev) {
      consola.error('POST /api/ai/personas - Error:', error)
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
      message: 'Failed to create persona',
    })
  }
})

