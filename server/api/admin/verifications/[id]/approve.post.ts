/**
 * POST /api/admin/verifications/:id/approve
 * Approve a COI submission — upgrades contractor to fully_verified
 */

import { serverSupabaseClient } from '#supabase/server'
import { requireAdmin } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
  const adminId = await requireAdmin(event)
  const verificationId = getRouterParam(event, 'id')

  if (!verificationId) {
    throw createError({ statusCode: 400, message: 'Verification ID required' })
  }

  const client = await serverSupabaseClient(event)

  // Fetch the verification record
  const { data: verification, error: fetchError } = await client
    .from('contractor_verifications')
    .select('*, contractors(id, verification_tier)')
    .eq('id', verificationId)
    .single()

  if (fetchError || !verification) {
    throw createError({ statusCode: 404, message: 'Verification not found' })
  }

  if (verification.status !== 'pending') {
    throw createError({ statusCode: 409, message: `Verification is already ${verification.status}` })
  }

  // Mark verification approved
  const { error: approveError } = await client
    .from('contractor_verifications')
    .update({
      status: 'approved',
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', verificationId)

  if (approveError) {
    throw createError({ statusCode: 500, message: 'Failed to approve verification' })
  }

  // Upgrade contractor tier (only if not already trusted_partner)
  const contractor = verification.contractors as { id: string; verification_tier: string } | null
  if (contractor && contractor.verification_tier !== 'trusted_partner') {
    await client
      .from('contractors')
      .update({ verification_tier: 'fully_verified' })
      .eq('id', contractor.id)
  }

  return { success: true, message: 'Verification approved — contractor is now Fully Verified' }
})
