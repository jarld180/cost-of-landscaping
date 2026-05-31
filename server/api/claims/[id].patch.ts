/**
 * PATCH /api/claims/[id]
 *
 * Approve or reject a business claim (admin only).
 *
 * When approved:
 * - Updates claim status to 'approved'
 * - Sets contractor.is_claimed = true
 * - Sets contractor.claimed_by = claimant_user_id (if exists)
 * - Sets contractor.claimed_at = now()
 *
 * @param {string} id - Claim UUID
 *
 * Request Body:
 * - status: 'approved' | 'rejected' (required)
 * - adminNotes: Optional notes about the decision
 *
 * @returns {Object} Updated claim data
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { requireAdmin } from '../../utils/auth'
import type { Database } from '../../../app/types/supabase'
import { z } from 'zod'
import { EmailService } from '../../services/EmailService'

// Request body schema
const updateClaimSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  adminNotes: z.string().optional(),
})

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

    // Require admin authentication
    const adminUserId = await requireAdmin(event)

    if (import.meta.dev) {
      consola.info(`PATCH /api/claims/${id} - Updating claim`, { adminUserId })
    }

    // Get and validate request body
    const body = await readBody(event)
    const validatedData = updateClaimSchema.parse(body)

    if (import.meta.dev) {
      consola.info(`PATCH /api/claims/${id} - Validated data:`, validatedData)
    }

    // Get Supabase client
    const client = await serverSupabaseClient<Database>(event)

    // Get the claim first to check it exists and get contractor_id
    const { data: existingClaim, error: fetchError } = await client
      .from('business_claims')
      .select('*, contractor:contractors!business_claims_contractor_id_fkey (id, company_name)')
      .eq('id', id)
      .single()

    if (fetchError || !existingClaim) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: 'Claim not found',
      })
    }

    // Check claim is still pending (must be email-verified to be reviewable)
    if (existingClaim.status !== 'pending') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: `Claim has already been ${existingClaim.status}`,
      })
    }

    // Prepare update payload
    const now = new Date()
    const updatePayload: Record<string, unknown> = {
      status: validatedData.status,
      admin_notes: validatedData.adminNotes || null,
      reviewed_by: adminUserId,
      reviewed_at: now.toISOString(),
      updated_at: now.toISOString(),
    }

    // If approving, check if user is already authenticated (has claimant_user_id)
    // For authenticated users: mark contractor as claimed immediately, set status to 'completed'
    // For unauthenticated users: generate activation token and send email
    let activationToken: string | null = null
    const isAuthenticatedClaim = existingClaim.verification_method === 'authenticated_user' && existingClaim.claimant_user_id

    if (validatedData.status === 'approved') {
      if (isAuthenticatedClaim) {
        // Authenticated user - mark as completed immediately
        updatePayload.status = 'completed'

        // Update contractor to mark as claimed and generate embed token
        const { error: contractorError } = await client
          .from('contractors')
          .update({
            is_claimed: true,
            claimed_by: existingClaim.claimant_user_id,
            claimed_at: now.toISOString(),
            embed_token: crypto.randomUUID(),
          })
          .eq('id', existingClaim.contractor_id)

        if (contractorError) {
          consola.error(`PATCH /api/claims/${id} - Failed to update contractor:`, contractorError)
          throw createError({
            statusCode: 500,
            statusMessage: 'Internal Server Error',
            message: 'Failed to link contractor to user',
          })
        }

        if (import.meta.dev) {
          consola.success(`PATCH /api/claims/${id} - Contractor linked to existing user ${existingClaim.claimant_user_id}`)
        }
      } else {
        // Unauthenticated user - generate activation token
        activationToken = crypto.randomUUID()
        const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days
        updatePayload.account_activation_token = activationToken
        updatePayload.account_activation_expires_at = expiresAt.toISOString()

        if (import.meta.dev) {
          consola.info(`PATCH /api/claims/${id} - Generated activation token, expires:`, expiresAt.toISOString())
        }
      }
    }

    // Update the claim
    const { data: updatedClaim, error: updateError } = await client
      .from('business_claims')
      .update(updatePayload)
      .eq('id', id)
      .select('*, contractor:contractors!business_claims_contractor_id_fkey (id, company_name, slug)')
      .single()

    if (updateError) {
      consola.error(`PATCH /api/claims/${id} - Update error:`, updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Internal Server Error',
        message: 'Failed to update claim',
      })
    }

    // Note: Contractor is NOT marked as claimed here anymore.
    // That happens during account activation (Phase 4) to ensure the user
    // actually completes the activation flow before claiming the profile.

    if (import.meta.dev) {
      consola.success(`PATCH /api/claims/${id} - Claim ${validatedData.status}`)
    }

    // Send notification email to claimant (non-blocking)
    const config = useRuntimeConfig()
    if (config.resendApiKey && existingClaim.claimant_email) {
      const emailService = new EmailService({
        apiKey: config.resendApiKey,
        fromEmail: 'noreply@mail.costoflandscape.com',
        siteName: config.public.siteName || 'Cost of Landscaping',
        siteUrl: config.public.siteUrl || 'https://costoflandscaping.com',
      })

      const emailData = {
        claimantEmail: existingClaim.claimant_email,
        claimantName: existingClaim.claimant_name,
        businessName: (existingClaim.contractor as { company_name: string })?.company_name || 'your business',
      }

      // Fire and forget - don't block the response
      if (validatedData.status === 'approved') {
        if (isAuthenticatedClaim) {
          // Authenticated user - send simple approval notification (no activation needed)
          emailService.sendClaimApprovedAuthenticatedEmail({
            ...emailData,
          }).catch((err) => {
            consola.error('Failed to send claim approved (authenticated) email:', err)
          })
        } else if (activationToken) {
          // Unauthenticated user - send activation email
          emailService.sendClaimApprovedEmail({
            ...emailData,
            activationToken,
          }).catch((err) => {
            consola.error('Failed to send claim approved email:', err)
          })
        }
      } else if (validatedData.status === 'rejected') {
        emailService.sendClaimRejectedEmail({
          ...emailData,
          rejectionReason: validatedData.adminNotes,
        }).catch((err) => {
          consola.error('Failed to send claim rejected email:', err)
        })
      }
    }

    return {
      success: true,
      data: updatedClaim,
      message: `Claim ${validatedData.status} successfully`,
    }
  } catch (error) {
    if (import.meta.dev) {
      consola.error('PATCH /api/claims/[id] - Error:', error)
    }

    // Re-throw HTTP errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Invalid request body',
        data: error.errors,
      })
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'An unexpected error occurred',
    })
  }
})

