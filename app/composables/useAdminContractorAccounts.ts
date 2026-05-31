/**
 * Composable for admin contractor accounts management
 *
 * Provides methods for:
 * - Listing contractor accounts with filters and pagination
 * - Getting account details with claimed profiles
 * - Updating account status (suspend/reactivate)
 */

import type {
  ContractorAccount,
  ContractorAccountsFilters,
  ContractorAccountsResponse,
  UpdateAccountResponse,
} from '~/types/accounts'

export function useAdminContractorAccounts() {
  // State
  const accounts = ref<ContractorAccount[]>([])
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
   * Fetch contractor accounts with filters
   */
  const fetchAccounts = async (filters: ContractorAccountsFilters = {}) => {
    pending.value = true
    error.value = null

    try {
      const query: Record<string, string | number> = {}

      if (filters.status && filters.status !== 'all') query.status = filters.status
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
      const response = await $fetch<ContractorAccountsResponse>('/api/admin/accounts/contractors', { query })

      if (response.success) {
        accounts.value = response.data
        pagination.value = response.pagination
      }
    } catch (err) {
      error.value = err as Error
      console.error('Error fetching contractor accounts:', err)
    } finally {
      pending.value = false
    }
  }

  /**
   * Get a single contractor account by ID
   */
  const getAccount = async (accountId: string): Promise<ContractorAccount | null> => {
    try {
      const response = await $fetch<{ success: boolean; data: ContractorAccount }>(
        `/api/admin/accounts/contractors/${accountId}`
      )
      return response.success ? response.data : null
    } catch (err) {
      error.value = err as Error
      console.error('Error fetching contractor account:', err)
      return null
    }
  }

  /**
   * Update account status (suspend/reactivate)
   */
  const updateAccountStatus = async (
    accountId: string,
    status: 'active' | 'suspended'
  ): Promise<UpdateAccountResponse> => {
    try {
      const response = await $fetch<UpdateAccountResponse>(
        `/api/admin/accounts/contractors/${accountId}`,
        {
          method: 'PATCH',
          body: { status },
        }
      )
      return response
    } catch (err: any) {
      error.value = err
      return {
        success: false,
        message: err.data?.message || 'Failed to update account',
      }
    }
  }

  /**
   * Refresh the current accounts list
   */
  const refresh = async (filters: ContractorAccountsFilters = {}) => {
    await fetchAccounts(filters)
  }

  return {
    accounts: readonly(accounts),
    pagination: readonly(pagination),
    pending: readonly(pending),
    error: readonly(error),
    fetchAccounts,
    getAccount,
    updateAccountStatus,
    refresh,
  }
}

