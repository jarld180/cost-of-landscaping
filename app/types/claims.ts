/**
 * Claims Flow Types
 * Types for the business claims verification and activation workflow
 */

import type { Database } from './supabase'

// Base types from Supabase
export type BusinessClaimRow = Database['public']['Tables']['business_claims']['Row']
export type ContractorRow = Database['public']['Tables']['contractors']['Row']

/**
 * Claim status enum matching database constraint
 */
export type ClaimStatus = 'unverified' | 'pending' | 'approved' | 'rejected' | 'completed'

/**
 * Claim with contractor relation for admin views
 */
export interface ClaimWithContractor extends BusinessClaimRow {
  contractor: Pick<ContractorRow, 'id' | 'company_name' | 'slug' | 'email' | 'phone'> | null
}

/**
 * Public claim submission request
 */
export interface ClaimSubmitRequest {
  contractorId: string
  claimantName: string
  claimantEmail: string
  claimantPhone?: string
}

/**
 * Email verification request (from /claim/verify page)
 */
export interface ClaimVerifyRequest {
  token: string
}

/**
 * Email verification response
 */
export interface ClaimVerifyResponse {
  success: boolean
  message: string
  claimId?: string
  contractorName?: string
}

/**
 * Account activation request (from /claim/activate page)
 */
export interface ClaimActivateRequest {
  token: string
  password: string
}

/**
 * Account activation response
 */
export interface ClaimActivateResponse {
  success: boolean
  message: string
  redirectUrl?: string
}

/**
 * Token validation result for verification/activation pages
 */
export interface TokenValidationResult {
  valid: boolean
  expired: boolean
  claimId?: string
  contractorName?: string
  claimantEmail?: string
  errorMessage?: string
}

/**
 * Admin claims filter options
 */
export interface AdminClaimsFilters {
  status?: ClaimStatus | 'all' | null
  search?: string | null
  page?: number
  limit?: number
  orderBy?: 'created_at' | 'updated_at'
  orderDirection?: 'asc' | 'desc'
}

/**
 * Admin claims list response
 */
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
 * Admin claim update request (approve/reject)
 */
export interface AdminClaimUpdateRequest {
  status: 'approved' | 'rejected'
  adminNotes?: string
}

/**
 * Resend verification email request (from /claim/verify expired page)
 */
export interface ResendVerificationRequest {
  claimId?: string
  email?: string
  contractorId?: string
}

/**
 * Resend activation email request
 */
export interface ResendActivationRequest {
  claimId: string
}
