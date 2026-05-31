/**
 * Retry Utility with Exponential Backoff
 *
 * Provides retry logic for handling transient failures, especially rate limits.
 * Uses exponential backoff with jitter to avoid thundering herd problems.
 */

import { consola } from 'consola'

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number
  /** Base delay in milliseconds (doubled each retry) */
  baseDelayMs: number
  /** Maximum delay in milliseconds */
  maxDelayMs: number
  /** Whether to add random jitter to delays */
  useJitter: boolean
  /** Function to determine if error is retryable */
  isRetryable?: (error: unknown) => boolean
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000, // 1 second
  maxDelayMs: 60000, // 60 seconds
  useJitter: true,
}

/**
 * Check if error is a rate limit error (429)
 */
export function isRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  // Check for Anthropic SDK rate limit error
  if ('status' in error && error.status === 429) return true

  // Check for HTTP status code in various error formats
  if ('statusCode' in error && error.statusCode === 429) return true
  if ('code' in error && error.code === 429) return true

  // Check error message for rate limit indicators
  if ('message' in error && typeof error.message === 'string') {
    const msg = error.message.toLowerCase()
    return msg.includes('rate limit') || msg.includes('too many requests')
  }

  return false
}

/**
 * Default retryable error checker
 * Retries on rate limits and network errors
 */
function defaultIsRetryable(error: unknown): boolean {
  // Always retry rate limits
  if (isRateLimitError(error)) return true

  // Retry on network errors
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    return (
      msg.includes('network') ||
      msg.includes('timeout') ||
      msg.includes('econnreset') ||
      msg.includes('enotfound')
    )
  }

  return false
}

/**
 * Calculate delay for next retry using exponential backoff
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt)

  // Cap at max delay
  let delay = Math.min(exponentialDelay, config.maxDelayMs)

  // Add jitter (random 0-25% of delay) to avoid thundering herd
  if (config.useJitter) {
    const jitter = Math.random() * 0.25 * delay
    delay += jitter
  }

  return Math.floor(delay)
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Retry a function with exponential backoff
 *
 * @param fn - Async function to retry
 * @param config - Retry configuration (optional)
 * @returns Promise resolving to function result
 * @throws Last error if all retries exhausted
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const fullConfig: RetryConfig = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
    isRetryable: config.isRetryable || defaultIsRetryable,
  }

  let lastError: unknown

  for (let attempt = 0; attempt <= fullConfig.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Check if we should retry
      const shouldRetry = fullConfig.isRetryable!(error)
      const hasRetriesLeft = attempt < fullConfig.maxRetries

      if (!shouldRetry || !hasRetriesLeft) {
        consola.debug(`Not retrying (shouldRetry=${shouldRetry}, hasRetriesLeft=${hasRetriesLeft})`)
        throw error
      }

      // Calculate delay and wait
      const delay = calculateDelay(attempt, fullConfig)
      const isRateLimit = isRateLimitError(error)

      consola.warn(
        `Retry attempt ${attempt + 1}/${fullConfig.maxRetries} after ${delay}ms`,
        { isRateLimit, error: error instanceof Error ? error.message : String(error) }
      )

      await sleep(delay)
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError
}

