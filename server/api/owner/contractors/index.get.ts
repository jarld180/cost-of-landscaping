/**
 * GET /api/owner/contractors
 *
 * List contractors owned by the authenticated user.
 * Returns all contractors where claimed_by = current user ID.
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { requireAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  // Require authentication
  const userId = await requireAuth(event)

  if (import.meta.dev) {
    consola.info('GET /api/owner/contractors - Fetching owned contractors', { userId })
  }

  const client = await serverSupabaseClient(event)

  // Fetch contractors owned by this user
  const { data: contractors, error } = await client
    .from('contractors')
    .select(`
      id,
      company_name,
      slug,
      description,
      phone,
      email,
      website,
      street_address,
      postal_code,
      rating,
      review_count,
      status,
      metadata,
      is_claimed,
      claimed_at,
      embed_token,
      created_at,
      updated_at,
      city:cities!contractors_city_id_fkey (
        id,
        name,
        slug,
        state_code
      )
    `)
    .eq('claimed_by', userId)
    .eq('is_claimed', true)
    .is('deleted_at', null)
    .order('company_name', { ascending: true })

  if (error) {
    consola.error('GET /api/owner/contractors - Database error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to fetch contractors'
    })
  }

  if (import.meta.dev) {
    consola.success(`GET /api/owner/contractors - Found ${contractors?.length || 0} owned contractors`)
  }

  // Transform response
  return {
    contractors: (contractors || []).map(c => ({
      id: c.id,
      companyName: c.company_name,
      slug: c.slug,
      description: c.description,
      phone: c.phone,
      email: c.email,
      website: c.website,
      streetAddress: c.street_address,
      postalCode: c.postal_code,
      rating: c.rating,
      reviewCount: c.review_count,
      status: c.status,
      metadata: c.metadata,
      claimedAt: c.claimed_at,
      embedToken: c.embed_token,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      city: c.city ? {
        id: (c.city as any).id,
        name: (c.city as any).name,
        slug: (c.city as any).slug,
        stateCode: (c.city as any).state_code
      } : null
    })),
    total: contractors?.length || 0
  }
})

