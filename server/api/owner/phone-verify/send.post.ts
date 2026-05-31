/**
 * POST /api/owner/phone-verify/send
 * Send a phone verification OTP to the contractor's phone via Twilio Verify.
 */

import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import { requireOwner } from '../../../utils/auth'
import { applyRateLimit } from '../../../utils/rateLimit'

const bodySchema = z.object({
  contractorId: z.string().uuid(),
})

export default defineEventHandler(async (event) => {
  await applyRateLimit(event, { maxRequests: 3, windowSeconds: 60, keyPrefix: 'phone-verify-send' })

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'contractorId is required' })
  }

  const { contractorId } = parsed.data
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
    throw createError({ statusCode: 400, message: 'No phone number on file. Add a phone number first.' })
  }

  if (contractor.phone_verified) {
    throw createError({ statusCode: 400, message: 'Phone number is already verified.' })
  }

  // Normalize phone: ensure E.164 format (prefix +1 if US number without country code)
  let phone = contractor.phone.replace(/\D/g, '')
  if (phone.length === 10) phone = `+1${phone}`
  else if (!phone.startsWith('+')) phone = `+${phone}`

  const creds = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
  const resp = await fetch(
    `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${creds}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: phone, Channel: 'sms' }),
    }
  )

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    throw createError({ statusCode: 502, message: (err as any).message || 'Failed to send verification code' })
  }

  return { success: true, message: `Verification code sent to ${contractor.phone}` }
})
