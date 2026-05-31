/**
 * AI Services Index
 *
 * Central export point for AI article writing system services.
 */

// LLM Provider interface and implementations
export type {
  MessageRole,
  LLMMessage,
  LLMCompletionRequest,
  TokenUsage,
  LLMCompletionResponse,
  LLMStreamChunk,
  ILLMProvider,
} from './LLMProvider'
export {
  registerLLMProvider,
  getLLMProvider,
  getRegisteredProviders,
} from './LLMProvider'

// Anthropic provider implementation
export { AnthropicProvider } from './AnthropicProvider'

// Utilities
export { repairJSON, validateJSON } from '../../utils/json-repair'
export type { JSONRepairResult } from '../../utils/json-repair'
export { withRetry, isRateLimitError, DEFAULT_RETRY_CONFIG } from '../../utils/retry'
export type { RetryConfig } from '../../utils/retry'

// AI Agent interface and types
export type {
  AgentContext,
  AgentResult,
  IAIAgent,
  ResearchAgentInput,
  WriterAgentInput,
  SEOAgentInput,
  QAAgentInput,
  ProjectManagerAgentInput,
} from './AIAgent'
export { BaseAIAgent } from './AIAgent'

// Agent Registry
export { AgentRegistry, loadAgents } from './AgentRegistry'

// Agent Implementations
export { ResearchAgent, researchAgent } from './agents/ResearchAgent'
export { WriterAgent, writerAgent } from './agents/WriterAgent'
export { SEOAgent, seoAgent } from './agents/SEOAgent'
export { QAAgent, qaAgent } from './agents/QAAgent'
export { ProjectManagerAgent, projectManagerAgent } from './agents/ProjectManagerAgent'

// AI Orchestrator (Pipeline Supervisor)
export { AIOrchestrator, ArticlePipelineOrchestrator } from './AIOrchestrator'
export type { PipelineResult, PipelineCallbacks } from './AIOrchestrator'

