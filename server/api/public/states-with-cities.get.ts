/**
 * GET /api/public/states-with-cities
 *
 * Public endpoint to get all 50 US states with their top cities
 * ranked by contractor count.
 */

import { serverSupabaseServiceRole } from '#supabase/server'
import { US_STATES } from '~/utils/usStates'

export default defineEventHandler(async (event) => {
  const client = serverSupabaseServiceRole(event)

  try {
    // Query cities that have active contractors, with embedded count.
    // Service role bypasses RLS and sees all 9k+ contractors.
    // Paginate in chunks of 1000 to handle large city sets.
    const allCities: Array<{ id: string; name: string; slug: string; state_code: string; contractors: Array<{ count: number }> }> = []
    let page = 0
    const PAGE_SIZE = 1000

    while (true) {
      const { data, error } = await client
        .from('cities')
        .select(`
          id,
          name,
          slug,
          state_code,
          contractors!contractors_city_id_fkey(count)
        `)
        .eq('contractors.status', 'active')
        .is('contractors.deleted_at', null)
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (error) throw createError({ statusCode: 500, message: error.message })
      if (!data || data.length === 0) break

      allCities.push(...(data as typeof allCities))
      if (data.length < PAGE_SIZE) break
      page++
    }

    // Build state → cities map, skipping cities with 0 active contractors
    const stateData = new Map<string, Array<{ name: string; slug: string; contractorCount: number }>>()

    for (const city of allCities) {
      const count = (city.contractors?.[0] as unknown as { count: number } | undefined)?.count ?? 0
      if (count === 0) continue

      const sc = city.state_code
      if (!stateData.has(sc)) stateData.set(sc, [])
      stateData.get(sc)!.push({ name: city.name, slug: city.slug, contractorCount: count })
    }

    // Sort each state's cities by contractor count desc, take top 12
    for (const [sc, cities] of stateData) {
      cities.sort((a, b) => b.contractorCount - a.contractorCount)
      stateData.set(sc, cities.slice(0, 12))
    }

    const states = US_STATES.map(state => ({
      name: state.name,
      slug: state.slug,
      abbreviation: state.abbreviation,
      hasContractors: stateData.has(state.abbreviation),
      topCities: stateData.get(state.abbreviation) || []
    }))

    return { states }
  } catch (error: unknown) {
    if (error instanceof Error && 'statusCode' in error) throw error
    throw createError({ statusCode: 500, message: 'Failed to fetch states with cities' })
  }
})
