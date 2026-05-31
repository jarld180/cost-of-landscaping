/**
 * AI Agent Interface
 *
 * Abstract interface for AI agents in the article writing pipeline.
 * Each agent type (Research, Writer, SEO, QA, Project Manager) implements this interface.
 * Enables plugin-style architecture where agents can be added/removed dynamically.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../app/types/supabase'
import type { AIAgentType, AIPersonaRow, AIArticleJobRow } from '../../schemas/ai.schemas'
import type { ILLMProvider, TokenUsage } from './LLMProvider'

// =====================================================
// AGENT CONTEXT & DEPENDENCIES
// =====================================================

/**
 * Context passed to agents during execution
 * Contains all dependencies and state needed for agent work
 */
export interface AgentContext {
  /** Supabase client for database operations */
  client: SupabaseClient<Database>
  /** LLM provider for AI completions */
  llmProvider: ILLMProvider
  /** The current job being processed */
  job: AIArticleJobRow
  /** The persona configuration for this agent */
  persona: AIPersonaRow
  /** Current iteration number (for QA feedback loops) */
  iteration: number
  /** Current step ID (for linking evals to steps) */
  stepId?: string
  /** Callback for logging agent activity */
  log: (level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: unknown) => void
  /** Callback for streaming progress updates */
  onProgress?: (message: string, data?: unknown) => void
  /** OpenAI API key (for image generation) */
  openaiApiKey?: string
  /** Exa API key (for research) */
  exaApiKey?: string
  /** DataForSEO API key (for keyword research) */
  dataforseoApiKey?: string
  /** Helicone API key (for LLM observability) */
  heliconeApiKey?: string
}

/**
 * Result returned by an agent after execution
 */
export interface AgentResult<TOutput = unknown> {
  /** Whether the agent completed successfully */
  success: boolean
  /** The agent's output data (type depends on agent) */
  output: TOutput | null
  /** Token usage statistics */
  usage: TokenUsage
  /** Estimated cost in USD */
  estimatedCostUsd?: number
  /** Error message if failed */
  error?: string
  /** Whether to continue to the next agent */
  continueToNext: boolean
  /** Optional feedback for previous agents (from QA) */
  feedback?: string
}

// =====================================================
// AGENT INTERFACE
// =====================================================

/**
 * Abstract interface for AI agents
 * Implement this for each agent type in the pipeline
 */
export interface IAIAgent<TInput = unknown, TOutput = unknown> {
  /** The agent type identifier */
  readonly agentType: AIAgentType

  /** Human-readable agent name */
  readonly name: string

  /** Brief description of what this agent does */
  readonly description: string

  /**
   * Execute the agent's task
   * @param input - Input from previous agent (or initial job data)
   * @param context - Execution context with dependencies
   * @returns Promise resolving to agent result
   */
  execute(input: TInput, context: AgentContext): Promise<AgentResult<TOutput>>

  /**
   * Validate input before execution
   * @param input - Input to validate
   * @returns True if valid, error message if invalid
   */
  validateInput(input: unknown): input is TInput

  /**
   * Get the expected output schema (for documentation/validation)
   */
  getOutputSchema(): Record<string, unknown>
}

// =====================================================
// PIPELINE TYPES
// =====================================================

/**
 * Input for the Research agent (first in pipeline)
 */
export interface ResearchAgentInput {
  keyword: string
  context?: string
  targetWordCount?: number
}

/**
 * Input for the Outline agent (receives Research output)
 */
export interface OutlineAgentInput {
  keyword: string
  researchData: unknown // ResearchOutput type
  articleContext?: string
  secondaryKeywords?: string[]
  targetWordCount: number
}

/**
 * Structured issue for Writer revision
 */
export interface RevisionIssue {
  issueId: string
  category: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  suggestion: string
  location?: string
  /** Number of iterations this issue has persisted */
  persistCount?: number
}

/**
 * Input for the Writer agent (receives Research output)
 */
export interface WriterAgentInput {
  keyword: string
  researchData: unknown // ResearchOutput type
  targetWordCount: number
  /** QA feedback for revision cycles (optional, provided when iteration > 1) */
  qaFeedback?: string
  /** Structured issues to fix (replaces generic feedback in revision mode) */
  issuesToFix?: RevisionIssue[]
  /** Previous article content for revision reference (optional) */
  previousArticle?: unknown // WriterOutput type
  /** Current iteration number */
  iteration?: number
  /** Content outline with H2/H3 structure and word counts (optional) */
  outline?: unknown // OutlineOutput type
  /** Article context/angle for focused content generation (optional) */
  articleContext?: string
  /** Secondary keywords to naturally include in the article (optional) */
  secondaryKeywords?: string[]
}

/**
 * Input for the SEO agent (receives Writer output)
 */
export interface SEOAgentInput {
  keyword: string
  article: unknown // WriterOutput type
  researchData: unknown // ResearchOutput type
}

/**
 * Tracked issue from previous QA iteration
 */
export interface TrackedIssue {
  issueId: string
  category: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  suggestion: string
  location?: string
}

/**
 * Input for the QA agent (receives SEO output)
 */
export interface QAAgentInput {
  keyword: string
  article: unknown // WriterOutput type
  seoData: unknown // SEOOutput type
  iteration: number
  /** Issues from previous iteration for tracking fixes */
  previousIssues?: TrackedIssue[]
}

/**
 * Input for Project Manager agent (receives QA output)
 */
export interface ProjectManagerAgentInput {
  keyword: string
  article: unknown // WriterOutput type
  seoData: unknown // SEOOutput type
  qaData: unknown // QAOutput type
  settings: unknown // Job settings
}

// =====================================================
// BASE AGENT CLASS
// =====================================================

/**
 * Abstract base class for AI agents
 * Provides common functionality for all agents
 */
export abstract class BaseAIAgent<TInput = unknown, TOutput = unknown>
  implements IAIAgent<TInput, TOutput>
{
  abstract readonly agentType: AIAgentType
  abstract readonly name: string
  abstract readonly description: string

  abstract execute(input: TInput, context: AgentContext): Promise<AgentResult<TOutput>>
  abstract validateInput(input: unknown): input is TInput
  abstract getOutputSchema(): Record<string, unknown>

  /**
   * Helper to create a successful result
   */
  protected success(output: TOutput, usage: TokenUsage, continueToNext = true, estimatedCostUsd?: number): AgentResult<TOutput> {
    return { success: true, output, usage, estimatedCostUsd, continueToNext }
  }

  /**
   * Helper to create a failed result
   */
  protected failure(error: string, usage: TokenUsage, estimatedCostUsd?: number): AgentResult<TOutput> {
    return { success: false, output: null, usage, estimatedCostUsd, error, continueToNext: false }
  }
}

