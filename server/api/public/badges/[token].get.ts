/**
 * GET /api/public/badges/[token].svg or /api/public/badges/[token].png
 *
 * Unified badge endpoint - Nitro can't distinguish between [token].svg.get.ts
 * and [token].png.get.ts due to a routing limitation, so we parse the extension here.
 */

import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/supabase'
import { processBadgeRequest } from '../../../utils/badgeRequest'
import { generateBadgeSVG, generatePlaceholderBadgeSVG } from '../../../utils/badge'
import { loadBadgePng } from '../../../utils/badgeAssets'

export default defineEventHandler(async (event) => {
  const rawToken = getRouterParam(event, 'token') || ''

  let format: 'svg' | 'png' = 'svg'
  let token = rawToken

  if (rawToken.endsWith('.svg')) {
    format = 'svg'
    token = rawToken.slice(0, -4)
  } else if (rawToken.endsWith('.png')) {
    format = 'png'
    token = rawToken.slice(0, -4)
  }

  if (format === 'svg') {
    setHeader(event, 'Content-Type', 'image/svg+xml; charset=utf-8')
  } else {
    setHeader(event, 'Content-Type', 'image/png')
  }
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  setHeader(event, 'Cache-Control', 'public, max-age=300')

  const adminClient = serverSupabaseServiceRole<Database>(event)
  const result = await processBadgeRequest(event, token, adminClient)

  if (format === 'svg') {
    return result.valid ? generateBadgeSVG() : generatePlaceholderBadgeSVG()
  } else {
    return result.valid ? loadBadgePng('verified') : loadBadgePng('placeholder')
  }
})
