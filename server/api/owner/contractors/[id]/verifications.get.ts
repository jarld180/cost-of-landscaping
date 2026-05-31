/**
 * GET /api/owner/contractors/:id/verifications
 * Fetch the owner's COI verification submissions for their contractor
 */

import { serverSupabaseServiceRole } from '#supabase/server'
import { requireOwner } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
  const contractorId = getRouterParam(event, 'id')

  if (!contractorId) {
    throw createError({ statusCode: 400, message: 'Contractor ID required' })
  }

  await requireOwner(event, contractorId)

  const client = serverSupabaseServiceRole(event)

  const { data, error } = await client
    .from('contractor_verifications')
    .select('id, status, type, additional_insured_name, policy_expires_at, submitted_at, reviewed_at, rejection_reason')
    .eq('contractor_id', contractorId)
    .order('submitted_at', { ascending: false })

  if (error) {
    throw createError({ statusCode: 500, message: 'Failed to fetch verifications' })
  }

  return { success: true, data: data || [] }
})
