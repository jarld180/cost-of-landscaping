/**
 * GET /api/public/contractors/[citySlug]/[contractorSlug]
 *
 * Public endpoint to get a single contractor by city and contractor slug
 * Used for contractor profile pages
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { ContractorRepository } from '../../../../repositories/ContractorRepository'
import type { ContractorMetadata } from '../../../../repositories/ContractorRepository'

interface EnrichmentData {
  status?: string
  enriched_at?: string
  business_hours?: Record<string, { open: string; close: string } | null>
  social_links?: Record<string, string | null>
}

interface ExtendedMetadata extends ContractorMetadata {
  enrichment?: EnrichmentData
}

export default defineEventHandler(async (event) => {
  const citySlug = getRouterParam(event, 'citySlug')
  const contractorSlug = getRouterParam(event, 'contractorSlug')

  if (!citySlug || !contractorSlug) {
    throw createError({
      statusCode: 400,
      message: 'City slug and contractor slug are required'
    })
  }

  const client = await serverSupabaseClient(event)
  const contractorRepo = new ContractorRepository(client)

  try {
    const contractor = await contractorRepo.findBySlugPublic(citySlug, contractorSlug)

    if (!contractor) {
      throw createError({
        statusCode: 404,
        message: `Contractor not found: ${contractorSlug} in ${citySlug}`
      })
    }

    const metadata = (contractor.metadata || {}) as ExtendedMetadata
    const enrichment = metadata.enrichment || {}

    // Merge social links: enriched data takes precedence over legacy data
    // Filter out "null" strings and actual null values
    const legacySocialLinks = metadata.social_links || {}
    const enrichedSocialLinks = enrichment.social_links || {}
    const mergedSocialLinks: Record<string, string> = {}

    // First add legacy links
    for (const [key, value] of Object.entries(legacySocialLinks)) {
      if (value && value !== 'null') {
        mergedSocialLinks[key] = value
      }
    }
    // Override with enriched links (if valid)
    for (const [key, value] of Object.entries(enrichedSocialLinks)) {
      if (value && value !== 'null') {
        mergedSocialLinks[key] = value
      }
    }

    // Convert business hours to frontend format
    // Frontend expects: [{day: "Monday", hours: "7 AM to 7 PM"}, ...]
    // Priority: 1) metadata.business_hours (owner-edited), 2) enrichment.business_hours (AI), 3) opening_hours (legacy)
    const ownerBusinessHours = (metadata as Record<string, unknown>).business_hours as Record<string, { open: string; close: string } | null> | undefined
    const enrichedBusinessHours = enrichment.business_hours
    const businessHours = ownerBusinessHours || enrichedBusinessHours
    let openingHours: Array<{ day: string; hours: string }> = []

    if (businessHours && typeof businessHours === 'object') {
      const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      openingHours = daysOrder
        .filter(day => businessHours[day] && businessHours[day]?.open && businessHours[day]?.close)
        .map(day => ({
          day: day.charAt(0).toUpperCase() + day.slice(1),
          hours: `${businessHours[day]!.open} to ${businessHours[day]!.close}`
        }))
    }

    // Fall back to legacy opening_hours if no owner or enriched data
    if (openingHours.length === 0 && metadata.opening_hours) {
      const legacyHours = metadata.opening_hours
      if (Array.isArray(legacyHours)) {
        openingHours = legacyHours as Array<{ day: string; hours: string }>
      }
    }

    // Fetch service types from junction table
    const { data: serviceTypes } = await client
      .from('contractor_service_types')
      .select(`
        service_type:service_types (
          name
        )
      `)
      .eq('contractor_id', contractor.id)

    // Flatten service type names
    const serviceTypeNames = (serviceTypes || [])
      .map(st => st.service_type?.name)
      .filter((name): name is string => !!name)

    // Merge categories: service types + legacy categories (deduplicated)
    const legacyCategories = metadata.categories || []
    const allCategories = [...new Set([...serviceTypeNames, ...legacyCategories])]

    // Fetch first 5 reviews for SSR (hybrid approach)
    const REVIEWS_INITIAL_LIMIT = 5
    const { data: reviewsData, count: reviewsTotal } = await client
      .from('reviews')
      .select('*', { count: 'exact' })
      .eq('contractor_id', contractor.id)
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(REVIEWS_INITIAL_LIMIT)

    // Calculate rating distribution (fetch all stars for counting)
    const { data: ratingData } = await client
      .from('reviews')
      .select('stars')
      .eq('contractor_id', contractor.id)

    const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    if (ratingData) {
      for (const review of ratingData) {
        const stars = review.stars as 1 | 2 | 3 | 4 | 5
        if (stars >= 1 && stars <= 5) {
          ratingDistribution[stars]++
        }
      }
    }

    // Helper to build public URL from storage path
    const buildPhotoUrl = (storagePath: string | null): string | null => {
      if (!storagePath) return null
      const { data } = client.storage.from('contractors').getPublicUrl(storagePath)
      return data.publicUrl
    }

    // Transform reviews to public format
    const reviewItems = (reviewsData || []).map((review) => {
      // Generate initials from reviewer name
      const nameParts = (review.reviewer_name || 'Anonymous').split(' ')
      const initials = nameParts.length >= 2
        ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
        : (nameParts[0]?.substring(0, 2) || 'AN').toUpperCase()

      return {
        id: review.id,
        authorName: review.reviewer_name || 'Anonymous',
        authorInitials: initials,
        authorPhotoUrl: buildPhotoUrl(review.downloaded_reviewer_photo_url),
        rating: review.stars,
        date: review.published_at || review.created_at,
        content: review.review_text || '',
        isLocalGuide: review.is_local_guide || false,
        likesCount: review.likes_count || 0,
        ownerResponse: review.owner_response_text ? {
          text: review.owner_response_text,
          date: review.owner_response_date || null
        } : null
      }
    })

    // Transform for public response
    return {
      id: contractor.id,
      companyName: contractor.company_name,
      slug: contractor.slug,
      description: contractor.description,
      streetAddress: contractor.street_address,
      postalCode: contractor.postal_code,
      phone: contractor.phone,
      email: contractor.email,
      website: contractor.website,
      rating: contractor.rating,
      reviewCount: contractor.review_count,
      cityName: contractor.city_name,
      citySlug: contractor.city_slug,
      stateCode: contractor.state_code,
      lat: contractor.lat,
      lng: contractor.lng,
      // Claim status (public - only show if claimed, not who claimed)
      isClaimed: contractor.is_claimed || false,
      // Metadata fields
      images: metadata.images || [],
      categories: allCategories,
      socialLinks: mergedSocialLinks,
      openingHours: openingHours,
      // Reviews (hybrid approach: embed first page for SSR/SEO)
      reviews: {
        items: reviewItems,
        total: reviewsTotal || 0,
        hasMore: (reviewsTotal || 0) > REVIEWS_INITIAL_LIMIT,
        ratingDistribution
      }
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    consola.error('Error fetching contractor:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch contractor'
    })
  }
})

