/**
 * GET /api/public/service-types
 *
 * Returns enabled service types for contractor filtering.
 * Used by the search page filter dropdown.
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'

interface ServiceType {
  id: string
  name: string
  slug: string
  icon: string | null
}

export default defineEventHandler(async (event): Promise<ServiceType[]> => {
  const client = await serverSupabaseClient(event)

  try {
    const { data, error } = await client
      .from('service_types')
      .select('id, name, slug, icon')
      .eq('is_enabled', true)
      .is('deleted_at', null)
      .order('display_order', { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    consola.error('Failed to fetch service types:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch service types'
    })
  }
})

