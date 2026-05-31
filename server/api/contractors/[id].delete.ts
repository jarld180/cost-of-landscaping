/**
 * DELETE /api/contractors/[id]
 *
 * Soft delete a contractor (admin only).
 *
 * Note: This performs a soft delete (sets deleted_at timestamp).
 *
 * @param {string} id - Contractor UUID
 * @returns {Object} Success message
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { ContractorRepository } from '../../repositories/ContractorRepository'
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
      consola.info(`DELETE /api/contractors/${id} - Deleting contractor`, { userId })
    }

    // Get Supabase client
    const client = await serverSupabaseClient<Database>(event)
    const contractorRepo = new ContractorRepository(client)

    // Verify contractor exists before deleting
    const existingContractor = await contractorRepo.findById(id)

    if (!existingContractor) {
      if (import.meta.dev) {
        consola.warn(`DELETE /api/contractors/${id} - Contractor not found`)
      }

      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: `Contractor with ID '${id}' not found`,
      })
    }

    // Soft delete the contractor
    await contractorRepo.softDelete(id)

    if (import.meta.dev) {
      consola.success(`DELETE /api/contractors/${id} - Contractor deleted:`, {
        id: existingContractor.id,
        companyName: existingContractor.company_name,
      })
    }

    return {
      success: true,
      message: 'Contractor deleted successfully',
      data: {
        id: existingContractor.id,
        companyName: existingContractor.company_name,
        slug: existingContractor.slug,
      },
    }
  } catch (error) {
    if (import.meta.dev) {
      consola.error('DELETE /api/contractors/[id] - Error:', error)
    }

    // Re-throw if already an H3Error
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to delete contractor',
    })
  }
})

