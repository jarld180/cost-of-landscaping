/**
 * GET /api/admin/verifications
 * List COI verification submissions (admin only)
 */

import { serverSupabaseClient } from '#supabase/server'
import { requireAdmin } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const query = getQuery(event)
  const status = (query.status as string) || 'pending'
  const limit = Math.min(Number(query.limit) || 20, 100)
  const offset = Math.max(Number(query.offset) || 0, 0)

  const client = await serverSupabaseClient(event)

  let q = client
    .from('contractor_verifications')
    .select(`
      *,
      contractors (
        id,
        company_name,
        slug,
        cities ( name, state_code )
      )
    `, { count: 'exact' })
    .order('submitted_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status !== 'all') {
    q = q.eq('status', status)
  }

  const { data, error, count } = await q

  if (error) {
    throw createError({ statusCode: 500, message: 'Failed to fetch verifications' })
  }

  return { success: true, data: data || [], total: count || 0 }
})
