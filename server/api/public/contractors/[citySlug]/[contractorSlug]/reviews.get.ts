/**
 * GET /api/public/contractors/[citySlug]/[contractorSlug]/reviews
 *
 * Public endpoint to get reviews for a contractor by city and contractor slug
 * Supports pagination and sorting
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { z } from 'zod'

// Query params schema
const querySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(10),
  offset: z.coerce.number().min(0).default(0),
  sort: z.enum(['recent', 'highest', 'lowest']).default('recent')
})

// Frontend review format (mapped from database)
interface PublicReview {
  id: string
  authorName: string
  authorInitials: string
  authorPhotoUrl: string | null
  rating: number
  date: string
  content: string
  isLocalGuide: boolean
  likesCount: number
  ownerResponse: {
    text: string
    date: string
  } | null
  imageUrls: string[]
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

  // Parse query params
  const rawQuery = getQuery(event)
  const queryResult = querySchema.safeParse(rawQuery)
  if (!queryResult.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid query parameters',
      data: queryResult.error.flatten()
    })
  }
  const { limit, offset, sort } = queryResult.data

  const client = await serverSupabaseClient(event)

  try {
    // First, find the contractor by slugs
    const { data: contractor, error: contractorError } = await client
      .from('contractors')
      .select(`
        id,
        city:cities!contractors_city_id_fkey (
          slug
        )
      `)
      .eq('slug', contractorSlug)
      .is('deleted_at', null)
      .single()

    if (contractorError || !contractor) {
      throw createError({
        statusCode: 404,
        message: `Contractor not found: ${contractorSlug}`
      })
    }

    // Verify city slug matches
    if (contractor.city?.slug !== citySlug) {
      throw createError({
        statusCode: 404,
        message: `Contractor not found in city: ${citySlug}`
      })
    }

    // Determine sort order
    let orderColumn: 'published_at' | 'stars' = 'published_at'
    let ascending = false

    if (sort === 'highest') {
      orderColumn = 'stars'
      ascending = false
    } else if (sort === 'lowest') {
      orderColumn = 'stars'
      ascending = true
    }

    // Fetch reviews with count
    const { data: reviews, error: reviewsError, count } = await client
      .from('reviews')
      .select('*', { count: 'exact' })
      .eq('contractor_id', contractor.id)
      .order(orderColumn, { ascending, nullsFirst: false })
      .range(offset, offset + limit - 1)

    if (reviewsError) {
      consola.error('Error fetching reviews:', reviewsError)
      throw createError({
        statusCode: 500,
        message: 'Failed to fetch reviews'
      })
    }

    // Helper to build public URL from storage path
    const buildPhotoUrl = (storagePath: string | null): string | null => {
      if (!storagePath) return null
      const { data } = client.storage.from('contractors').getPublicUrl(storagePath)
      return data.publicUrl
    }

    // Transform to frontend format
    const publicReviews: PublicReview[] = (reviews || []).map((review) => {
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
        date: review.published_at || review.created_at || new Date().toISOString(),
        content: review.review_text || '',
        isLocalGuide: review.is_local_guide || false,
        likesCount: review.likes_count || 0,
        ownerResponse: review.owner_response_text ? {
          text: review.owner_response_text,
          date: review.owner_response_date || ''
        } : null,
        imageUrls: review.review_image_urls || []
      }
    })

    return {
      reviews: publicReviews,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    consola.error('Error fetching reviews:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch reviews'
    })
  }
})

