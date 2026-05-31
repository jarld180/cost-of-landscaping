/**
 * Rate Limiting Utility
 *
 * Simple in-memory rate limiter for API endpoints.
 * Uses a sliding window algorithm to track request counts.
 *
 * Note: This is suitable for single-instance deployments.
 * For multi-instance deployments, use Redis-based rate limiting.
 */

import { consola } from 'consola'
import type { H3Event } from 'h3'

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory store for rate limit tracking
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup interval (every 5 minutes)
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key)
    }
  }
}, CLEANUP_INTERVAL_MS)

export interface RateLimitOptions {
  /** Maximum number of requests allowed in the window */
  maxRequests: number
  /** Time window in seconds */
  windowSeconds: number
  /** Key prefix for namespacing different endpoints */
  keyPrefix?: string
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean
  /** Number of remaining requests in the window */
  remaining: number
  /** Unix timestamp when the rate limit resets */
  resetAt: number
  /** Total requests allowed in the window */
  limit: number
}

/**
 * Get a unique key for rate limiting based on IP address
 */
function getClientKey(event: H3Event, prefix: string): string {
  // Try to get real IP from various headers (for proxied requests)
  const forwardedFor = getHeader(event, 'x-forwarded-for')
  const realIp = getHeader(event, 'x-real-ip')
  const cfConnectingIp = getHeader(event, 'cf-connecting-ip')
  
  // Use the first IP from x-forwarded-for if present
  const ip = cfConnectingIp 
    || realIp 
    || (forwardedFor ? forwardedFor.split(',')[0].trim() : null)
    || event.node.req.socket.remoteAddress
    || 'unknown'
  
  return `${prefix}:${ip}`
}

/**
 * Check rate limit for a request
 */
export function checkRateLimit(
  event: H3Event,
  options: RateLimitOptions
): RateLimitResult {
  const { maxRequests, windowSeconds, keyPrefix = 'ratelimit' } = options
  const key = getClientKey(event, keyPrefix)
  const now = Date.now()
  const windowMs = windowSeconds * 1000
  
  let entry = rateLimitStore.get(key)
  
  // If no entry or window has expired, create new entry
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + windowMs,
    }
    rateLimitStore.set(key, entry)
  }
  
  // Increment count
  entry.count++
  
  const allowed = entry.count <= maxRequests
  const remaining = Math.max(0, maxRequests - entry.count)
  
  if (!allowed && import.meta.dev) {
    consola.warn(`Rate limit exceeded for ${key}: ${entry.count}/${maxRequests}`)
  }
  
  return {
    allowed,
    remaining,
    resetAt: entry.resetAt,
    limit: maxRequests,
  }
}

/**
 * Apply rate limiting to an event, throwing 429 if exceeded
 */
export function applyRateLimit(
  event: H3Event,
  options: RateLimitOptions
): void {
  const result = checkRateLimit(event, options)
  
  // Set rate limit headers
  setHeader(event, 'X-RateLimit-Limit', result.limit.toString())
  setHeader(event, 'X-RateLimit-Remaining', result.remaining.toString())
  setHeader(event, 'X-RateLimit-Reset', Math.ceil(result.resetAt / 1000).toString())
  
  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000)
    setHeader(event, 'Retry-After', retryAfter.toString())
    
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
    })
  }
}

