import type { Database } from '~/types/supabase'

type Contractor = Database['public']['Tables']['contractors']['Row']
type City = Database['public']['Tables']['cities']['Row']

// Contractor with city relation
export interface ContractorWithCity extends Contractor {
  city: Pick<City, 'id' | 'name' | 'slug' | 'state_code'> | null
}

export interface AdminContractorsFilters {
  /** Filter by city UUID */
  cityId?: string | null
  /** Filter by category slug */
  category?: string | null
  /** Filter by status (pending, active, suspended) */
  status?: 'pending' | 'active' | 'suspended' | null
  /** Search by company name */
  search?: string | null
  /** Filter by image processing status */
  imagesProcessed?: boolean | null
  /** Current page number (1-based) */
  page?: number
  /** Number of items per page */
  limit?: number
  /** Sort field */
  orderBy?: 'company_name' | 'rating' | 'review_count' | 'created_at' | 'updated_at'
  /** Sort direction */
  orderDirection?: 'asc' | 'desc'
}

export interface AdminContractorsResponse {
  success: boolean
  data: ContractorWithCity[]
  pagination: {
    total: number
    page: number
    limit: number
    offset: number
    totalPages: number
  }
}

/**
 * Composable for admin contractor management
 *
 * Provides methods for:
 * - Listing contractors with filters and pagination
 * - Deleting contractors
 * - Refreshing contractor list
 */
export function useAdminContractors() {
  // State
  const contractors = ref<ContractorWithCity[]>([])
  const pagination = ref({
    total: 0,
    page: 1,
    limit: 20,
    offset: 0,
    totalPages: 0,
  })
  const pending = ref(false)
  const error = ref<Error | null>(null)

  /**
   * Fetch contractors from API with filters
   */
  const fetchContractors = async (filters: AdminContractorsFilters = {}) => {
    try {
      pending.value = true
      error.value = null

      // Build query parameters
      const query: Record<string, unknown> = {}

      if (filters.cityId) query.cityId = filters.cityId
      if (filters.category) query.category = filters.category
      if (filters.status) query.status = filters.status
      if (filters.search) query.search = filters.search
      if (filters.imagesProcessed !== undefined && filters.imagesProcessed !== null) {
        query.imagesProcessed = filters.imagesProcessed
      }

      // Calculate offset from page number
      const page = filters.page || 1
      const limit = filters.limit || 20
      const offset = (page - 1) * limit

      query.limit = limit
      query.offset = offset

      if (filters.orderBy) query.orderBy = filters.orderBy
      if (filters.orderDirection) query.orderDirection = filters.orderDirection

      // Fetch from API
      const response = await $fetch<AdminContractorsResponse>('/api/contractors', { query })

      if (response.success) {
        contractors.value = response.data
        pagination.value = response.pagination
      }
    } catch (err) {
      error.value = err as Error
    } finally {
      pending.value = false
    }
  }

  /**
   * Delete a contractor by ID
   */
  const deleteContractor = async (contractorId: string): Promise<boolean> => {
    try {
      await $fetch(`/api/contractors/${contractorId}`, { method: 'DELETE' })
      return true
    } catch (err) {
      error.value = err as Error
      return false
    }
  }

  /**
   * Refresh the current contractor list
   */
  const refresh = async (filters: AdminContractorsFilters = {}) => {
    await fetchContractors(filters)
  }

  /**
   * Bulk update status
   */
  const bulkUpdateStatus = async (payload: { ids?: string[]; filters?: object; status: string }) => {
    return await $fetch('/api/contractors/bulk-update', { method: 'POST', body: payload })
  }

  /**
   * Bulk delete contractors
   */
  const bulkDelete = async (payload: { ids?: string[]; filters?: object }) => {
    return await $fetch('/api/contractors/bulk-delete', { method: 'POST', body: payload })
  }

  /**
   * Get count of contractors matching filters
   */
  const getCount = async (filters: object) => {
    return await $fetch('/api/contractors/count', { query: filters })
  }

  return {
    contractors: readonly(contractors),
    pagination: readonly(pagination),
    pending: readonly(pending),
    error: readonly(error),
    fetchContractors,
    deleteContractor,
    refresh,
    bulkUpdateStatus,
    bulkDelete,
    getCount,
  }
}

