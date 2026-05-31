/**
 * POST /api/claims/[id]/resend-activation
 *
 * Resend the account activation email for an approved claim (admin only).
 *
 * This endpoint:
 * - Validates the claim exists and is in 'approved' status
 * - Checks the account hasn't already been activated
 * - Generates a new activation token with 7-day expiry
 * - Sends the activation email
 *
 * @param {string} id - Claim UUID
 * @returns {Object} Success message
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { requireAdmin } from '../../../utils/auth'
import type { Database } from '../../../../app/types/supabase'
import { z } from 'zod'
import { EmailService } from '../../../services/EmailService'

// Validate claim ID format
const claimIdSchema = z.string().uuid()

export default defineEventHandler(async (event) => {
  try {
    // Get claim ID from route params
    const id = getRouterParam(event, 'id')

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Claim ID is required',
      })
    }

    // Validate UUID format
    const parseResult = claimIdSchema.safeParse(id)
    if (!parseResult.success) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Invalid claim ID format',
      })
    }

    // Require admin authentication
    const adminUserId = await requireAdmin(event)

    if (import.meta.dev) {
      consola.info(`POST /api/claims/${id}/resend-activation - Resending activation email`, { adminUserId })
    }

    // Get Supabase client
    const client = await serverSupabaseClient<Database>(event)

    // Get the claim with contractor info
    const { data: claim, error: fetchError } = await client
      .from('business_claims')
      .select('*, contractor:contractors!business_claims_contractor_id_fkey (id, company_name)')
      .eq('id', id)
      .single()

    if (fetchError || !claim) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: 'Claim not found',
      })
    }

    // Validate claim is in approved status
    if (claim.status !== 'approved') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: `Cannot resend activation for claim with status '${claim.status}'. Claim must be approved.`,
      })
    }

    // Check if account has already been activated
    if (claim.account_activated_at) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Account has already been activated',
      })
    }

    // Generate new activation token with 7-day expiry
    const now = new Date()
    const activationToken = crypto.randomUUID()
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Update the claim with new token
    const { error: updateError } = await client
      .from('business_claims')
      .update({
        account_activation_token: activationToken,
        account_activation_expires_at: expiresAt.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      consola.error(`POST /api/claims/${id}/resend-activation - Update error:`, updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Internal Server Error',
        message: 'Failed to generate new activation token',
      })
    }

    if (import.meta.dev) {
      consola.success(`POST /api/claims/${id}/resend-activation - New token generated, expires:`, expiresAt.toISOString())
    }

    // Send the activation email
    const config = useRuntimeConfig()
    if (!config.resendApiKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Internal Server Error',
        message: 'Email service not configured',
      })
    }

    const emailService = new EmailService({
      apiKey: config.resendApiKey,
      fromEmail: 'noreply@mail.costoflandscape.com',
      siteName: config.public.siteName || 'Cost of Landscaping',
      siteUrl: config.public.siteUrl || 'https://costoflandscaping.com',
    })

    const businessName = (claim.contractor as { company_name: string })?.company_name || 'your business'

    const emailSent = await emailService.sendClaimApprovedEmail({
      claimantEmail: claim.claimant_email,
      claimantName: claim.claimant_name,
      businessName,
      activationToken,
    })

    if (!emailSent) {
      consola.error(`POST /api/claims/${id}/resend-activation - Failed to send email`)
      // Don't throw - token was updated, just warn
    }

    return {
      success: true,
      message: 'Activation email resent successfully',
      expiresAt: expiresAt.toISOString(),
    }
  } catch (error) {
    if (import.meta.dev) {
      consola.error('POST /api/claims/[id]/resend-activation - Error:', error)
    }

    // Re-throw HTTP errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'An unexpected error occurred',
    })
  }
})

