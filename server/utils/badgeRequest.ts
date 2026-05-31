/**
 * Shared Badge Request Handler
 *
 * Centralizes token lookup, logging, and verification logic
 * used by both SVG and PNG badge endpoints.
 */

import { consola } from 'consola'
import type { H3Event } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/supabase'
import { getClientIP } from './clientIP'
import { extractRootDomain, doDomainsMatch } from './domain'

// UUID regex for validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface BadgeRequestResult {
  valid: boolean
  contractorId?: string
}

/**
 * Extract origin (scheme + host) from a URL, discarding path/query.
 * Returns null if URL is invalid.
 */
export function extractOrigin(url: string): string | null {
  try {
    const parsed = new URL(url)
    return parsed.origin
  } catch {
    return null
  }
}

/**
 * Process a badge request: validate token, lookup contractor, log request, handle verification.
 * Returns whether the request is valid (contractor found).
 */
export async function processBadgeRequest(
  event: H3Event,
  token: string,
  adminClient: SupabaseClient<Database>
): Promise<BadgeRequestResult> {
  // Validate token format
  if (!token || !UUID_REGEX.test(token)) {
    return { valid: false }
  }

  // Get our domains from config
  const config = useRuntimeConfig()
  const ourDomains: string[] = config.badgeOurDomains || ['costoflandscape.com', 'www.costoflandscape.com', 'localhost']

  // Look up contractor by embed_token
  const { data: contractor, error: lookupError } = await adminClient
    .from('contractors')
    .select('id, embed_verified, embed_verified_at, website')
    .eq('embed_token', token)
    .maybeSingle()

  if (lookupError) {
    consola.error('[badge] Database error:', lookupError.message)
    return { valid: false }
  }

  if (!contractor) {
    return { valid: false }
  }

  // Extract request metadata
  const clientIP = getClientIP(event)
  const referrer = getHeader(event, 'referer') || getHeader(event, 'referrer') || null
  const userAgent = getHeader(event, 'user-agent') || null
  const referrerOrigin = referrer ? extractOrigin(referrer) : null

  // Compute hour bucket for dedup (truncate to hour in UTC)
  const now = new Date()
  const hourBucket = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours(),
    0, 0, 0
  )).toISOString()

  // Atomic logging with DB-enforced dedup (async, non-blocking)
  // Uses upsert with ON CONFLICT DO NOTHING - no race conditions
  ;(async () => {
    try {
      const { error } = await adminClient
        .from('badge_embed_logs')
        .upsert(
          {
            contractor_id: contractor.id,
            request_ip: clientIP,
            referrer_origin: referrerOrigin,
            referrer_url: referrer, // Keep for backwards compat, will deprecate
            user_agent: userAgent,
            hour_bucket: hourBucket,
          },
          {
            onConflict: 'contractor_id,request_ip,hour_bucket',
            ignoreDuplicates: true,
          }
        )

      if (error) {
        consola.error('[badge] Failed to log embed request:', error.message)
      }
    } catch (err) {
      consola.error('[badge] Error in badge logging:', err)
    }
  })()

  // Auto-verification logic
  if (!contractor.embed_verified && referrer) {
    try {
      const referrerUrl = new URL(referrer)
      const referrerDomain = referrerUrl.hostname.toLowerCase()

      // Check if referrer is external (not our domain)
      const isExternal = !ourDomains.some(
        domain => referrerDomain === domain || referrerDomain.endsWith(`.${domain}`)
      )

      if (isExternal) {
        let shouldVerify = false

        if (contractor.website) {
          // Contractor has a website - only verify if referrer matches
          shouldVerify = doDomainsMatch(referrer, contractor.website)
          if (!shouldVerify) {
            consola.debug(`[badge] Referrer ${referrerDomain} does not match contractor website ${contractor.website}`)
          }
        } else {
          // Contractor has no website - verify on any external referrer (legacy behavior)
          shouldVerify = true
          consola.debug(`[badge] No website set for contractor, verifying on external referrer: ${referrerDomain}`)
        }

        if (shouldVerify) {
          const verifiedDomain = extractRootDomain(referrer) || referrerDomain
          const { error: verifyError } = await adminClient
            .from('contractors')
            .update({
              embed_verified: true,
              embed_verified_at: new Date().toISOString(),
              embed_verified_domain: verifiedDomain,
            })
            .eq('id', contractor.id)
            .is('embed_verified', false)

          if (verifyError) {
            consola.error('[badge] Failed to auto-verify contractor:', verifyError.message)
          } else {
            consola.info(`[badge] Auto-verified contractor ${contractor.id} from domain: ${verifiedDomain}`)
          }
        }
      }
    } catch {
      // Invalid referrer URL, ignore
    }
  }

  return { valid: true, contractorId: contractor.id }
}
