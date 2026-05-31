/**
 * Authentication Utility
 *
 * Universal, lightweight authentication for API endpoints.
 * Backed by Supabase RLS policies for defense in depth.
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import type { H3Event } from 'h3'

/**
 * Require authentication for an API endpoint
 *
 * This function ensures that:
 * 1. A valid Supabase session exists
 * 2. The user is authenticated
 * 3. RLS policies will be enforced at the database level
 *
 * @param event - H3 event object
 * @throws {Error} - 401 Unauthorized if not authenticated
 * @returns {Promise<string>} - User ID of authenticated user
 *
 * @example
 * ```typescript
 * export default defineEventHandler(async (event) => {
 *   const userId = await requireAuth(event)
 *   // User is authenticated, proceed with logic
 * })
 * ```
 */
export async function requireAuth(event: H3Event): Promise<string> {
  try {
    // Get Supabase client from event context
    const client = await serverSupabaseClient(event)

    // Get current user session
    const { data: { user }, error } = await client.auth.getUser()

    if (error || !user) {
      if (import.meta.dev) {
        consola.warn('Authentication failed:', error?.message || 'No user session')
      }

      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
        message: 'Authentication required. Please log in.'
      })
    }

    if (import.meta.dev) {
      consola.success('User authenticated:', user.id)
    }

    return user.id
  } catch (error) {
    if (import.meta.dev) {
      consola.error('Auth error:', error)
    }

    // Re-throw if already an H3Error
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    // Otherwise create a new error
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Authentication failed'
    })
  }
}

/**
 * Optional authentication for an API endpoint
 *
 * Returns user ID if authenticated, null otherwise.
 * Useful for endpoints that have different behavior for authenticated vs anonymous users.
 *
 * @param event - H3 event object
 * @returns {Promise<string | null>} - User ID if authenticated, null otherwise
 *
 * @example
 * ```typescript
 * export default defineEventHandler(async (event) => {
 *   const userId = await optionalAuth(event)
 *   if (userId) {
 *     // Show personalized content
 *   } else {
 *     // Show public content
 *   }
 * })
 * ```
 */
export async function optionalAuth(event: H3Event): Promise<string | null> {
  try {
    const client = await serverSupabaseClient(event)
    const { data: { user } } = await client.auth.getUser()

    if (user) {
      if (import.meta.dev) {
        consola.info('Optional auth: User authenticated:', user.id)
      }
      return user.id
    }

    if (import.meta.dev) {
      consola.info('Optional auth: Anonymous user')
    }

    return null
  } catch (error) {
    if (import.meta.dev) {
      consola.warn('Optional auth error:', error)
    }
    return null
  }
}

/** Account status type for clarity */
export type AccountStatus = 'active' | 'suspended' | 'deleted' | null

/** Result from getAuthUserAndIsAdmin */
export interface AuthUserInfo {
  userId: string | null
  isAdmin: boolean | null
  status: AccountStatus
}

/**
 * Get authenticated user, admin flag, and account status for server-side route guards
 *
 * Returns the user ID (or null if unauthenticated), the is_admin flag,
 * and the account status from the account_profiles table.
 * This is intentionally non-throwing so that callers (like route middleware)
 * can decide whether to redirect or throw.
 */
export async function getAuthUserAndIsAdmin(event: H3Event): Promise<AuthUserInfo> {
  try {
    const client = await serverSupabaseClient(event)
    const { data: { user }, error } = await client.auth.getUser()

    if (error || !user) {
      if (import.meta.dev) {
        consola.warn('getAuthUserAndIsAdmin: no authenticated user', error?.message || 'No user')
      }
      return { userId: null, isAdmin: null, status: null }
    }

    const { data, error: profileError } = await client
      .from('account_profiles')
      .select('is_admin, account_type, status, metadata')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError && import.meta.dev) {
      consola.warn('getAuthUserAndIsAdmin: error fetching account_profiles row', profileError.message)
    }

    const isAdmin = data ? !!data.is_admin : false
    const status = (data?.status as AccountStatus) ?? null

    if (import.meta.dev) {
      consola.info('getAuthUserAndIsAdmin: resolved admin info', { userId: user.id, isAdmin, status })
    }

    return { userId: user.id, isAdmin, status }
  } catch (error) {
    if (import.meta.dev) {
      consola.error('getAuthUserAndIsAdmin: unexpected error', error)
    }
    return { userId: null, isAdmin: null, status: null }
  }
}



/**
 * Require admin access for an API endpoint
 *
 * Uses getAuthUserAndIsAdmin to ensure the user is authenticated, has
 * admin privileges based on the account_profiles.is_admin flag, and
 * has an active account status.
 *
 * @param event - H3 event object
 * @throws {Error} - 401 Unauthorized if not authenticated, 403 Forbidden if not admin or account suspended/deleted
 * @returns {Promise<string>} - User ID of the admin user
 */
export async function requireAdmin(event: H3Event): Promise<string> {
  const { userId, isAdmin, status } = await getAuthUserAndIsAdmin(event)

  if (!userId) {
    if (import.meta.dev) {
      consola.warn('requireAdmin: no authenticated user')
    }

    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Authentication required. Please log in.'
    })
  }

  if (!isAdmin) {
    if (import.meta.dev) {
      consola.warn('requireAdmin: user is not an admin', { userId })
    }

    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'Admin access required to perform this action.'
    })
  }

  // Check account status - must be 'active' to access admin
  if (status !== 'active') {
    if (import.meta.dev) {
      consola.warn('requireAdmin: account is not active', { userId, status })
    }

    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: status === 'suspended'
        ? 'Your account has been suspended. Please contact an administrator.'
        : 'Your account is no longer active. Please contact an administrator.'
    })
  }

  if (import.meta.dev) {
    consola.success('requireAdmin: admin access granted', { userId, status })
  }

  return userId
}

/**
 * Require ownership of a specific contractor for an API endpoint
 *
 * Verifies that the authenticated user is the owner of the specified contractor
 * by checking the contractors.claimed_by field.
 *
 * @param event - H3 event object
 * @param contractorId - UUID of the contractor to check ownership for
 * @throws {Error} - 401 Unauthorized if not authenticated, 403 Forbidden if not owner
 * @returns {Promise<string>} - User ID of the owner
 *
 * @example
 * ```typescript
 * export default defineEventHandler(async (event) => {
 *   const contractorId = getRouterParam(event, 'id')
 *   const userId = await requireOwner(event, contractorId)
 *   // User is the owner, proceed with logic
 * })
 * ```
 */
export async function requireOwner(event: H3Event, contractorId: string): Promise<string> {
  // First ensure user is authenticated
  const userId = await requireAuth(event)

  // Check if user owns the contractor
  const client = await serverSupabaseClient(event)
  const { data: contractor, error } = await client
    .from('contractors')
    .select('id, claimed_by, is_claimed')
    .eq('id', contractorId)
    .maybeSingle()

  if (error) {
    if (import.meta.dev) {
      consola.error('requireOwner: database error', error.message)
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to verify ownership'
    })
  }

  if (!contractor) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Contractor not found'
    })
  }

  if (!contractor.is_claimed || contractor.claimed_by !== userId) {
    if (import.meta.dev) {
      consola.warn('requireOwner: user is not the owner', { userId, contractorId, claimedBy: contractor.claimed_by })
    }
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'You do not have permission to modify this contractor profile'
    })
  }

  if (import.meta.dev) {
    consola.success('requireOwner: ownership verified', { userId, contractorId })
  }

  return userId
}
