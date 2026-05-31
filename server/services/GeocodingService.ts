/**
 * Geocoding Service
 *
 * Wrapper for Google Geocoding API to reverse geocode lat/lng to city/state.
 * Used when Apify data is missing city or state information.
 *
 * Rate limiting: 100ms delay between calls to avoid hitting API limits.
 */

import { consola } from 'consola'
import { GEOCODING_DELAY_MS } from '../schemas/import.schemas'

export interface GeocodingResult {
  city: string | null
  stateCode: string | null
  success: boolean
}

export class GeocodingService {
  private apiKey: string
  private lastCallTime: number = 0

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  /**
   * Delay to respect rate limiting
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now()
    const timeSinceLastCall = now - this.lastCallTime
    if (timeSinceLastCall < GEOCODING_DELAY_MS) {
      await new Promise(resolve => setTimeout(resolve, GEOCODING_DELAY_MS - timeSinceLastCall))
    }
    this.lastCallTime = Date.now()
  }

  /**
   * Reverse geocode lat/lng to city and state
   *
   * @param lat - Latitude
   * @param lng - Longitude
   * @returns City and state code, or null values on failure
   */
  async reverseGeocode(lat: number, lng: number): Promise<GeocodingResult> {
    // Check if API key is configured
    if (!this.apiKey) {
      consola.warn('GeocodingService: No API key configured, skipping reverse geocode')
      return { city: null, stateCode: null, success: false }
    }

    try {
      await this.rateLimit()

      const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
      url.searchParams.set('latlng', `${lat},${lng}`)
      url.searchParams.set('key', this.apiKey)
      url.searchParams.set('result_type', 'locality|administrative_area_level_1')

      if (import.meta.dev) {
        consola.info(`GeocodingService: Reverse geocoding ${lat}, ${lng}`)
      }

      const response = await fetch(url.toString())

      if (!response.ok) {
        consola.warn(`GeocodingService: HTTP error ${response.status}`)
        return { city: null, stateCode: null, success: false }
      }

      const data = await response.json()

      if (data.status === 'ZERO_RESULTS') {
        consola.warn(`GeocodingService: No results for ${lat}, ${lng}`)
        return { city: null, stateCode: null, success: false }
      }

      if (data.status !== 'OK') {
        consola.warn(`GeocodingService: API error - ${data.status}: ${data.error_message || 'Unknown error'}`)
        return { city: null, stateCode: null, success: false }
      }

      // Extract city and state from address components
      let city: string | null = null
      let stateCode: string | null = null

      for (const result of data.results || []) {
        for (const component of result.address_components || []) {
          const types: string[] = component.types || []

          if (types.includes('locality') && !city) {
            city = component.long_name
          }

          if (types.includes('administrative_area_level_1') && !stateCode) {
            stateCode = component.short_name // Already abbreviated (e.g., "NC")
          }
        }

        // Stop if we found both
        if (city && stateCode) break
      }

      if (import.meta.dev) {
        consola.success(`GeocodingService: Found city=${city}, state=${stateCode}`)
      }

      return { city, stateCode, success: !!(city || stateCode) }
    } catch (error) {
      consola.error('GeocodingService: Unexpected error during reverse geocode', error)
      return { city: null, stateCode: null, success: false }
    }
  }
}

