/**
 * Account Management Types
 * Types for System Accounts (CoC staff) and Contractor Accounts (business users)
 */

import type { Database } from './supabase'
import type { ContractorRow } from './claims'

// Base type from Supabase
export type AccountProfileRow = Database['public']['Tables']['account_profiles']['Row']

/**
 * Account type enum
 */
export type AccountType = 'admin' | 'business'

/**
 * Account status enum matching database constraint
 */
export type AccountStatus = 'active' | 'suspended' | 'deleted'

/**
 * System account (CoC staff user) with auth details
 */
export interface SystemAccount extends AccountProfileRow {
  email: string
  displayName?: string
  lastSignInAt?: string
}

/**
 * Contractor account (business user) with claimed profiles
 */
export interface ContractorAccount extends AccountProfileRow {
  email: string
  displayName?: string
  lastSignInAt?: string
  claimedProfiles: Pick<ContractorRow, 'id' | 'company_name' | 'slug'>[]
  claimedProfileCount: number
}

/**
 * System accounts filter options
 */
export interface SystemAccountsFilters {
  status?: AccountStatus | 'all' | null
  search?: string | null
  page?: number
  limit?: number
  orderBy?: 'created_at' | 'updated_at'
  orderDirection?: 'asc' | 'desc'
}

/**
 * System accounts list response
 */
export interface SystemAccountsResponse {
  success: boolean
  data: SystemAccount[]
  pagination: {
    total: number
    page: number
    limit: number
    offset: number
    totalPages: number
  }
}

/**
 * Contractor accounts filter options
 */
export interface ContractorAccountsFilters {
  status?: AccountStatus | 'all' | null
  search?: string | null
  page?: number
  limit?: number
  orderBy?: 'created_at' | 'updated_at'
  orderDirection?: 'asc' | 'desc'
}

/**
 * Contractor accounts list response
 */
export interface ContractorAccountsResponse {
  success: boolean
  data: ContractorAccount[]
  pagination: {
    total: number
    page: number
    limit: number
    offset: number
    totalPages: number
  }
}

/**
 * Invite system user request
 */
export interface InviteSystemUserRequest {
  email: string
  displayName?: string
}

/**
 * Invite system user response
 */
export interface InviteSystemUserResponse {
  success: boolean
  message: string
  accountId?: string
}

/**
 * Update account status request
 */
export interface UpdateAccountStatusRequest {
  status: AccountStatus
}

/**
 * Update account response
 */
export interface UpdateAccountResponse {
  success: boolean
  message: string
}

