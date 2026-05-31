/**
 * Nitro Plugin: AI Agent Registration
 *
 * Registers all AI agents once on server startup.
 * This ensures agents are available before any AI pipeline execution.
 *
 * @see https://nitro.unjs.io/guide/plugins
 */

import { consola } from 'consola'
import { AgentRegistry } from '../services/ai/AgentRegistry'
import { ResearchAgent } from '../services/ai/agents/ResearchAgent'
import { WriterAgent } from '../services/ai/agents/WriterAgent'
import { OutlineAgent } from '../services/ai/agents/OutlineAgent'
import { SEOAgent } from '../services/ai/agents/SEOAgent'
import { QAAgent } from '../services/ai/agents/QAAgent'
import { ProjectManagerAgent } from '../services/ai/agents/ProjectManagerAgent'
import { ImageGeneratorAgent } from '../services/ai/agents/ImageGeneratorAgent'

export default defineNitroPlugin(() => {
  consola.info('[ai-agents plugin] Initializing AI agents...')

  try {
    const agents = [
      new ResearchAgent(),
      new WriterAgent(),
      new OutlineAgent(),
      new SEOAgent(),
      new QAAgent(),
      new ProjectManagerAgent(),
      new ImageGeneratorAgent(),
    ]

    let registeredCount = 0

    for (const agent of agents) {
      if (!AgentRegistry.has(agent.agentType)) {
        AgentRegistry.register(agent)
        registeredCount++
      }
    }

    if (registeredCount > 0) {
      consola.success(`Registered ${registeredCount} AI agent(s) on server startup: ${AgentRegistry.getRegisteredTypes().join(', ')}`)
    } else {
      consola.info('[ai-agents plugin] All agents already registered')
    }

    // Validate pipeline
    const missing = AgentRegistry.validatePipeline()
    if (missing.length > 0) {
      consola.warn(`Missing AI agents: ${missing.join(', ')}`)
    }
  } catch (error) {
    consola.error('[ai-agents plugin] Failed to register agents:', error)
  }
})

