/**
 * GET /api/admin/reviews/fraud
 *
 * Admin endpoint: contractors flagged for suspicious review patterns.
 * Returns contractors with fraud_risk = 'medium' or 'high', sorted by score.
 */

import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)

  // Verify admin (RLS will enforce this too, but fail fast here for a clean error)
  const { data: { user } } = await client.auth.getUser()
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const { data: profile } = await client
    .from('account_profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) throw createError({ statusCode: 403, message: 'Forbidden' })

  const { risk = 'all', limit = 50, offset = 0 } = getQuery(event)

  let query = client
    .from('contractor_review_fraud_stats')
    .select(`
      contractor_id,
      total_platform_reviews,
      flagged_reviews,
      same_ip_count,
      velocity_flag,
      all_five_star_flag,
      fraud_risk,
      last_calculated_at,
      contractor:contractors!contractor_review_fraud_stats_contractor_id_fkey (
        id, company_name, slug, city_id,
        city:cities!contractors_city_id_fkey (name, state_code)
      )
    `, { count: 'exact' })
    .order('last_calculated_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1)

  if (risk !== 'all') {
    query = query.eq('fraud_risk', String(risk))
  } else {
    query = query.in('fraud_risk', ['medium', 'high'])
  }

  const { data, error, count } = await query

  if (error) {
    // Table may not exist yet (migration pending) — return empty instead of 500
    if (error.code === '42P01') return { data: [], total: 0, limit: Number(limit), offset: Number(offset), pending_migration: true }
    throw createError({ statusCode: 500, message: 'Failed to fetch fraud stats' })
  }

  return { data, total: count, limit: Number(limit), offset: Number(offset) }
})
