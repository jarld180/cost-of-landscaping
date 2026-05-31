/**
 * AI Agent Registry
 *
 * Singleton registry for AI agents in the article writing pipeline.
 * Enables plugin-style architecture where agents register themselves
 * and can be discovered/executed by the orchestrator.
 *
 * Pattern matches existing JobExecutorRegistry for consistency.
 */

import { consola } from 'consola'
import type { AIAgentType } from '../../schemas/ai.schemas'
import { AGENT_PIPELINE_ORDER } from '../../schemas/ai.schemas'
import type { IAIAgent } from './AIAgent'

// =====================================================
// REGISTRY IMPLEMENTATION
// =====================================================

/**
 * Registry for AI agents
 * Singleton pattern - agents register themselves on module load
 */
class AgentRegistryClass {
  private agents: Map<AIAgentType, IAIAgent> = new Map()

  /**
   * Register an agent for a specific type
   * @param agent - The agent implementation to register
   * @throws Error if agent type already registered
   */
  register(agent: IAIAgent): void {
    if (this.agents.has(agent.agentType)) {
      throw new Error(`Agent already registered for type: ${agent.agentType}`)
    }
    this.agents.set(agent.agentType, agent)
    consola.debug(`Registered AI agent: ${agent.agentType} (${agent.name})`)
  }

  /**
   * Get an agent by type
   * @param agentType - The agent type to retrieve
   * @returns The agent or undefined if not found
   */
  get(agentType: AIAgentType): IAIAgent | undefined {
    return this.agents.get(agentType)
  }

  /**
   * Check if an agent is registered for a type
   * @param agentType - The agent type to check
   * @returns True if registered
   */
  has(agentType: AIAgentType): boolean {
    return this.agents.has(agentType)
  }

  /**
   * Get all registered agent types
   * @returns Array of registered agent types
   */
  getRegisteredTypes(): AIAgentType[] {
    return Array.from(this.agents.keys())
  }

  /**
   * Get all registered agents
   * @returns Array of registered agent implementations
   */
  getAll(): IAIAgent[] {
    return Array.from(this.agents.values())
  }

  /**
   * Get agents in pipeline order
   * Returns agents in the order they should execute,
   * filtering out any types that aren't registered.
   * @param skipTypes - Optional agent types to skip
   * @returns Array of agents in execution order
   */
  getPipelineAgents(skipTypes: AIAgentType[] = []): IAIAgent[] {
    return AGENT_PIPELINE_ORDER
      .filter(type => !skipTypes.includes(type))
      .map(type => this.agents.get(type))
      .filter((agent): agent is IAIAgent => agent !== undefined)
  }

  /**
   * Validate that all required agents are registered
   * @returns Array of missing agent types (empty if all present)
   */
  validatePipeline(): AIAgentType[] {
    return AGENT_PIPELINE_ORDER.filter(type => !this.agents.has(type))
  }

  /**
   * Get agent metadata for API responses
   */
  getAgentInfo(): Array<{
    type: AIAgentType
    name: string
    description: string
    registered: boolean
  }> {
    return AGENT_PIPELINE_ORDER.map(type => {
      const agent = this.agents.get(type)
      return {
        type,
        name: agent?.name ?? type,
        description: agent?.description ?? 'Not registered',
        registered: !!agent,
      }
    })
  }

  /**
   * Clear all registered agents (for testing)
   */
  clear(): void {
    this.agents.clear()
    consola.debug('Cleared all registered AI agents')
  }
}

// Export singleton instance
export const AgentRegistry = new AgentRegistryClass()

// =====================================================
// AGENT LOADER
// =====================================================

/**
 * Ensure all agents are loaded and registered
 * Call this early in application startup
 */
export async function loadAgents(): Promise<void> {
  // Future: dynamically import agent implementations
  // For now, agents register themselves when imported
  const missing = AgentRegistry.validatePipeline()
  if (missing.length > 0) {
    consola.warn(`Missing AI agents: ${missing.join(', ')}`)
  } else {
    consola.info('All AI agents registered successfully')
  }
}

