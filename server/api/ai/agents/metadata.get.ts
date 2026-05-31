/**
 * GET /api/ai/agents/metadata
 *
 * Returns metadata for all AI agents in the pipeline.
 * This is a read-only endpoint that provides UI-friendly agent information
 * including labels, icons, colors, and registration status.
 *
 * No authentication required - this is public metadata.
 *
 * @returns {Array} Array of agent metadata objects
 */

import { AgentRegistry } from '../../../services/ai/AgentRegistry'
import { AGENT_PIPELINE_ORDER, AI_AGENT_TYPES } from '../../../schemas/ai.schemas'
import type { AIAgentType } from '../../../schemas/ai.schemas'

export default defineEventHandler(async (event) => {
  const allAgentTypes = [
    ...AGENT_PIPELINE_ORDER,
    ...AI_AGENT_TYPES.filter(type => !AGENT_PIPELINE_ORDER.includes(type)),
  ]

  const agentMetadata = allAgentTypes.map((agentType, index) => {
    const agent = AgentRegistry.get(agentType)
    return {
      agentType,
      label: getAgentLabel(agentType),
      icon: getAgentIcon(agentType),
      color: getAgentColor(agentType),
      order: index,
      isOptional: agentType === 'image_generator',
      isRegistered: !!agent,
    }
  })

  return agentMetadata
})

/**
 * Get human-readable label for agent type
 */
function getAgentLabel(type: AIAgentType): string {
  const labels: Record<AIAgentType, string> = {
    research: 'Research',
    outline: 'Outline',
    writer: 'Writer',
    seo: 'SEO',
    qa: 'QA',
    project_manager: 'Proj. Manager',
    image_generator: 'Image Gen',
  }
  return labels[type] || type
}

/**
 * Get Lucide icon class for agent type
 */
function getAgentIcon(type: AIAgentType): string {
  const icons: Record<AIAgentType, string> = {
    research: 'i-lucide-search',
    outline: 'i-lucide-list-tree',
    writer: 'i-lucide-pen-tool',
    seo: 'i-lucide-target',
    qa: 'i-lucide-check-circle',
    project_manager: 'i-lucide-folder-kanban',
    image_generator: 'i-lucide-image',
  }
  return icons[type] || 'i-lucide-circle'
}

/**
 * Get color hex code for agent type
 */
function getAgentColor(type: AIAgentType): string {
  const colors: Record<AIAgentType, string> = {
    research: '#3b82f6',        // blue-500
    outline: '#8b5cf6',         // violet-500
    writer: '#a855f7',          // purple-500
    seo: '#22c55e',             // green-500
    qa: '#f97316',              // orange-500
    project_manager: '#6366f1', // indigo-500
    image_generator: '#ec4899', // pink-500
  }
  return colors[type] || '#6b7280' // gray-500 fallback
}
