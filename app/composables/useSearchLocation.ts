/**
 * useSearchLocation composable
 *
 * Stores selected location coordinates from search input for use in
 * distance-based sorting on destination pages.
 *
 * Uses localStorage for persistence across page reloads and useState
 * for reactivity during SPA navigation.
 */

import { useState } from '#app'
import { useLocalStorage } from '@vueuse/core'
import { watch, computed } from 'vue'

export interface SearchLocationData {
  /** Latitude of the selected location */
  lat: number
  /** Longitude of the selected location */
  lng: number
  /** Display name (city name or ZIP code) */
  displayName: string
  /** Type of location (city or zip) */
  type: 'city' | 'zip'
  /** City slug if available */
  citySlug?: string
  /** State code */
  stateCode: string
  /** Timestamp when location was set */
  timestamp: number
}

const STORAGE_KEY = 'coc-search-location'
const EXPIRY_HOURS = 24 // Location expires after 24 hours

export function useSearchLocation() {
  // localStorage for persistence across page reloads
  const storedLocation = useLocalStorage<SearchLocationData | null>(STORAGE_KEY, null)

  // useState for SSR-safe reactivity during SPA navigation
  const location = useState<SearchLocationData | null>('search-location', () => null)

  // Sync localStorage to useState on mount (client-side only)
  if (import.meta.client) {
    // Check if stored location is expired
    if (storedLocation.value) {
      const expiryTime = storedLocation.value.timestamp + (EXPIRY_HOURS * 60 * 60 * 1000)
      if (Date.now() > expiryTime) {
        storedLocation.value = null
      } else {
        location.value = storedLocation.value
      }
    }

    // Watch for changes and sync to localStorage
    watch(location, (newValue) => {
      storedLocation.value = newValue
    }, { deep: true })
  }

  // Computed values for easy access
  const hasLocation = computed(() => location.value !== null)
  const lat = computed(() => location.value?.lat ?? null)
  const lng = computed(() => location.value?.lng ?? null)
  const displayName = computed(() => location.value?.displayName ?? null)

  /**
   * Set the search location from a location result
   */
  function setLocation(data: Omit<SearchLocationData, 'timestamp'>) {
    location.value = {
      ...data,
      timestamp: Date.now()
    }
  }

  /**
   * Clear the stored location
   */
  function clearLocation() {
    location.value = null
  }

  /**
   * Check if we have valid coordinates for distance sorting
   */
  function hasValidCoordinates(): boolean {
    return location.value !== null &&
           typeof location.value.lat === 'number' &&
           typeof location.value.lng === 'number'
  }

  return {
    // State
    location: readonly(location),
    hasLocation,
    lat,
    lng,
    displayName,

    // Methods
    setLocation,
    clearLocation,
    hasValidCoordinates
  }
}

