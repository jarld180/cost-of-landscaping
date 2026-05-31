/**
 * POST /api/admin/notifications/read-all
 * Mark all notifications as read.
 */

import { serverSupabaseClient } from '#supabase/server'
import { requireAdmin } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const client = await serverSupabaseClient(event)

  const { error } = await client
    .from('admin_notifications')
    .update({ read: true })
    .eq('read', false)

  if (error) throw createError({ statusCode: 500, message: 'Failed to mark notifications read' })

  return { success: true }
})
