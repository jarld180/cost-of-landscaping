/**
 * GET /api/admin/article-keywords
 * List article keywords with status and pagination.
 */

import { serverSupabaseClient } from '#supabase/server'
import { requireAdmin } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const query = getQuery(event)
  const status = query.status as string | undefined
  const category = query.category as string | undefined
  const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 200)
  const offset = Math.max(Number(query.offset) || 0, 0)

  const client = await serverSupabaseClient(event)

  let q = client
    .from('article_keywords')
    .select('*', { count: 'exact' })

  if (status) q = q.eq('status', status)
  if (category) q = q.eq('category', category)

  q = q
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1)

  const { data, error, count } = await q

  if (error) throw createError({ statusCode: 500, message: 'Failed to fetch keywords' })

  // Count by status
  const { data: counts } = await client
    .from('article_keywords')
    .select('status')

  const statusCounts = { pending: 0, queued: 0, completed: 0, skipped: 0 }
  for (const row of counts || []) {
    const s = row.status as keyof typeof statusCounts
    if (s in statusCounts) statusCounts[s]++
  }

  return {
    keywords: data || [],
    total: count || 0,
    statusCounts,
    limit,
    offset,
    hasMore: offset + (data?.length || 0) < (count || 0)
  }
})
