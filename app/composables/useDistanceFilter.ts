/**
 * useDistanceFilter composable
 *
 * Provides geolocation-aware distance filtering for contractor searches.
 * Uses VueUse's useGeolocation() to get user's position on-demand.
 * Auto-requests geolocation when a distance is selected.
 */

import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'
import { useGeolocation } from '@vueuse/core'
import { consola } from 'consola'
import type { FilterOption } from '~/components/ui/form/FilterSelect.vue'

export interface DistanceFilterReturn {
  /** Whether geolocation is supported in the browser */
  isSupported: ComputedRef<boolean>
  /** Whether geolocation permission has been granted */
  hasPermission: ComputedRef<boolean>
  /** Whether we're currently requesting location */
  isLocating: ComputedRef<boolean>
  /** Whether permission was denied */
  permissionDenied: ComputedRef<boolean>
  /** User's latitude (if available) */
  lat: ComputedRef<number | null>
  /** User's longitude (if available) */
  lng: ComputedRef<number | null>
  /** Error message if geolocation failed */
  error: ComputedRef<string | null>
  /** Selected distance in miles (null = any distance) */
  selectedDistance: Ref<number | null>
  /** Distance filter options (dynamically disabled based on permission) */
  distanceOptions: ComputedRef<FilterOption[]>
  /** Whether distance filtering is enabled (has location) */
  isEnabled: ComputedRef<boolean>
  /** Request geolocation permission and get position */
  requestLocation: () => Promise<void>
  /** Set the selected distance filter (auto-requests location if needed) */
  setDistance: (distance: number | null) => void
  /** Reset the filter state */
  reset: () => void
  /** Tooltip text when filter is disabled */
  disabledTooltip: string
}

/**
 * =============================================================================
 * DEV-ONLY: TEST COORDINATES FEATURE
 * =============================================================================
 *
 * This feature allows testing the distance filter without requiring actual
 * geolocation permission. It adds a test option to the distance dropdown
 * that simulates coordinates for North Charleston, SC (where contractors exist).
 *
 * TO REVERT THIS FEATURE:
 * 1. Delete TEST_COORDS constant below
 * 2. Delete useTestCoords ref in useDistanceFilter() (~line 58)
 * 3. Remove TEST_COORDS checks in lat/lng computed props (~lines 85-92)
 * 4. Remove devOptions from distanceOptions computed (~lines 126-128)
 * 5. Remove test-* handling in setDistance() function (~lines 178-188)
 * 6. In app/pages/landscapers/index.vue, remove the test-* check
 *    in the distance filter watcher (~lines 172-174)
 *
 * The feature is gated by import.meta.dev so it won't appear in production.
 * =============================================================================
 */
const TEST_COORDS = {
  lat: 32.8546,
  lng: -79.9748
}

