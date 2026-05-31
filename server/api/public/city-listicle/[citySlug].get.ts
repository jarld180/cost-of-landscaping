/**
 * GET /api/public/city-listicle/:citySlug
 *
 * Returns published AI-generated intro/closing/FAQ content for a city's listicle page.
 * Content is stored in cities.metadata.listicle (written by build-listicles.py).
 * Returns { success: true, data: null } if no content exists.
 */

import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const citySlug = getRouterParam(event, 'citySlug')

  if (!citySlug) {
    throw createError({ statusCode: 400, message: 'City slug required' })
  }

  const client = serverSupabaseServiceRole(event)

  // Optional ?state=XX (2-letter state code) disambiguates slugs that collide
  // across states (e.g. Wilmington exists in NC, CA, DE, OH). Without it,
  // .maybeSingle() returns null on multi-row matches and the listicle never
  // renders on collision-prone cities.
  const stateParam = getQuery(event).state
  const stateCode = typeof stateParam === 'string' && /^[A-Za-z]{2}$/.test(stateParam)
    ? stateParam.toUpperCase()
    : null

  let q = client
    .from('cities')
    .select('metadata')
    .eq('slug', citySlug)
    .is('deleted_at', null)
  if (stateCode) q = q.eq('state_code', stateCode)
  const { data: city } = await q.maybeSingle()

  const listicle = (city?.metadata as Record<string, unknown> | null)?.listicle as {
    intro_html?: string
    closing_html?: string
    faqs?: Array<{ question: string; answer: string }>
  } | undefined

  if (!listicle?.intro_html) {
    return { success: true, data: null }
  }

  return {
    success: true,
    data: {
      intro_html: listicle.intro_html,
      closing_html: listicle.closing_html || '',
      faqs: listicle.faqs || []
    }
  }
})
