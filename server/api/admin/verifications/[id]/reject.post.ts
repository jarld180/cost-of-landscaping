/**
 * POST /api/admin/verifications/:id/reject
 * Reject a COI submission with a reason
 */

import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'
import { requireAdmin } from '../../../../utils/auth'

const rejectSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required').max(500),
})

export default defineEventHandler(async (event) => {
  const adminId = await requireAdmin(event)
  const verificationId = getRouterParam(event, 'id')

  if (!verificationId) {
    throw createError({ statusCode: 400, message: 'Verification ID required' })
  }

  const body = await readBody(event)
  const { reason } = rejectSchema.parse(body)

  const client = await serverSupabaseClient(event)

  const { data: verification, error: fetchError } = await client
    .from('contractor_verifications')
    .select('id, status, contractor_id')
    .eq('id', verificationId)
    .single()

  if (fetchError || !verification) {
    throw createError({ statusCode: 404, message: 'Verification not found' })
  }

  if (verification.status !== 'pending') {
    throw createError({ statusCode: 409, message: `Verification is already ${verification.status}` })
  }

  const { error: rejectError } = await client
    .from('contractor_verifications')
    .update({
      status: 'rejected',
      rejection_reason: reason,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', verificationId)

  if (rejectError) {
    throw createError({ statusCode: 500, message: 'Failed to reject verification' })
  }

  return { success: true, message: 'Verification rejected' }
})
