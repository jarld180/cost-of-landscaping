/**
 * PATCH /api/owner/contractors/[id]
 *
 * Update a contractor profile by the owner.
 * Verifies ownership before allowing updates.
 */

import { consola } from 'consola'
import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'
import { requireOwner } from '../../../utils/auth'

// Day hours schema
const dayHoursSchema = z.object({
  open: z.string(),
  close: z.string(),
}).nullable()

// Business hours object format
const businessHoursSchema = z.object({
  monday: dayHoursSchema.optional(),
  tuesday: dayHoursSchema.optional(),
  wednesday: dayHoursSchema.optional(),
  thursday: dayHoursSchema.optional(),
  friday: dayHoursSchema.optional(),
  saturday: dayHoursSchema.optional(),
  sunday: dayHoursSchema.optional(),
}).optional().nullable()

// Social links with all 6 platforms
const socialLinksSchema = z.object({
  facebook: z.string().url().or(z.literal('')).nullable().optional(),
  instagram: z.string().url().or(z.literal('')).nullable().optional(),
  youtube: z.string().url().or(z.literal('')).nullable().optional(),
  linkedin: z.string().url().or(z.literal('')).nullable().optional(),
  twitter: z.string().url().or(z.literal('')).nullable().optional(),
  yelp: z.string().url().or(z.literal('')).nullable().optional(),
}).optional().nullable()

// Schema for updatable fields
const updateContractorSchema = z.object({
  companyName: z.string().min(2).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  website: z.string().url().max(500).optional().nullable(),
  // Metadata fields
  businessHours: businessHoursSchema,
  socialLinks: socialLinksSchema,
  // Service type IDs for junction table
  serviceTypeIds: z.array(z.string().uuid()).optional(),
})

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
  const userId = await requireOwner(event, contractorId)

  // Parse and validate request body
  const body = await readBody(event)
  const validationResult = updateContractorSchema.safeParse(body)

  if (!validationResult.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: validationResult.error.errors[0]?.message || 'Invalid input'
    })
  }

  const updates = validationResult.data

  if (import.meta.dev) {
    consola.info('PATCH /api/owner/contractors/[id] - Updating contractor', { contractorId, userId, updates })
  }

  const client = await serverSupabaseClient(event)

  // Build update object
  const dbUpdates: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  }

  // Map camelCase to snake_case for direct columns
  if (updates.companyName !== undefined) dbUpdates.company_name = updates.companyName
  if (updates.description !== undefined) dbUpdates.description = updates.description
  if (updates.phone !== undefined) dbUpdates.phone = updates.phone
  if (updates.email !== undefined) dbUpdates.email = updates.email
  if (updates.website !== undefined) dbUpdates.website = updates.website

  // Handle metadata updates (merge with existing)
  if (updates.businessHours !== undefined || updates.socialLinks !== undefined) {
    // First fetch existing metadata
    const { data: existing } = await client
      .from('contractors')
      .select('metadata')
      .eq('id', contractorId)
      .single()

    const existingMetadata = (existing?.metadata as Record<string, unknown>) || {}
    const newMetadata = { ...existingMetadata }

    // Store business hours in object format (normalized)
    if (updates.businessHours !== undefined) {
      newMetadata.business_hours = updates.businessHours
    }

    // Store social links (filter out empty strings)
    if (updates.socialLinks !== undefined) {
      const cleanedLinks: Record<string, string> = {}
      for (const [key, value] of Object.entries(updates.socialLinks || {})) {
        if (value && typeof value === 'string' && value.trim() !== '') {
          cleanedLinks[key] = value.trim()
        }
      }
      newMetadata.social_links = Object.keys(cleanedLinks).length > 0 ? cleanedLinks : null
    }

    dbUpdates.metadata = newMetadata
  }

  // Perform contractor update
  const { data: contractor, error } = await client
    .from('contractors')
    .update(dbUpdates)
    .eq('id', contractorId)
    .select('id, company_name, updated_at')
    .single()

  if (error) {
    consola.error('PATCH /api/owner/contractors/[id] - Database error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to update contractor'
    })
  }

  // Handle service type updates via junction table
  if (updates.serviceTypeIds !== undefined) {
    // Delete existing associations
    const { error: deleteError } = await client
      .from('contractor_service_types')
      .delete()
      .eq('contractor_id', contractorId)

    if (deleteError) {
      consola.warn('PATCH /api/owner/contractors/[id] - Failed to delete service types:', deleteError)
    }

    // Insert new associations
    if (updates.serviceTypeIds.length > 0) {
      const inserts = updates.serviceTypeIds.map(serviceTypeId => ({
        contractor_id: contractorId,
        service_type_id: serviceTypeId,
        source: 'manual' as const,
        confidence_score: 1.0,
      }))

      const { error: insertError } = await client
        .from('contractor_service_types')
        .insert(inserts)

      if (insertError) {
        consola.warn('PATCH /api/owner/contractors/[id] - Failed to insert service types:', insertError)
      }
    }

    if (import.meta.dev) {
      consola.info(`PATCH /api/owner/contractors/[id] - Updated ${updates.serviceTypeIds.length} service types`)
    }
  }

  if (import.meta.dev) {
    consola.success('PATCH /api/owner/contractors/[id] - Contractor updated successfully')
  }

  return {
    success: true,
    contractor: {
      id: contractor.id,
      companyName: contractor.company_name,
      updatedAt: contractor.updated_at
    }
  }
})

