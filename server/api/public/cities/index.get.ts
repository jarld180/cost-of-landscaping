/**
 * GET /api/public/cities
 *
 * List cities with optional filters.
 * Used by the admin city-listicle dashboard and public state pages.
 *
 * Query params:
 * - stateCode (optional): Filter by state (e.g., TX)
 * - minPopulation (optional): Minimum population filter (e.g., 30000)
 * - limit (optional): Results per page (default: 100, max: 500)
 * - offset (optional): Pagination offset (default: 0)
 * - orderBy (optional): name | population | contractor_count (default: name)
 */

import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const stateCode = (query.stateCode as string | undefined)?.toUpperCase()
  const minPopulation = query.minPopulation ? Number(query.minPopulation) : undefined
  const limit = Math.min(Math.max(Number(query.limit) || 100, 1), 500)
  const offset = Math.max(Number(query.offset) || 0, 0)
  const orderBy = (['name', 'population'].includes(query.orderBy as string)
    ? query.orderBy
    : 'name') as 'name' | 'population'

  const client = serverSupabaseServiceRole(event)

  let q = client
    .from('cities')
    .select('id, name, slug, state_code, population, lat, lng', { count: 'exact' })
    .is('deleted_at', null)

  if (stateCode) q = q.eq('state_code', stateCode)
  if (minPopulation) q = q.gte('population', minPopulation)

  q = q
    .order(orderBy, { ascending: orderBy === 'population' ? false : true })
    .range(offset, offset + limit - 1)

  const { data, error, count } = await q

  if (error) {
    throw createError({ statusCode: 500, message: 'Failed to fetch cities' })
  }

  return {
    cities: data || [],
    total: count || 0,
    limit,
    offset,
    hasMore: offset + (data?.length || 0) < (count || 0)
  }
})
