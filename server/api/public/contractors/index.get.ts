/**
 * GET /api/public/contractors
 *
 * Public endpoint to search contractors with filters
 * Supports coordinate-based radius search (when lat/lng provided)
 * Supports radius-based search using PostGIS (when citySlug provided)
 * Supports state-level search (when stateCode provided without citySlug)
 * Supports nationwide search (when neither citySlug nor stateCode provided)
 *
 * Query params:
 * - lat (optional): User's latitude for radius search
 * - lng (optional): User's longitude for radius search
 * - citySlug (optional): City slug to search from (for radius search)
 * - stateCode (optional): State code to search within (e.g., NC, CA)
 * - category (optional): Category slug to filter by
 * - minRating (optional): Minimum rating to filter by
 * - radius (optional): Search radius in miles (default: 25)
 * - limit (optional): Results per page (default: 20, max: 50)
 * - offset (optional): Pagination offset (default: 0)
 * - orderBy (optional): Sort field - rating, review_count, distance (default: rating)
 * - orderDirection (optional): Sort direction - asc, desc (default: desc)
 *
 * Priority: lat/lng > citySlug > stateCode > nationwide
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { ContractorRepository } from '../../../repositories/ContractorRepository'
import type { PublicContractorSearchOptions, StateContractorSearchOptions, NationwideContractorSearchOptions, CoordinateSearchOptions } from '../../../repositories/ContractorRepository'
import { applyRateLimit } from '../../../utils/rateLimit'

export default defineEventHandler(async (event) => {
  await applyRateLimit(event, { maxRequests: 60, windowSeconds: 60, keyPrefix: 'contractors-search' })

  const query = getQuery(event)

  // Parse coordinate params for user location search
  const lat = query.lat ? Number(query.lat) : undefined
  const lng = query.lng ? Number(query.lng) : undefined
  const hasCoordinates = lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)

  const citySlug = query.citySlug as string | undefined
  const stateCode = query.stateCode as string | undefined

  // Parse and validate query params
  const category = query.category as string | undefined
  const minRating = Number(query.minRating) || undefined
  const radiusMiles = Math.min(Math.max(Number(query.radius) || 25, 1), 100)
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 50)
  const offset = Math.max(Number(query.offset) || 0, 0)
  const orderDirection = (['asc', 'desc'].includes(query.orderDirection as string)
    ? query.orderDirection
    : 'desc') as 'asc' | 'desc'

  const client = await serverSupabaseClient(event)
  const contractorRepo = new ContractorRepository(client)

  try {
    let contractors: Awaited<ReturnType<typeof contractorRepo.searchPublic>>['contractors']
    let total: number

    if (hasCoordinates) {
      // Coordinate-based radius search from user's location
      const orderBy = (['rating', 'review_count', 'distance'].includes(query.orderBy as string)
        ? query.orderBy
        : 'distance') as 'rating' | 'review_count' | 'distance'

      const searchOptions: CoordinateSearchOptions = {
        lat: lat!,
        lng: lng!,
        radiusMiles,
        category,
        minRating,
        limit,
        offset,
        orderBy,
        orderDirection: orderBy === 'distance' ? 'asc' : orderDirection // Default ascending for distance
      }

      consola.info(`Coordinate search: lat=${lat}, lng=${lng}, radius=${radiusMiles}mi`)
      const result = await contractorRepo.searchByCoordinates(searchOptions)
      contractors = result.contractors
      total = result.total
    } else if (citySlug) {
      // Radius-based search from a city
      const orderBy = (['rating', 'review_count', 'distance'].includes(query.orderBy as string)
        ? query.orderBy
        : 'rating') as 'rating' | 'review_count' | 'distance'

      const searchOptions: PublicContractorSearchOptions = {
        citySlug,
        stateCode,
        category,
        radiusMiles,
        limit,
        offset,
        orderBy,
        orderDirection
      }

      const result = await contractorRepo.searchPublic(searchOptions)
      contractors = result.contractors
      total = result.total
    } else if (stateCode) {
      // State-level search (no radius)
      const orderBy = (['rating', 'review_count', 'company_name'].includes(query.orderBy as string)
        ? query.orderBy
        : 'rating') as 'rating' | 'review_count' | 'company_name'

      const searchOptions: StateContractorSearchOptions = {
        stateCode,
        category,
        limit,
        offset,
        orderBy,
        orderDirection
      }

      const result = await contractorRepo.searchByState(searchOptions)
      contractors = result.contractors
      total = result.total
    } else {
      // Nationwide search (no location filter)
      const orderBy = (['rating', 'review_count', 'company_name'].includes(query.orderBy as string)
        ? query.orderBy
        : 'rating') as 'rating' | 'review_count' | 'company_name'

      const searchOptions: NationwideContractorSearchOptions = {
        category,
        minRating,
        limit,
        offset,
        orderBy,
        orderDirection
      }

      const result = await contractorRepo.searchNationwide(searchOptions)
      contractors = result.contractors
      total = result.total
    }

    // Transform for public response (exclude sensitive fields)
    const publicContractors = contractors.map(c => ({
      id: c.id,
      companyName: c.company_name,
      slug: c.slug,
      description: c.description,
      streetAddress: c.street_address,
      postalCode: c.postal_code,
      phone: c.phone,
      website: c.website,
      rating: c.rating,
      reviewCount: c.review_count,
      distanceMiles: c.distance_miles,
      cityName: c.city_name,
      citySlug: c.city_slug,
      stateCode: c.state_code,
      metadata: c.metadata,
      verificationTier: (c as any).verification_tier || 'unverified',
    }))

    return {
      contractors: publicContractors,
      total,
      limit,
      offset,
      hasMore: offset + contractors.length < total
    }
  } catch (error: unknown) {
    consola.error('Error searching contractors:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to search contractors'
    })
  }
})

