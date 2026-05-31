/**
 * GET /api/owner/contractors/[id]
 *
 * Get a specific contractor for editing by the owner.
 * Verifies ownership before returning data.
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { requireOwner } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const contractorId = getRouterParam(event, 'id')

  if (!contractorId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Contractor ID is required'
    })
  }

  // Verify ownership
  await requireOwner(event, contractorId)

  if (import.meta.dev) {
    consola.info('GET /api/owner/contractors/[id] - Fetching contractor for editing', { contractorId })
  }

  const client = await serverSupabaseClient(event)

  // Fetch contractor with full details for editing
  const { data: contractor, error } = await client
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
      lat,
      lng,
      rating,
      review_count,
      status,
      metadata,
      is_claimed,
      claimed_at,
      phone_verified,
      phone_verified_at,
      created_at,
      updated_at,
      city:cities!contractors_city_id_fkey (
        id,
        name,
        slug,
        state_code
      )
    `)
    .eq('id', contractorId)
    .single()

  if (error) {
    consola.error('GET /api/owner/contractors/[id] - Database error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to fetch contractor'
    })
  }

  // Fetch assigned service types via junction table
  const { data: serviceTypes, error: stError } = await client
    .from('contractor_service_types')
    .select(`
      service_type_id,
      source,
      service_type:service_types (
        id,
        name,
        slug
      )
    `)
    .eq('contractor_id', contractorId)

  if (stError) {
    if (import.meta.dev) {
      consola.warn('GET /api/owner/contractors/[id] - Failed to fetch service types:', stError)
    }
    // Non-fatal, continue without service types
  }

  // Transform service types to flat structure
  const flatServiceTypes = (serviceTypes || []).map((st) => ({
    id: st.service_type?.id,
    name: st.service_type?.name,
    slug: st.service_type?.slug,
    source: st.source,
  }))

  if (import.meta.dev) {
    consola.success(`GET /api/owner/contractors/[id] - Contractor fetched with ${flatServiceTypes.length} service types`)
  }

  // Transform response
  return {
    contractor: {
      id: contractor.id,
      companyName: contractor.company_name,
      slug: contractor.slug,
      description: contractor.description,
      phone: contractor.phone,
      email: contractor.email,
      website: contractor.website,
      streetAddress: contractor.street_address,
      postalCode: contractor.postal_code,
      lat: contractor.lat,
      lng: contractor.lng,
      rating: contractor.rating,
      reviewCount: contractor.review_count,
      status: contractor.status,
      metadata: contractor.metadata,
      claimedAt: contractor.claimed_at,
      phoneVerified: contractor.phone_verified,
      phoneVerifiedAt: contractor.phone_verified_at,
      createdAt: contractor.created_at,
      updatedAt: contractor.updated_at,
      city: contractor.city ? {
        id: (contractor.city as any).id,
        name: (contractor.city as any).name,
        slug: (contractor.city as any).slug,
        stateCode: (contractor.city as any).state_code
      } : null,
      serviceTypes: flatServiceTypes,
    }
  }
})

