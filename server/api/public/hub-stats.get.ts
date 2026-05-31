/**
 * GET /api/public/hub-stats
 *
 * Public endpoint that returns trust signal statistics for the SEO hub page.
 * Returns counts of:
 * - Total active contractors
 * - States with active contractors
 * - Cities with active contractors
 *
 * @returns {Object} Hub statistics
 */

import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)

  try {
    // Count active contractors (RLS automatically filters to active only)
    const { count: totalContractors, error: e1 } = await client
      .from('contractors')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .is('deleted_at', null)

    if (e1) throw createError({ statusCode: 500, message: e1.message })

    // Count distinct cities with active contractors
    const { data: contractorCities, error: e2 } = await client
      .from('contractors')
      .select('city_id')
      .eq('status', 'active')
      .is('deleted_at', null)
      .not('city_id', 'is', null)

    if (e2) throw createError({ statusCode: 500, message: e2.message })

    const cityIdSet = new Set(
      (contractorCities?.map(c => c.city_id) || []).filter((id): id is string => id !== null)
    )
    const uniqueCityIds = Array.from(cityIdSet)
    const citiesWithContractors = uniqueCityIds.length

    // Count distinct states
    let statesWithContractors = 0
    if (uniqueCityIds.length > 0) {
      const { data: cityStates, error: e3 } = await client
        .from('cities')
        .select('state_code')
        .in('id', uniqueCityIds)

      if (e3) throw createError({ statusCode: 500, message: e3.message })

      statesWithContractors = new Set(cityStates?.map(c => c.state_code)).size
    }

    return {
      totalContractors: totalContractors ?? 0,
      statesWithContractors,
      citiesWithContractors
    }
  } catch (error: unknown) {
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to get hub stats'
    })
  }
})
