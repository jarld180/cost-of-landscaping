/**
 * Dynamic sitemap URL source for @nuxtjs/seo
 *
 * Returns all dynamic URLs that can't be statically enumerated:
 * - /[state]/[city]/landscapers/ — city contractor directories
 * - /[state]/[city]/best-landscapers/ — city listicle pages
 * - All published article pages
 *
 * State pages are handled statically in nuxt.config.ts.
 */

import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = serverSupabaseServiceRole(event)

  const urls: { loc: string; changefreq: string; priority: number; lastmod?: string }[] = []

  // Fetch all cities that have at least one contractor (batch query)
  const { data: cities } = await client
    .from('cities')
    .select('slug, state_code, updated_at')
    .is('deleted_at', null)
    .order('state_code', { ascending: true })

  if (cities) {
    for (const city of cities) {
      const stateSlug = city.state_code.toLowerCase()
        .replace(/\s+/g, '-')
      // We'll just use state_code lowercase — proper slug mapping happens client-side
      // but for sitemap we need the real state slug. Use a basic mapping.
      const slug = stateCodeToSlug(city.state_code)
      if (!slug) continue

      urls.push({
        loc: `/${slug}/${city.slug}/landscapers/`,
        changefreq: 'weekly',
        priority: 0.7,
        lastmod: city.updated_at
      })

      urls.push({
        loc: `/${slug}/${city.slug}/best-landscapers/`,
        changefreq: 'weekly',
        priority: 0.8,
        lastmod: city.updated_at
      })
    }
  }

  // Fetch all published article pages
  const { data: articles } = await client
    .from('pages')
    .select('full_path, updated_at, sitemap_priority, sitemap_changefreq')
    .eq('status', 'published')
    .not('full_path', 'like', '/admin%')
    .not('full_path', 'like', '/owner%')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(5000)

  if (articles) {
    for (const article of articles) {
      urls.push({
        loc: article.full_path,
        changefreq: (article.sitemap_changefreq as string) || 'monthly',
        priority: Number(article.sitemap_priority) || 0.6,
        lastmod: article.updated_at
      })
    }
  }

  // Fetch all active contractor profile pages (paginate 1000 at a time)
  let page = 0
  const PAGE_SIZE = 1000
  while (true) {
    const { data: contractors } = await client
      .from('contractors')
      .select('slug, updated_at, cities!contractors_city_id_fkey(slug, state_code)')
      .eq('status', 'active')
      .is('deleted_at', null)
      .not('slug', 'is', null)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (!contractors || contractors.length === 0) break

    for (const c of contractors) {
      const city = (c.cities as unknown as { slug: string; state_code: string } | null)
      if (!city?.slug || !city?.state_code) continue
      const stateSlug = stateCodeToSlug(city.state_code)
      if (!stateSlug) continue
      urls.push({
        loc: `/${stateSlug}/${city.slug}/landscapers/${c.slug}/`,
        changefreq: 'monthly',
        priority: 0.6,
        lastmod: c.updated_at
      })
    }

    if (contractors.length < PAGE_SIZE) break
    page++
  }

  return urls
})

const STATE_SLUGS: Record<string, string> = {
  AL:'alabama',AK:'alaska',AZ:'arizona',AR:'arkansas',CA:'california',
  CO:'colorado',CT:'connecticut',DE:'delaware',FL:'florida',GA:'georgia',
  HI:'hawaii',ID:'idaho',IL:'illinois',IN:'indiana',IA:'iowa',
  KS:'kansas',KY:'kentucky',LA:'louisiana',ME:'maine',MD:'maryland',
  MA:'massachusetts',MI:'michigan',MN:'minnesota',MS:'mississippi',MO:'missouri',
  MT:'montana',NE:'nebraska',NV:'nevada',NH:'new-hampshire',NJ:'new-jersey',
  NM:'new-mexico',NY:'new-york',NC:'north-carolina',ND:'north-dakota',OH:'ohio',
  OK:'oklahoma',OR:'oregon',PA:'pennsylvania',RI:'rhode-island',SC:'south-carolina',
  SD:'south-dakota',TN:'tennessee',TX:'texas',UT:'utah',VT:'vermont',
  VA:'virginia',WA:'washington',WV:'west-virginia',WI:'wisconsin',WY:'wyoming'
}

function stateCodeToSlug(code: string): string | null {
  return STATE_SLUGS[code?.toUpperCase()] || null
}
