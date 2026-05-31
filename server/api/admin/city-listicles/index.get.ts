/**
 * GET /api/admin/city-listicles
 *
 * Admin dashboard: cities with their contractor count and listicle content status.
 *
 * Query params:
 * - stateCode (optional): Filter by state
 * - minPopulation (optional): default 30000
 * - hasContent (optional): 'true' | 'false' | 'all' (default: all)
 * - limit (optional): default 100, max 500
 * - offset (optional): default 0
 * - orderBy (optional): name | population | contractor_count (default: contractor_count)
 */

import { serverSupabaseClient } from '#supabase/server'
import { requireAdmin } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const query = getQuery(event)
  const stateCode = (query.stateCode as string | undefined)?.toUpperCase()
  const minPopulation = query.minPopulation !== undefined ? Number(query.minPopulation) : 30000
  const hasContent = query.hasContent as string | undefined
  const limit = Math.min(Math.max(Number(query.limit) || 100, 1), 500)
  const offset = Math.max(Number(query.offset) || 0, 0)
  const orderBy = (['name', 'population', 'contractor_count'].includes(query.orderBy as string)
    ? query.orderBy
    : 'contractor_count') as 'name' | 'population' | 'contractor_count'

  const client = await serverSupabaseClient(event)

  // Fetch cities with population filter
  let cityQuery = client
    .from('cities')
    .select('id, name, slug, state_code, population', { count: 'exact' })
    .is('deleted_at', null)

  if (stateCode) cityQuery = cityQuery.eq('state_code', stateCode)
  if (minPopulation > 0) cityQuery = cityQuery.gte('population', minPopulation)

  const { data: cities, error: cityError, count } = await cityQuery

  if (cityError) {
    throw createError({ statusCode: 500, message: 'Failed to fetch cities' })
  }

  if (!cities || cities.length === 0) {
    return { cities: [], total: 0, limit, offset, hasMore: false }
  }

  const cityIds = cities.map(c => c.id)

  // Fetch contractor counts per city
  const { data: contractorCounts } = await client
    .from('contractors')
    .select('city_id')
    .in('city_id', cityIds)
    .is('deleted_at', null)

  const countMap = new Map<string, number>()
  for (const row of contractorCounts || []) {
    if (row.city_id) {
      countMap.set(row.city_id, (countMap.get(row.city_id) || 0) + 1)
    }
  }

  // Fetch existing listicle content for these cities
  const { data: contents } = await client
    .from('city_listicle_content')
    .select('city_id, status, generated_at, word_count')
    .in('city_id', cityIds)

  const contentMap = new Map<string, { status: string; generatedAt: string | null; wordCount: number | null }>()
  for (const c of contents || []) {
    contentMap.set(c.city_id, {
      status: c.status,
      generatedAt: c.generated_at,
      wordCount: c.word_count
    })
  }

  // Build combined result
  let result = cities.map(city => ({
    id: city.id,
    name: city.name,
    slug: city.slug,
    stateCode: city.state_code,
    population: city.population,
    contractorCount: countMap.get(city.id) || 0,
    content: contentMap.get(city.id) || null
  }))

  // Filter by content status
  if (hasContent === 'true') {
    result = result.filter(c => c.content !== null)
  } else if (hasContent === 'false') {
    result = result.filter(c => c.content === null)
  }

  // Sort
  if (orderBy === 'contractor_count') {
    result.sort((a, b) => b.contractorCount - a.contractorCount)
  } else if (orderBy === 'population') {
    result.sort((a, b) => (b.population || 0) - (a.population || 0))
  } else {
    result.sort((a, b) => a.name.localeCompare(b.name))
  }

  // Paginate
  const paginated = result.slice(offset, offset + limit)
  const withContent = result.filter(c => c.content !== null).length

  return {
    cities: paginated,
    total: result.length,
    withContent,
    withoutContent: result.length - withContent,
    limit,
    offset,
    hasMore: offset + paginated.length < result.length
  }
})
