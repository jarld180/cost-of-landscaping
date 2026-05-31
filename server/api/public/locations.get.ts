/**
 * GET /api/public/locations
 *
 * Unified location search endpoint for cities and ZIP codes.
 * Returns autocomplete suggestions matching the query.
 *
 * Query params:
 * - q (required): Search query (city name or ZIP code)
 * - limit (optional): Max results to return (default: 10, max: 20)
 *
 * Returns mixed results with type indicator ('city' | 'zip')
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'

interface LocationResult {
  type: 'city' | 'zip'
  value: string // Display value
  cityName: string
  citySlug: string | null
  stateCode: string
  stateName: string
  lat: number
  lng: number
  zip?: string // Only for ZIP type
  cityId?: string // Link to cities table if available
}

export default defineEventHandler(async (event): Promise<LocationResult[]> => {
  const query = getQuery(event)
  const q = (query.q as string || '').trim()
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 20)

  if (!q || q.length < 2) {
    return []
  }

  const client = await serverSupabaseClient(event)
  const results: LocationResult[] = []

  try {
    // Check if query looks like a ZIP code (starts with digits)
    const isZipSearch = /^\d/.test(q)

    if (isZipSearch) {
      // Search ZIP codes by prefix
      const { data: zips, error: zipError } = await client
        .from('zip_codes')
        .select('zip, city_name, state_code, state_name, lat, lng, city_id')
        .ilike('zip', `${q}%`)
        .limit(limit)

      if (zipError) throw zipError

      for (const zip of zips || []) {
        results.push({
          type: 'zip',
          value: `${zip.zip} - ${zip.city_name}, ${zip.state_code}`,
          cityName: zip.city_name,
          citySlug: null, // Will be resolved on selection
          stateCode: zip.state_code,
          stateName: zip.state_name,
          lat: zip.lat,
          lng: zip.lng,
          zip: zip.zip,
          cityId: zip.city_id || undefined
        })
      }
    } else {
      // Search cities first (from our cities table - these have contractor data)
      const { data: cities, error: cityError } = await client
        .from('cities')
        .select('id, name, slug, state_code, coordinates')
        .ilike('name', `${q}%`)
        .limit(Math.ceil(limit / 2))

      if (cityError) throw cityError

      // Get state names for cities
      const stateNames: Record<string, string> = {
        AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
        CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
        HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
        KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
        MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
        MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
        NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
        OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
        SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
        VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
        DC: 'District of Columbia'
      }

      for (const city of cities || []) {
        // Extract lat/lng from PostGIS point
        const coords = city.coordinates as unknown as { coordinates: [number, number] } | null
        results.push({
          type: 'city',
          value: `${city.name}, ${city.state_code}`,
          cityName: city.name,
          citySlug: city.slug,
          stateCode: city.state_code,
          stateName: stateNames[city.state_code] || city.state_code,
          lat: coords?.coordinates?.[1] || 0,
          lng: coords?.coordinates?.[0] || 0,
          cityId: city.id
        })
      }

      // Also search ZIP codes by city name (for cities not in our cities table)
      const remainingLimit = limit - results.length
      if (remainingLimit > 0) {
        const { data: zips, error: zipError } = await client
          .from('zip_codes')
          .select('zip, city_name, state_code, state_name, lat, lng, city_id')
          .ilike('city_name', `${q}%`)
          .is('city_id', null) // Only get ZIPs without matching city
          .limit(remainingLimit)

        if (zipError) throw zipError

        // Dedupe by city_name + state_code
        const seen = new Set(results.map(r => `${r.cityName}_${r.stateCode}`))
        for (const zip of zips || []) {
          const key = `${zip.city_name}_${zip.state_code}`
          if (!seen.has(key)) {
            seen.add(key)
            results.push({
              type: 'zip',
              value: `${zip.city_name}, ${zip.state_code}`,
              cityName: zip.city_name,
              citySlug: null,
              stateCode: zip.state_code,
              stateName: zip.state_name,
              lat: zip.lat,
              lng: zip.lng,
              zip: zip.zip
            })
          }
        }
      }
    }

    return results
  } catch (error) {
    consola.error('Location search error:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to search locations'
    })
  }
})