export function useDistanceFilter(): DistanceFilterReturn {
  // Internal state
  const selectedDistance = ref<number | null>(null)
  const hasRequestedLocation = ref(false)
  const locationError = ref<string | null>(null)
  const permissionDeniedFlag = ref(false)
  const useTestCoords = ref(false) // Flag for using test coordinates

  // VueUse geolocation (starts paused - on-demand only)
  const {
    coords,
    locatedAt,
    error: geoError,
    isSupported,
    pause,
    resume
  } = useGeolocation({
    enableHighAccuracy: true,
    immediate: false // Don't request location immediately
  })

  // Computed values
  const hasPermission = computed(() => locatedAt.value !== null || useTestCoords.value)

  const permissionDenied = computed(() => {
    // Check if error code 1 (permission denied) occurred
    if (geoError.value?.code === 1) {
      permissionDeniedFlag.value = true
    }
    return permissionDeniedFlag.value
  })

  const lat = computed(() => {
    if (useTestCoords.value) return TEST_COORDS.lat
    if (!locatedAt.value || !coords.value) return null
    return coords.value.latitude
  })

  const lng = computed(() => {
    if (useTestCoords.value) return TEST_COORDS.lng
    if (!locatedAt.value || !coords.value) return null
    return coords.value.longitude
  })

  const isLocating = computed(() => hasRequestedLocation.value && !hasPermission.value && !error.value)

  const isEnabled = computed(() => hasPermission.value && lat.value !== null && lng.value !== null)

  const error = computed(() => {
    if (geoError.value) {
      switch (geoError.value.code) {
        case 1: return 'Location permission denied'
        case 2: return 'Position unavailable'
        case 3: return 'Location request timed out'
        default: return 'Failed to get location'
      }
    }
    return locationError.value
  })

  // Distance filter options - disable distance options if permission denied
  const distanceOptions = computed<FilterOption[]>(() => {
    const baseOptions: FilterOption[] = [
      { value: 'all', label: 'Any Distance' }
    ]

    const distanceChoices: FilterOption[] = [
      { value: '5', label: 'Within 5 miles', disabled: permissionDenied.value },
      { value: '10', label: 'Within 10 miles', disabled: permissionDenied.value },
      { value: '25', label: 'Within 25 miles', disabled: permissionDenied.value },
      { value: '50', label: 'Within 50 miles', disabled: permissionDenied.value },
      { value: '100', label: 'Within 100 miles', disabled: permissionDenied.value }
    ]

    // DEV ONLY: Add test location option
    const devOptions: FilterOption[] = import.meta.dev ? [
      { value: 'test-25', label: '🧪 Test: 25mi from N. Charleston, SC' }
    ] : []

    return [...baseOptions, ...distanceChoices, ...devOptions]
  })

  // Watch for geolocation errors to handle permission denial
  watch(geoError, (newError) => {
    if (newError?.code === 1) {
      permissionDeniedFlag.value = true
      // Reset the selected distance since we can't use it
      selectedDistance.value = null
      if (import.meta.dev) {
        consola.warn('Distance filter: Location permission denied, disabling distance options')
      }
    }
  })

  // Watch for successful location acquisition
  watch([lat, lng], ([newLat, newLng]) => {
    if (newLat !== null && newLng !== null) {
      if (import.meta.dev) {
        consola.success(`Distance filter: User location acquired - Lat: ${newLat.toFixed(6)}, Lng: ${newLng.toFixed(6)}`)
      }
    }
  })

  // Request geolocation permission
  async function requestLocation(): Promise<void> {
    if (!isSupported.value) {
      locationError.value = 'Geolocation is not supported by your browser'
      return
    }

    if (permissionDenied.value) {
      if (import.meta.dev) {
        consola.warn('Distance filter: Cannot request location - permission previously denied')
      }
      return
    }

    hasRequestedLocation.value = true
    locationError.value = null
    resume() // Start watching position
  }

  // Set selected distance (auto-requests location if needed)
  // Accepts raw distance value OR special test value like 'test-25'
  function setDistance(distanceInput: number | string | null): void {
    // Handle test coordinates option (DEV only)
    if (typeof distanceInput === 'string' && distanceInput.startsWith('test-')) {
      const testDistance = parseInt(distanceInput.replace('test-', ''), 10)
      useTestCoords.value = true
      selectedDistance.value = testDistance
      if (import.meta.dev) {
        consola.success(`Distance filter: Using TEST coordinates (N. Charleston, SC) - Lat: ${TEST_COORDS.lat}, Lng: ${TEST_COORDS.lng}`)
      }
      return
    }

    // Reset test mode if switching to real geolocation
    useTestCoords.value = false

    const distance = typeof distanceInput === 'number' ? distanceInput : null
    selectedDistance.value = distance

    // Auto-request location when a distance is selected (not "all")
    if (distance !== null && !hasPermission.value && !permissionDenied.value) {
      if (import.meta.dev) {
        consola.info('Distance filter: Auto-requesting location for distance filter')
      }
      requestLocation()
    }
  }

  // Reset filter state
  function reset(): void {
    selectedDistance.value = null
    // Note: Don't reset permissionDeniedFlag - once denied, stays denied for session
    pause()
  }

  return {
    // State (reactive)
    isSupported,
    hasPermission,
    isLocating,
    permissionDenied,
    lat,
    lng,
    error,
    selectedDistance,
    // Computed
    distanceOptions,
    isEnabled,
    disabledTooltip: 'Enable location to use this filter',
    // Methods
    requestLocation,
    setDistance,
    reset
  }
}

