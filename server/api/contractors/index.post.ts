/**
 * POST /api/contractors
 *
 * Create a new contractor manually (admin only).
 *
 * Request Body:
 * - companyName: Company name (required)
 * - slug: Custom slug (optional, auto-generated from company name)
 * - cityId: City UUID (optional)
 * - streetAddress, postalCode: Address fields (optional)
 * - lat, lng: Coordinates (optional)
 * - phone, website, email: Contact info (optional)
 * - description: Business description (optional)
 * - categories: Array of category slugs (optional)
 * - socialLinks: Social media links (optional)
 * - openingHours: Business hours (optional)
 * - status: Contractor status (optional, default: pending)
 *
 * @returns {Object} Created contractor data
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { ContractorRepository } from '../../repositories/ContractorRepository'
import { createContractorSchema } from '../../schemas/contractor.schemas'
import { requireAdmin } from '../../utils/auth'
import type { Database } from '../../../app/types/supabase'

/**
 * Generate URL-friendly slug from company name
 */
function generateSlug(companyName: string): string {
  return companyName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 200) // Limit length
}

export default defineEventHandler(async (event) => {
  try {
    // Require admin authentication
    const userId = await requireAdmin(event)

    if (import.meta.dev) {
      consola.info('POST /api/contractors - Creating new contractor', { userId })
    }

    // Get and validate request body
    const body = await readBody(event)
    const validatedData = createContractorSchema.parse(body)

    if (import.meta.dev) {
      consola.info('POST /api/contractors - Validated data:', {
        companyName: validatedData.companyName,
        cityId: validatedData.cityId,
        status: validatedData.status,
      })
    }

    // Get Supabase client
    const client = await serverSupabaseClient<Database>(event)
    const contractorRepo = new ContractorRepository(client)

    // Generate slug if not provided
    const baseSlug = validatedData.slug || generateSlug(validatedData.companyName)

    // Generate unique slug (handles collisions)
    const uniqueSlug = await contractorRepo.generateUniqueSlug(baseSlug, validatedData.cityId || null)

    // Build metadata object
    const metadata: Record<string, unknown> = {}

    if (validatedData.categories && validatedData.categories.length > 0) {
      metadata.categories = validatedData.categories
    }

    if (validatedData.socialLinks) {
      metadata.social_links = validatedData.socialLinks
    }

    if (validatedData.openingHours) {
      metadata.opening_hours = validatedData.openingHours
    }

    // Create contractor
    const contractor = await contractorRepo.create({
      company_name: validatedData.companyName,
      slug: uniqueSlug,
      city_id: validatedData.cityId || null,
      street_address: validatedData.streetAddress || null,
      postal_code: validatedData.postalCode || null,
      lat: validatedData.lat || null,
      lng: validatedData.lng || null,
      phone: validatedData.phone || null,
      website: validatedData.website || null,
      email: validatedData.email || null,
      description: validatedData.description || null,
      rating: validatedData.rating || null,
      review_count: validatedData.reviewCount || null,
      status: validatedData.status || 'pending',
      google_place_id: validatedData.googlePlaceId || null,
      google_cid: validatedData.googleCid || null,
      images_processed: true, // Manual entries don't have pending images
      metadata: Object.keys(metadata).length > 0 ? metadata : null,
    })

    if (import.meta.dev) {
      consola.success('POST /api/contractors - Contractor created:', {
        id: contractor.id,
        companyName: contractor.company_name,
        slug: contractor.slug,
      })
    }

    return {
      success: true,
      data: contractor,
      message: 'Contractor created successfully',
    }
  } catch (error) {
    if (import.meta.dev) {
      consola.error('POST /api/contractors - Error:', error)
    }

    // Handle validation errors
    if (error && typeof error === 'object' && 'issues' in error) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Invalid request data',
        data: (error as { issues: unknown }).issues,
      })
    }

    // Handle business logic errors
    if (error instanceof Error) {
      if (error.message.includes('already exists') || error.message.includes('Slug')) {
        throw createError({
          statusCode: 409,
          statusMessage: 'Conflict',
          message: error.message,
        })
      }
    }

    // Re-throw if already an H3Error
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to create contractor',
    })
  }
})

