import type { Database } from '~/types/supabase'
import type { ClaimStatus } from '~/types/claims'

type BusinessClaim = Database['public']['Tables']['business_claims']['Row']
type Contractor = Database['public']['Tables']['contractors']['Row']

// Claim with contractor relation
export interface ClaimWithContractor extends BusinessClaim {
  contractor: Pick<Contractor, 'id' | 'company_name' | 'slug' | 'email' | 'phone'> | null
}

export interface AdminClaimsFilters {
  /** Filter by claim status (all 5 statuses or 'all' for no filter) */
  status?: ClaimStatus | 'all' | null
  /** Search by claimant name or email */
  search?: string | null
  /** Current page number (1-based) */
  page?: number
  /** Number of items per page */
  limit?: number
  /** Sort field */
  orderBy?: 'created_at' | 'updated_at'
  /** Sort direction */
  orderDirection?: 'asc' | 'desc'
}

export interface AdminClaimsResponse {
  success: boolean
  data: ClaimWithContractor[]
  pagination: {
    total: number
    page: number
    limit: number
    offset: number
    totalPages: number
  }
}

/**
 * Composable for admin business claims management
 *
 * Provides methods for:
 * - Listing claims with filters and pagination
 * - Approving/rejecting claims
 * - Refreshing claims list
 */
export function useAdminClaims() {
  // State
  const claims = ref<ClaimWithContractor[]>([])
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
   * Fetch claims from API with filters
   */
  const fetchClaims = async (filters: AdminClaimsFilters = {}) => {
    try {
      pending.value = true
      error.value = null

      // Build query parameters
      const query: Record<string, unknown> = {}

      if (filters.status) query.status = filters.status
      if (filters.search) query.search = filters.search

      // Calculate offset from page number
      const page = filters.page || 1
      const limit = filters.limit || 20
      const offset = (page - 1) * limit

      query.limit = limit
      query.offset = offset

      if (filters.orderBy) query.orderBy = filters.orderBy
      if (filters.orderDirection) query.orderDirection = filters.orderDirection

      // Fetch from API
      const response = await $fetch<AdminClaimsResponse>('/api/claims', { query })

      if (response.success) {
        claims.value = response.data
        pagination.value = response.pagination
      }
    } catch (err) {
      error.value = err as Error
      console.error('Error fetching claims:', err)
    } finally {
      pending.value = false
    }
  }

  /**
   * Approve or reject a claim
   */
  const updateClaimStatus = async (
    claimId: string,
    status: 'approved' | 'rejected',
    adminNotes?: string
  ): Promise<boolean> => {
    try {
      await $fetch(`/api/claims/${claimId}`, {
        method: 'PATCH',
        body: { status, adminNotes },
      })
      return true
    } catch (err) {
      error.value = err as Error
      console.error('Error updating claim:', err)
      return false
    }
  }

  /**
   * Resend activation email for an approved claim
   */
  const resendActivationEmail = async (claimId: string): Promise<boolean> => {
    try {
      await $fetch(`/api/claims/${claimId}/resend-activation`, {
        method: 'POST',
      })
      return true
    } catch (err) {
      error.value = err as Error
      console.error('Error resending activation email:', err)
      return false
    }
  }

  /**
   * Refresh the current claims list
   */
  const refresh = async (filters: AdminClaimsFilters = {}) => {
    await fetchClaims(filters)
  }

  return {
    claims: readonly(claims),
    pagination: readonly(pagination),
    pending: readonly(pending),
    error: readonly(error),
    fetchClaims,
    updateClaimStatus,
    resendActivationEmail,
    refresh,
  }
}

