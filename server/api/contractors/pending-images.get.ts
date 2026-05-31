/**
 * GET /api/contractors/pending-images
 *
 * Returns the count of contractors with pending images.
 * Used by the import page to show the "Enrich Images" button on page load.
 */

import { serverSupabaseClient } from '#supabase/server'
import { requireAdmin } from '../../utils/auth'

interface PendingImagesResponse {
  success: boolean
  pendingCount: number
}

export default defineEventHandler(async (event): Promise<PendingImagesResponse> => {
  // Require admin authentication
  await requireAdmin(event)

  try {
    const client = await serverSupabaseClient(event)

    const { count, error } = await client
      .from('contractors')
      .select('*', { count: 'exact', head: true })
      .eq('images_processed', false)

    if (error) throw error

    return {
      success: true,
      pendingCount: count || 0,
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get pending images count',
    })
  }
})

