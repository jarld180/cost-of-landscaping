/**
 * LLM Provider Interface
 *
 * Abstract interface for Large Language Model providers.
 * Enables swapping between Anthropic (Claude) and OpenAI models
 * without changing agent implementation code.
 */

import type { z } from 'zod'
import type { LLMProvider as LLMProviderType } from '../../schemas/ai.schemas'

// =====================================================
// REQUEST/RESPONSE TYPES
// =====================================================

/** Message role in conversation */
export type MessageRole = 'system' | 'user' | 'assistant'

/** Single message in a conversation */
export interface LLMMessage {
  role: MessageRole
  content: string
}

/** Configuration for LLM completion request */
export interface LLMCompletionRequest {
  /** The messages to send (conversation history) */
  messages: LLMMessage[]
  /** Model identifier (e.g., 'claude-sonnet-4-20250514') */
  model: string
  /** Temperature for randomness (0-2) */
  temperature?: number
  /** Maximum tokens in response */
  maxTokens?: number
  /** System prompt (prepended to messages) */
  systemPrompt?: string
  /** Stop sequences to end generation */
  stopSequences?: string[]
  /** Whether to request JSON output format */
  jsonMode?: boolean
  /** Agent name for observability tracking (Helicone) */
  agentName?: string
}

/** Token usage statistics */
export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

/** Successful completion response */
export interface LLMCompletionResponse {
  /** The generated text content */
  content: string
  /** Token usage statistics */
  usage: TokenUsage
  /** Model used for completion */
  model: string
  /** Stop reason (e.g., 'end_turn', 'max_tokens') */
  stopReason: string | null
  /** Estimated cost in USD */
  estimatedCostUsd: number
}

/** Streaming chunk for real-time responses */
export interface LLMStreamChunk {
  /** Text delta (partial content) */
  delta: string
  /** Whether this is the final chunk */
  isComplete: boolean
  /** Final usage stats (only on last chunk) */
  usage?: TokenUsage
}

// =====================================================
// PROVIDER INTERFACE
// =====================================================

/**
 * Abstract interface for LLM providers
 * Implement this for each supported provider (Anthropic, OpenAI, etc.)
 */
export interface ILLMProvider {
  /** Provider identifier */
  readonly providerType: LLMProviderType

  /**
   * Generate a completion (non-streaming)
   * @param request - The completion request configuration
   * @returns Promise resolving to completion response
   */
  complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse>

  /**
   * Generate a streaming completion
   * @param request - The completion request configuration
   * @param onChunk - Callback for each streamed chunk
   * @returns Promise resolving when stream completes
   */
  stream(
    request: LLMCompletionRequest,
    onChunk: (chunk: LLMStreamChunk) => void
  ): Promise<LLMCompletionResponse>

  /**
   * Generate text with optional streaming support
   * Higher-level method that simplifies text generation
   * @param options - Text generation options
   * @returns Promise resolving to completion response
   */
  generateText(options: {
    prompt: string
    systemPrompt?: string
    model: string
    temperature?: number
    maxTokens?: number
    onStream?: (chunk: LLMStreamChunk) => void
  }): Promise<LLMCompletionResponse>

  /**
   * Generate structured JSON output with Zod validation
   * Automatically repairs malformed JSON and validates against schema
   * @param options - JSON generation options
   * @returns Promise resolving to validated JSON data
   */
  generateJSON<T>(options: {
    prompt: string
    systemPrompt?: string
    model: string
    schema: z.ZodSchema<T>
    temperature?: number
    maxTokens?: number
    maxRetries?: number
  }): Promise<{ data: T; usage: TokenUsage; estimatedCostUsd: number }>

  /**
   * Generate structured JSON output using tool_use for guaranteed structured output
   * More reliable than prompt-based JSON generation - forces model to return exact schema
   * @param options - JSON generation options with optional tool configuration
   * @returns Promise resolving to validated JSON data
   */
  generateJSONWithToolUse<T>(options: {
    prompt: string
    systemPrompt?: string
    model: string
    schema: z.ZodSchema<T>
    toolName?: string
    toolDescription?: string
    temperature?: number
    maxTokens?: number
    agentName?: string
  }): Promise<{ data: T; usage: TokenUsage; estimatedCostUsd: number }>

  /**
   * Estimate token count for text (approximate)
   * @param text - Text to count tokens for
   * @returns Approximate token count
   */
  estimateTokens(text: string): number

  /**
   * Calculate cost for token usage
   * @param model - Model identifier
   * @param usage - Token usage statistics
   * @returns Cost in USD
   */
  calculateCost(model: string, usage: TokenUsage): number
}

// =====================================================
// FACTORY & REGISTRY
// =====================================================

/** Map of registered LLM providers */
const providers = new Map<LLMProviderType, ILLMProvider>()

/**
 * Register an LLM provider implementation
 */
export function registerLLMProvider(provider: ILLMProvider): void {
  providers.set(provider.providerType, provider)
}

/**
 * Get an LLM provider by type
 */
export function getLLMProvider(type: LLMProviderType): ILLMProvider | undefined {
  return providers.get(type)
}

/**
 * Get all registered provider types
 */
export function getRegisteredProviders(): LLMProviderType[] {
  return Array.from(providers.keys())
}

