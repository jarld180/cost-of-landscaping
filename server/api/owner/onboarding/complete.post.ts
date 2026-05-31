/**
 * POST /api/owner/onboarding/complete
 *
 * Idempotently marks the current owner account's onboarding flow complete.
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { requireAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event)
  const client = await serverSupabaseClient(event)
  const completedAt = new Date().toISOString()

  const { data: profile, error } = await client
    .from('account_profiles')
    .update({
      onboarding_completed_at: completedAt,
      updated_at: completedAt,
    })
    .eq('id', userId)
    .select('id, onboarding_completed_at')
    .maybeSingle()

  if (error) {
    consola.error('POST /api/owner/onboarding/complete - Profile update failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to complete onboarding'
    })
  }

  if (!profile) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Account profile not found'
    })
  }

  return {
    success: true,
    redirectUrl: '/owner',
  }
})
