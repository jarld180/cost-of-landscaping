/**
 * GET /api/public/reviews/contractor-lookup/[slug]
 * Returns minimal contractor info for the shareable review page.
 */

import { serverSupabaseServiceRole } from '#supabase/server'

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

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 400, message: 'Slug required' })

  const client = serverSupabaseServiceRole(event)

  const { data, error } = await client
    .from('contractors')
    .select(`
      id, company_name, slug,
      city:cities!contractors_city_id_fkey (name, slug, state_code)
    `)
    .eq('slug', slug)
    .eq('status', 'active')
    .is('deleted_at', null)
    .limit(1)
    .single()

  if (error || !data) throw createError({ statusCode: 404, message: 'Contractor not found' })

  const stateCode = (data.city as any)?.state_code || ''
  const stateSlug = STATE_SLUGS[stateCode] || stateCode.toLowerCase()

  return {
    id: data.id,
    companyName: data.company_name,
    slug: data.slug,
    cityName: (data.city as any)?.name || '',
    citySlug: (data.city as any)?.slug || '',
    stateCode,
    stateSlug,
  }
})
