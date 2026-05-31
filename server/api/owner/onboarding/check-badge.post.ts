/**
 * POST /api/owner/onboarding/check-badge
 *
 * Performs a bounded single-page badge snippet check for an owned contractor.
 */

import { consola } from 'consola'
import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'
import { requireOwner } from '../../../utils/auth'
import { extractRootDomain } from '../../../utils/domain'

const MAX_HTML_BYTES = 512 * 1024
const CHECK_TIMEOUT_MS = 7000

const checkBadgeSchema = z.object({
  contractorId: z.string().uuid('Contractor ID must be a valid UUID'),
})

function normalizeWebsiteUrl(website: string): URL | null {
  const trimmed = website.trim()
  if (!trimmed) return null

  try {
    return new URL(trimmed)
  } catch {
    try {
      return new URL(`https://${trimmed}`)
    } catch {
      return null
    }
  }
}

async function readLimitedText(response: Response): Promise<string> {
  const body = response.body
  if (!body) {
    return (await response.text()).slice(0, MAX_HTML_BYTES)
  }

  const reader = body.getReader()
  const decoder = new TextDecoder()
  let totalBytes = 0
  let html = ''

  try {
    while (totalBytes < MAX_HTML_BYTES) {
      const { done, value } = await reader.read()
      if (done || !value) break

      totalBytes += value.byteLength
      html += decoder.decode(value, { stream: true })
    }

    html += decoder.decode()
  } finally {
    reader.releaseLock()
  }

  return html.slice(0, MAX_HTML_BYTES)
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = checkBadgeSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: parsed.error.errors[0]?.message || 'Invalid input'
    })
  }

  const { contractorId } = parsed.data
  const userId = await requireOwner(event, contractorId)
  const client = await serverSupabaseClient(event)

  const { data: contractor, error } = await client
    .from('contractors')
    .select('id, website, embed_token, embed_verified, embed_verified_domain')
    .eq('id', contractorId)
    .eq('claimed_by', userId)
    .maybeSingle()

  if (error) {
    consola.error('POST /api/owner/onboarding/check-badge - Contractor lookup failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to fetch contractor'
    })
  }

  if (!contractor) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Contractor not found'
    })
  }

  if (contractor.embed_verified) {
    return {
      detected: true,
      domain: contractor.embed_verified_domain,
    }
  }

  if (!contractor.embed_token) {
    return {
      detected: false,
      reason: 'missing_embed_token' as const,
    }
  }

  if (!contractor.website) {
    return {
      detected: false,
      reason: 'no_website' as const,
    }
  }

  const websiteUrl = normalizeWebsiteUrl(contractor.website)
  if (!websiteUrl) {
    return {
      detected: false,
      reason: 'no_website' as const,
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS)

  try {
    const response = await fetch(websiteUrl.toString(), {
      method: 'GET',
      headers: {
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'user-agent': 'CostOflandscapeBadgeVerifier/1.0 (+https://costoflandscaping.com)',
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      return {
        detected: false,
        domain: extractRootDomain(websiteUrl.toString()),
        reason: 'fetch_failed' as const,
      }
    }

    const html = await readLimitedText(response)
    const token = contractor.embed_token
    const detected = html.includes(token)
      || html.includes(`/api/public/badges/${token}.svg`)
      || html.includes(`/api/public/badges/${token}.png`)

    const domain = extractRootDomain(websiteUrl.toString())

    if (!detected) {
      return {
        detected: false,
        domain,
      }
    }

    const { error: updateError } = await client
      .from('contractors')
      .update({
        embed_verified: true,
        embed_verified_at: new Date().toISOString(),
        embed_verified_domain: domain,
      })
      .eq('id', contractorId)
      .eq('claimed_by', userId)

    if (updateError) {
      consola.error('POST /api/owner/onboarding/check-badge - Verification update failed:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Internal Server Error',
        message: 'Failed to update badge verification'
      })
    }

    return {
      detected: true,
      domain,
    }
  } catch (err) {
    if (import.meta.dev) {
      consola.warn('POST /api/owner/onboarding/check-badge - Website fetch failed:', err)
    }
    return {
      detected: false,
      domain: extractRootDomain(websiteUrl.toString()),
      reason: 'fetch_failed' as const,
    }
  } finally {
    clearTimeout(timeout)
  }
})
