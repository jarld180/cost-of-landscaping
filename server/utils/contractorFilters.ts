/**
 * Shared contractor filter utility for bulk operations
 * Used by: bulk-update, bulk-delete, count, export endpoints
 *
 * NOTE: This helper is NOT used by the main list endpoint (index.get.ts)
 * which has additional filters like includeDeleted, enrichmentStatus, etc.
 */

export interface ContractorFilters {
  cityId?: string
  status?: string
  category?: string
  search?: string
}

/**
 * Apply contractor filters to a Supabase query builder
 *
 * Applies the following filters (if provided):
 * - cityId: Filter by city UUID
 * - status: Filter by status (pending, active, suspended)
 * - category: Filter by category slug (searches metadata.categories[])
 * - search: Search by company name (case-insensitive)
 * - deleted_at: Always filters to non-deleted records (IS NULL)
 *
 * @param query - Supabase query builder instance
 * @param filters - Filter parameters
 * @returns Modified query builder with filters applied
 */
export function applyContractorFilters<T extends {
  eq: Function
  is: Function
  contains: Function
  ilike: Function
}>(
  query: T,
  filters: ContractorFilters
): T {
  // Apply cityId filter
  if (filters.cityId) {
    query = query.eq('city_id', filters.cityId)
  }

  // Apply status filter
  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  // Always apply deleted_at IS NULL constraint
  query = query.is('deleted_at', null)

  // Apply category filter (JSONB contains)
  if (filters.category) {
    query = query.contains('metadata', { categories: [filters.category] })
  }

  // Apply search by company name (case-insensitive)
  if (filters.search) {
    query = query.ilike('company_name', `%${filters.search}%`)
  }

  return query
}
