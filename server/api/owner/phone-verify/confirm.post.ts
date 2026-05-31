/**
 * POST /api/owner/phone-verify/confirm
 * Confirm a phone OTP and mark the contractor's phone as verified.
 */

import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import { requireOwner } from '../../../utils/auth'
import { applyRateLimit } from '../../../utils/rateLimit'

const bodySchema = z.object({
  contractorId: z.string().uuid(),
  code: z.string().min(4).max(10),
})

export default defineEventHandler(async (event) => {
  await applyRateLimit(event, { maxRequests: 5, windowSeconds: 60, keyPrefix: 'phone-verify-confirm' })

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'contractorId and code are required' })
  }

  const { contractorId, code } = parsed.data
  await requireOwner(event, contractorId)

  const config = useRuntimeConfig()
  const accountSid = config.twilioAccountSid
  const authToken = config.twilioAuthToken
  const serviceSid = config.twilioVerifyServiceSid

  if (!accountSid || !authToken || !serviceSid) {
    throw createError({ statusCode: 503, message: 'Phone verification is not configured' })
  }

  const client = await serverSupabaseClient(event)
  const { data: contractor, error } = await client
    .from('contractors')
    .select('phone, phone_verified')
    .eq('id', contractorId)
    .single()

  if (error || !contractor?.phone) {
    throw createError({ statusCode: 400, message: 'No phone number on file.' })
  }

  if (contractor.phone_verified) {
    return { success: true, message: 'Phone is already verified.' }
  }

  let phone = contractor.phone.replace(/\D/g, '')
  if (phone.length === 10) phone = `+1${phone}`
  else if (!phone.startsWith('+')) phone = `+${phone}`

  const creds = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
  const resp = await fetch(
    `https://verify.twilio.com/v2/Services/${serviceSid}/VerificationCheck`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${creds}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: phone, Code: code }),
    }
  )

  const result = await resp.json().catch(() => ({})) as any

  if (!resp.ok || result.status !== 'approved') {
    throw createError({ statusCode: 400, message: 'Invalid or expired verification code.' })
  }

  // Mark verified using service role to bypass RLS
  const adminClient = serverSupabaseServiceRole(event)
  const { error: updateError } = await adminClient
    .from('contractors')
    .update({ phone_verified: true, phone_verified_at: new Date().toISOString() })
    .eq('id', contractorId)

  if (updateError) {
    throw createError({ statusCode: 500, message: 'Failed to save verification status.' })
  }

  return { success: true, message: 'Phone number verified successfully.' }
})
