/**
 * Client IP Extraction Utility
 *
 * Extracts the real client IP address from request headers,
 * handling proxied requests (Cloudflare, nginx, load balancers, etc.)
 */

import type { H3Event } from 'h3'

/**
 * Extract client IP from request headers.
 * Handles common proxy headers in priority order.
 */
export function getClientIP(event: H3Event): string {
  const cfConnectingIp = getHeader(event, 'cf-connecting-ip')
  const realIp = getHeader(event, 'x-real-ip')
  const forwardedFor = getHeader(event, 'x-forwarded-for')

  return (
    cfConnectingIp ||
    realIp ||
    (forwardedFor ? forwardedFor.split(',')[0].trim() : null) ||
    event.node.req.socket.remoteAddress ||
    'unknown'
  )
}
