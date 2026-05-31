import { reactive, computed, type ComputedRef } from 'vue'

/**
 * Search filter state interface
 */
export interface SearchFilters {
  serviceType: string | null
  distance: string | null
  rating: string | null
  availability: string | null
  sortBy: string | null
}

/**
 * Review interface for contractor reviews
 */
export interface Review {
  /** Unique identifier for the review */
  id: string
  /** Name of the reviewer */
  authorName: string
  /** Initials for avatar display (e.g., "JD" for John Doe) */
  authorInitials: string
  /** Rating from 1-5 */
  rating: number
  /** ISO date string of when the review was posted */
  date: string
  /** Review headline/title */
  title: string
  /** Full review content */
  content: string
  /** Whether the reviewer is verified */
  verified: boolean
  /** Type of service received (e.g., "Driveway Replacement") */
  serviceType: string
  /** Number of "helpful" votes */
  helpful: number
}

/**
 * Contractor result interface (example - adjust based on your data model)
 */
export interface ContractorResult {
  id: string
  companyName: string
  serviceType: string
  location: string
  distance?: number // in miles
  rating: number
  reviewCount: number
  availability: string
  priceRange: string
  image?: string
  slug: string
  reviews?: Review[]
  [key: string]: any // Allow additional properties
}

/**
 * Composable return type
 */
export interface UseSearchFiltersReturn {
  filters: SearchFilters
  filteredResults: ComputedRef<ContractorResult[]>
  resultCount: ComputedRef<number>
  resetFilters: () => void
  hasActiveFilters: ComputedRef<boolean>
  applySort: (results: ContractorResult[]) => ContractorResult[]
}

/**
 * Composable for managing search filters and filtering results
 *
 * @param initialData - Array of contractor results to filter
 * @returns Object containing filters, filtered results, and helper methods
 *
 * @example
 * ```ts
 * const contractors = ref([...])
 * const { filters, filteredResults, resetFilters, hasActiveFilters } = useSearchFilters(contractors.value)
 * ```
 */
export function useSearchFilters(initialData: ContractorResult[]): UseSearchFiltersReturn {
  // Reactive filter state
  const filters = reactive<SearchFilters>({
    serviceType: null,
    distance: null,
    rating: null,
    availability: null,
    sortBy: null
  })

  /**
   * Filter contractors based on service type
   */
  const filterByServiceType = (contractors: ContractorResult[]): ContractorResult[] => {
    if (!filters.serviceType || filters.serviceType === 'all') return contractors
    return contractors.filter(contractor => contractor.serviceType === filters.serviceType)
  }

  /**
   * Filter contractors based on distance
   */
  const filterByDistance = (contractors: ContractorResult[]): ContractorResult[] => {
    if (!filters.distance || filters.distance === 'all') return contractors

    const maxDistance = Number(filters.distance)
    return contractors.filter(contractor => {
      if (!contractor.distance) return true // Include if distance not specified
      return contractor.distance <= maxDistance
    })
  }

  /**
   * Filter contractors based on minimum rating
   */
  const filterByRating = (contractors: ContractorResult[]): ContractorResult[] => {
    if (!filters.rating || filters.rating === 'all') return contractors

    const minRating = Number(filters.rating)
    return contractors.filter(contractor => contractor.rating >= minRating)
  }

  /**
   * Filter contractors based on availability
   */
  const filterByAvailability = (contractors: ContractorResult[]): ContractorResult[] => {
    if (!filters.availability || filters.availability === 'all') return contractors
    return contractors.filter(contractor => contractor.availability === filters.availability)
  }

  /**
   * Apply sorting to results
   */
  const applySort = (contractors: ContractorResult[]): ContractorResult[] => {
    if (!filters.sortBy || filters.sortBy === 'default') return contractors

    const sorted = [...contractors]

    switch (filters.sortBy) {
      case 'rating-high':
        return sorted.sort((a, b) => b.rating - a.rating)
      case 'rating-low':
        return sorted.sort((a, b) => a.rating - b.rating)
      case 'distance-near':
        return sorted.sort((a, b) => (a.distance || 999) - (b.distance || 999))
      case 'distance-far':
        return sorted.sort((a, b) => (b.distance || 0) - (a.distance || 0))
      case 'reviews-most':
        return sorted.sort((a, b) => b.reviewCount - a.reviewCount)
      case 'reviews-least':
        return sorted.sort((a, b) => a.reviewCount - b.reviewCount)
      default:
        return sorted
    }
  }

  /**
   * Computed: Filtered and sorted results
   */
  const filteredResults = computed(() => {
    let results = [...initialData]

    // Apply filters in sequence
    results = filterByServiceType(results)
    results = filterByDistance(results)
    results = filterByRating(results)
    results = filterByAvailability(results)

    // Apply sorting
    results = applySort(results)

    return results
  })

  /**
   * Computed: Result count
   */
  const resultCount = computed(() => filteredResults.value.length)

  /**
   * Computed: Check if any filters are active
   */
  const hasActiveFilters = computed(() => {
    return Object.entries(filters).some(([key, value]) => {
      // Ignore sortBy for "active filters" check
      if (key === 'sortBy') return false
      return value !== null && value !== 'all'
    })
  })

  /**
   * Reset all filters to default state
   */
  const resetFilters = () => {
    filters.serviceType = null
    filters.distance = null
    filters.rating = null
    filters.availability = null
    filters.sortBy = null
  }

  return {
    filters,
    filteredResults,
    resultCount,
    resetFilters,
    hasActiveFilters,
    applySort
  }
}

