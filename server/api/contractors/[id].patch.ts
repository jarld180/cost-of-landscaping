/**
 * PATCH /api/contractors/[id]
 *
 * Update an existing contractor (admin only).
 *
 * @param {string} id - Contractor UUID
 *
 * Request Body (all fields optional):
 * - companyName, slug, cityId, streetAddress, postalCode
 * - lat, lng, phone, website, email, description
 * - rating, reviewCount, categories, socialLinks, openingHours
 * - status
 *
 * @returns {Object} Updated contractor data
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { ContractorRepository } from '../../repositories/ContractorRepository'
import { updateContractorSchema } from '../../schemas/contractor.schemas'
import { requireAdmin } from '../../utils/auth'
import type { Database } from '../../../app/types/supabase'

export default defineEventHandler(async (event) => {
  try {
    // Require admin authentication
    const userId = await requireAdmin(event)

    // Get contractor ID from route params
    const id = getRouterParam(event, 'id')

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Contractor ID is required',
      })
    }

    if (import.meta.dev) {
      consola.info(`PATCH /api/contractors/${id} - Updating contractor`, { userId })
    }

    // Get and validate request body
    const body = await readBody(event)
    const validatedData = updateContractorSchema.parse(body)

    if (import.meta.dev) {
      consola.info(`PATCH /api/contractors/${id} - Validated data:`, validatedData)
    }

    // Get Supabase client
    const client = await serverSupabaseClient<Database>(event)
    const contractorRepo = new ContractorRepository(client)

    // Verify contractor exists
    const existingContractor = await contractorRepo.findById(id)

    if (!existingContractor) {
      if (import.meta.dev) {
        consola.warn(`PATCH /api/contractors/${id} - Contractor not found`)
      }

      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: `Contractor with ID '${id}' not found`,
      })
    }

    // Build update object
    const updateData: Record<string, unknown> = {}

    // Map validated fields to database columns
    if (validatedData.companyName !== undefined) updateData.company_name = validatedData.companyName
    if (validatedData.slug !== undefined) updateData.slug = validatedData.slug
    if (validatedData.cityId !== undefined) updateData.city_id = validatedData.cityId
    if (validatedData.streetAddress !== undefined) updateData.street_address = validatedData.streetAddress
    if (validatedData.postalCode !== undefined) updateData.postal_code = validatedData.postalCode
    if (validatedData.lat !== undefined) updateData.lat = validatedData.lat
    if (validatedData.lng !== undefined) updateData.lng = validatedData.lng
    if (validatedData.phone !== undefined) updateData.phone = validatedData.phone
    if (validatedData.website !== undefined) updateData.website = validatedData.website
    if (validatedData.email !== undefined) updateData.email = validatedData.email
    if (validatedData.description !== undefined) updateData.description = validatedData.description
    if (validatedData.rating !== undefined) updateData.rating = validatedData.rating
    if (validatedData.reviewCount !== undefined) updateData.review_count = validatedData.reviewCount
    if (validatedData.status !== undefined) updateData.status = validatedData.status
    if (validatedData.verificationTier !== undefined) updateData.verification_tier = validatedData.verificationTier

    // Handle metadata updates (merge with existing)
    const existingMetadata = (existingContractor.metadata as Record<string, unknown>) || {}
    let newMetadata = { ...existingMetadata }
    let metadataChanged = false

    // Handle legacy field mappings
    if (validatedData.categories !== undefined) {
      newMetadata.categories = validatedData.categories
      metadataChanged = true
    }
    if (validatedData.socialLinks !== undefined) {
      newMetadata.social_links = validatedData.socialLinks
      metadataChanged = true
    }
    if (validatedData.openingHours !== undefined) {
      newMetadata.opening_hours = validatedData.openingHours
      metadataChanged = true
    }

    // Handle direct metadata updates (for images, primary_image, etc.)
    if (validatedData.metadata !== undefined) {
      newMetadata = { ...newMetadata, ...validatedData.metadata }
      metadataChanged = true
    }

    // Only update metadata if something changed
    if (metadataChanged) {
      updateData.metadata = newMetadata
    }

    // Update contractor
    const updatedContractor = await contractorRepo.update(id, updateData)

    if (import.meta.dev) {
      consola.success(`PATCH /api/contractors/${id} - Contractor updated:`, {
        id: updatedContractor.id,
        companyName: updatedContractor.company_name,
        status: updatedContractor.status,
      })
    }

    return {
      success: true,
      data: updatedContractor,
      message: 'Contractor updated successfully',
    }
  } catch (error) {
    if (import.meta.dev) {
      consola.error('PATCH /api/contractors/[id] - Error:', error)
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
      message: 'Failed to update contractor',
    })
  }
})

