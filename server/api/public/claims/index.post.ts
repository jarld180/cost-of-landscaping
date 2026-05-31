/**
 * POST /api/public/claims
 *
 * Public endpoint to submit a business claim request
 * Anyone can submit a claim for an unclaimed contractor
 *
 * Flow:
 * 1. Creates claim with status='unverified' and email_verification_token
 * 2. Sends verification email with link to /claim/verify?token={uuid}
 * 3. Token expires after 24 hours
 * 4. Expired unverified claims can be replaced by new submissions
 */

import { z } from 'zod'
import { consola } from 'consola'
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { EmailService } from '../../../services/EmailService'
import type { Database } from '~/types/supabase'

const claimRequestSchema = z.object({
  contractorId: z.string().uuid('Invalid contractor ID'),
  claimantName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  claimantEmail: z.string().email('Invalid email address'),
  claimantPhone: z.string().optional(),
  // Flag indicating user is authenticated (server will verify)
  isAuthenticated: z.boolean().optional(),
})

// Token expiry durations
const EMAIL_VERIFICATION_EXPIRY_HOURS = 24

export default defineEventHandler(async (event) => {
  // Use service role client to bypass RLS for public claim submission
  // This is a public endpoint - validation is handled in code, not via RLS
  const client = serverSupabaseServiceRole<Database>(event)

  // Parse and validate request body
  const body = await readBody(event)
  const parsed = claimRequestSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request',
      data: parsed.error.flatten().fieldErrors,
    })
  }

  const { contractorId, claimantName, claimantEmail, claimantPhone } = parsed.data

  // Get current user if authenticated (optional)
  let userId: string | null = null
  let userEmail: string | null = null
  let isVerifiedUser = false
  try {
    const user = await serverSupabaseUser(event)
    // Supabase JWT uses 'sub' for user ID, not 'id'
    const resolvedUserId = user?.id || user?.sub
    consola.info('[claim] serverSupabaseUser result:', { id: resolvedUserId, email: user?.email })
    if (resolvedUserId) {
      userId = resolvedUserId
      userEmail = user?.email || null

      // Verify the authenticated user's email matches the claim email
      // This prevents someone from claiming with a different email while logged in
      if (userEmail && userEmail.toLowerCase() === claimantEmail.toLowerCase()) {
        isVerifiedUser = true
        consola.info(`Authenticated claim: user ${userId} matches claimant email ${claimantEmail}`)
      } else if (userEmail) {
        // User is logged in but trying to claim with different email - reject
        consola.warn(`Authenticated user ${userId} (${userEmail}) tried to claim with different email: ${claimantEmail}`)
        throw createError({
          statusCode: 400,
          message: 'Please use your account email address to claim this profile, or sign out to use a different email.',
        })
      }
    } else {
      consola.info('[claim] No user returned from serverSupabaseUser')
    }
  } catch (err) {
    // Re-throw our custom errors
    if (err && typeof err === 'object' && 'statusCode' in err) {
      throw err
    }
    // Not authenticated - log for debugging
    consola.warn('[claim] serverSupabaseUser failed:', err instanceof Error ? err.message : String(err))
  }

  // For unauthenticated users, check if email already has an account
  // (Authenticated users are already verified above)
  if (!isVerifiedUser) {
    const { data: listData } = await client.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })
    const existingAuthUser = listData?.users?.find(
      u => u.email?.toLowerCase() === claimantEmail.toLowerCase()
    )
    if (existingAuthUser) {
      // Check if account is active
      const { data: profile } = await client
        .from('account_profiles')
        .select('status')
        .eq('id', existingAuthUser.id)
        .maybeSingle()

      const status = profile?.status || 'active'
      if (status === 'suspended' || status === 'deleted') {
        throw createError({
          statusCode: 400,
          message: 'Unable to process claim with this email address.',
        })
      }
      // Active account exists - must sign in
      consola.info(`[claim] Blocking unauthenticated claim - account exists for ${claimantEmail}`)
      throw createError({
        statusCode: 400,
        message: 'An account with this email already exists. Please sign in to claim this profile.',
      })
    }
  }

  // Check contractor exists and is not already claimed
  const { data: contractor, error: contractorError } = await client
    .from('contractors')
    .select('id, company_name, email, is_claimed')
    .eq('id', contractorId)
    .single()

  if (contractorError || !contractor) {
    consola.error('Contractor lookup error:', contractorError)
    throw createError({
      statusCode: 404,
      message: 'Contractor not found',
    })
  }

  if (contractor.is_claimed) {
    throw createError({
      statusCode: 400,
      message: 'This business has already been claimed',
    })
  }

  // Check for existing claims on this contractor
  const { data: existingClaims } = await client
    .from('business_claims')
    .select('id, status, email_verification_expires_at')
    .eq('contractor_id', contractorId)
    .in('status', ['unverified', 'pending'])

  // Check for active (non-expired) claims
  const now = new Date()
  const activeClaim = existingClaims?.find((claim) => {
    if (claim.status === 'pending') {
      // Pending claims are always active (already verified, awaiting admin review)
      return true
    }
    if (claim.status === 'unverified' && claim.email_verification_expires_at) {
      // Unverified claims are active only if not expired
      return new Date(claim.email_verification_expires_at) > now
    }
    return false
  })

  if (activeClaim) {
    const message = activeClaim.status === 'pending'
      ? 'A claim for this business is already pending review'
      : 'A claim for this business is awaiting email verification. Please check your email.'
    throw createError({
      statusCode: 400,
      message,
    })
  }

  // Delete any expired unverified claims for this contractor to allow new submission
  const expiredClaims = existingClaims?.filter((claim) => {
    if (claim.status === 'unverified' && claim.email_verification_expires_at) {
      return new Date(claim.email_verification_expires_at) <= now
    }
    return false
  })

  if (expiredClaims && expiredClaims.length > 0) {
    const expiredIds = expiredClaims.map(c => c.id)
    await client
      .from('business_claims')
      .delete()
      .in('id', expiredIds)
    consola.info(`Deleted ${expiredIds.length} expired unverified claim(s) for contractor ${contractorId}`)
  }

  // Determine verification method
  const emailMatch = contractor.email?.toLowerCase() === claimantEmail.toLowerCase()
  const verificationMethod = emailMatch ? 'email_match' : 'admin_approval'

  // For authenticated users: skip email verification, go straight to pending
  // For unauthenticated users: require email verification first
  if (isVerifiedUser) {
    // Authenticated user - create claim with 'pending' status (skip email verification)
    const { data: claim, error: claimError } = await client
      .from('business_claims')
      .insert({
        contractor_id: contractorId,
        claimant_user_id: userId,
        claimant_email: claimantEmail,
        claimant_name: claimantName,
        claimant_phone: claimantPhone || null,
        verification_method: 'authenticated_user',
        status: 'pending',
        email_verified_at: now.toISOString(),
        // No verification token needed - already verified via auth
        email_verification_token: null,
        email_verification_expires_at: null,
      })
      .select()
      .single()

    if (claimError) {
      consola.error('Failed to create authenticated claim:', claimError)
      throw createError({
        statusCode: 500,
        message: 'Failed to submit claim',
      })
    }

    consola.success(`Claim submitted (pending - authenticated) for ${contractor.company_name} by ${claimantEmail}`)

    return {
      success: true,
      message: 'Your claim has been submitted and is awaiting admin review.',
      claimId: claim.id,
      verificationMethod: 'authenticated_user',
      skipVerification: true,
    }
  }

  // Unauthenticated user - standard flow with email verification
  // Generate verification token and expiry
  const verificationToken = crypto.randomUUID()
  const verificationExpiresAt = new Date(now.getTime() + EMAIL_VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000)

  // Create the claim with unverified status
  const { data: claim, error: claimError } = await client
    .from('business_claims')
    .insert({
      contractor_id: contractorId,
      claimant_user_id: userId,
      claimant_email: claimantEmail,
      claimant_name: claimantName,
      claimant_phone: claimantPhone || null,
      verification_method: verificationMethod,
      status: 'unverified',
      email_verification_token: verificationToken,
      email_verification_expires_at: verificationExpiresAt.toISOString(),
    })
    .select()
    .single()

  if (claimError) {
    consola.error('Failed to create claim:', claimError)
    throw createError({
      statusCode: 500,
      message: 'Failed to submit claim',
    })
  }

  consola.success(`Claim submitted (unverified) for ${contractor.company_name} by ${claimantEmail}`)

  // Send verification email to claimant (non-blocking)
  const config = useRuntimeConfig()
  if (config.resendApiKey) {
    const emailService = new EmailService({
      apiKey: config.resendApiKey,
      fromEmail: 'noreply@mail.costoflandscape.com',
      siteName: config.public.siteName || 'Cost of Landscaping',
      siteUrl: config.public.siteUrl || 'https://costoflandscaping.com',
    })

    // Fire and forget - don't block the response
    emailService.sendClaimSubmittedEmail({
      claimantEmail,
      claimantName,
      businessName: contractor.company_name,
      verificationToken,
    }).catch((err) => {
      consola.error('Failed to send verification email:', err)
    })
  }

  return {
    success: true,
    message: 'Please check your email to verify your claim. The verification link expires in 24 hours.',
    claimId: claim.id,
    verificationMethod,
    skipVerification: false,
  }
})

