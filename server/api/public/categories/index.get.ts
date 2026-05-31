/**
 * GET /api/public/categories
 *
 * Public endpoint to list all enabled service type categories
 * Used for category navigation on listing pages
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { LookupRepository } from '../../../repositories/LookupRepository'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const lookupRepo = new LookupRepository(client)

  try {
    const serviceTypes = await lookupRepo.serviceTypes.list()

    // Transform for public response
    return {
      categories: serviceTypes.map(st => ({
        id: st.id,
        name: st.name,
        slug: st.slug,
        description: st.description,
        displayOrder: st.display_order
      }))
    }
  } catch (error: unknown) {
    consola.error('Error fetching categories:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch categories'
    })
  }
})

