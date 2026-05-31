/**
 * Composable for admin system accounts management
 *
 * Provides methods for:
 * - Listing system accounts with filters and pagination
 * - Inviting new system users
 * - Getting account details
 * - Updating account status (suspend/reactivate)
 * - Deleting accounts (soft delete)
 */

import type {
  SystemAccount,
  SystemAccountsFilters,
  SystemAccountsResponse,
  InviteSystemUserResponse,
  UpdateAccountResponse,
} from '~/types/accounts'

export function useAdminSystemAccounts() {
  // State
  const accounts = ref<SystemAccount[]>([])
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
   * Fetch system accounts from API with filters
   */
  const fetchAccounts = async (filters: SystemAccountsFilters = {}) => {
    try {
      pending.value = true
      error.value = null

      // Build query parameters
      const query: Record<string, unknown> = {}

      if (filters.status && filters.status !== 'all') {
        query.status = filters.status
      }
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
      const response = await $fetch<SystemAccountsResponse>('/api/admin/accounts/system', { query })

      if (response.success) {
        accounts.value = response.data
        pagination.value = response.pagination
      }
    } catch (err) {
      error.value = err as Error
      console.error('Error fetching system accounts:', err)
    } finally {
      pending.value = false
    }
  }

  /**
   * Get a single system account by ID
   */
  const getAccount = async (accountId: string): Promise<SystemAccount | null> => {
    try {
      const response = await $fetch<{ success: boolean; data: SystemAccount }>(
        `/api/admin/accounts/system/${accountId}`
      )
      return response.success ? response.data : null
    } catch (err) {
      error.value = err as Error
      console.error('Error fetching account:', err)
      return null
    }
  }

  /**
   * Invite a new system user
   */
  const inviteUser = async (
    email: string,
    displayName?: string
  ): Promise<InviteSystemUserResponse> => {
    try {
      const response = await $fetch<InviteSystemUserResponse>(
        '/api/admin/accounts/system/invite',
        {
          method: 'POST',
          body: { email, displayName },
        }
      )
      return response
    } catch (err: any) {
      error.value = err
      return {
        success: false,
        message: err.data?.message || 'Failed to invite user',
      }
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
        `/api/admin/accounts/system/${accountId}`,
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
   * Delete account (soft delete)
   */
  const deleteAccount = async (accountId: string): Promise<UpdateAccountResponse> => {
    try {
      const response = await $fetch<UpdateAccountResponse>(
        `/api/admin/accounts/system/${accountId}`,
        {
          method: 'DELETE',
        }
      )
      return response
    } catch (err: any) {
      error.value = err
      return {
        success: false,
        message: err.data?.message || 'Failed to delete account',
      }
    }
  }

  /**
   * Refresh the current accounts list
   */
  const refresh = async (filters: SystemAccountsFilters = {}) => {
    await fetchAccounts(filters)
  }

  return {
    accounts: readonly(accounts),
    pagination: readonly(pagination),
    pending: readonly(pending),
    error: readonly(error),
    fetchAccounts,
    getAccount,
    inviteUser,
    updateAccountStatus,
    deleteAccount,
    refresh,
  }
}

