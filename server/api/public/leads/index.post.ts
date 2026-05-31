/**
 * POST /api/public/leads
 * Save a contact form submission from a contractor profile page.
 * Falls back to background_jobs queue if leads table lacks DB-level GRANT.
 */

import { z } from 'zod'
import { serverSupabaseServiceRole } from '#supabase/server'
import { applyRateLimit } from '../../../utils/rateLimit'

const leadSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(200),
  phone: z.string().max(30).optional(),
  projectDetails: z.string().max(2000).optional(),
  projectType: z.string().max(100).optional(),
  contractorId: z.string().uuid().optional(),
  city: z.string().max(100).optional(),
  stateCode: z.string().max(2).optional(),
  source: z.string().max(50).default('contractor_profile'),
})

export default defineEventHandler(async (event) => {
  await applyRateLimit(event, { maxRequests: 5, windowSeconds: 60, keyPrefix: 'leads-submit' })

  const body = await readBody(event)
  const parsed = leadSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues[0]?.message || 'Invalid form data'
    })
  }

  const d = parsed.data
  const serviceClient = serverSupabaseServiceRole(event)

  const leadRow = {
    name: d.name,
    email: d.email,
    phone: d.phone || null,
    project_details: d.projectDetails || null,
    project_type: d.projectType || null,
    contractor_id: d.contractorId || null,
    city: d.city || null,
    state_code: d.stateCode || null,
    source: d.source,
  }

  const { error: leadsError } = await serviceClient.from('leads').insert(leadRow)

  if (leadsError) {
    // leads table missing DB-level GRANT — queue in background_jobs until migration applied
    const { error: queueError } = await serviceClient.from('background_jobs').insert({
      job_type: 'lead_capture',
      payload: leadRow,
    })

    if (queueError) {
      throw createError({ statusCode: 500, message: 'Failed to save your message' })
    }
  }

  return { success: true, message: 'Message sent successfully.' }
})
