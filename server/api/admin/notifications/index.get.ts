/**
 * GET /api/admin/notifications
 * Fetch admin notifications (unread first).
 */

import { serverSupabaseClient } from '#supabase/server'
import { requireAdmin } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const query = getQuery(event)
  const unreadOnly = query.unreadOnly === 'true'
  const limit = Math.min(Number(query.limit) || 20, 100)

  const client = await serverSupabaseClient(event)

  let q = client
    .from('admin_notifications')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (unreadOnly) q = q.eq('read', false)

  const { data, error, count } = await q

  if (error) throw createError({ statusCode: 500, message: 'Failed to fetch notifications' })

  // Unread count
  const { count: unreadCount } = await client
    .from('admin_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('read', false)

  return {
    notifications: data || [],
    total: count || 0,
    unreadCount: unreadCount || 0
  }
})
