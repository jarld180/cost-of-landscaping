/**
 * POST /api/owner/contractors/:id/verifications
 * Submit a COI verification request
 * Accepts multipart/form-data with: file, additionalInsuredName, coverageAmount, policyExpiresAt
 */

import { z } from 'zod'
import { serverSupabaseServiceRole } from '#supabase/server'
import { requireOwner } from '../../../../utils/auth'

const submissionSchema = z.object({
  additionalInsuredName: z.string().min(1, 'Additional insured name is required'),
  coverageAmount: z.coerce.number().positive().optional(),
  policyExpiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
})

export default defineEventHandler(async (event) => {
  const contractorId = getRouterParam(event, 'id')

  if (!contractorId) {
    throw createError({ statusCode: 400, message: 'Contractor ID required' })
  }

  const userId = await requireOwner(event, contractorId)
  const client = serverSupabaseServiceRole(event)

  // Parse multipart form
  const formData = await readMultipartFormData(event)
  if (!formData) {
    throw createError({ statusCode: 400, message: 'Form data required' })
  }

  const fields: Record<string, string> = {}
  let fileField: { data: Buffer; filename: string; type: string } | null = null

  for (const part of formData) {
    if (part.name === 'file' && part.data) {
      fileField = { data: part.data, filename: part.filename || 'document', type: part.type || 'application/pdf' }
    } else if (part.name && part.data) {
      fields[part.name] = part.data.toString()
    }
  }

  const parsed = submissionSchema.safeParse(fields)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Invalid form data' })
  }

  // Block submissions earlier than today
  if (new Date(parsed.data.policyExpiresAt) <= new Date()) {
    throw createError({ statusCode: 400, message: 'Policy expiry date must be in the future' })
  }

  let documentUrl: string | null = null

  // Upload file to private bucket if provided
  if (fileField) {
    const ext = fileField.filename.split('.').pop() || 'pdf'
    const storagePath = `${contractorId}/${Date.now()}.${ext}`

    const { error: uploadError } = await client.storage
      .from('contractor-documents')
      .upload(storagePath, fileField.data, { contentType: fileField.type, upsert: false })

    if (uploadError) {
      throw createError({ statusCode: 500, message: 'Failed to upload document' })
    }

    documentUrl = storagePath
  }

  // Create the verification record
  const { data: verification, error: insertError } = await client
    .from('contractor_verifications')
    .insert({
      contractor_id: contractorId,
      type: 'coi',
      status: 'pending',
      document_url: documentUrl,
      additional_insured_name: parsed.data.additionalInsuredName,
      coverage_amount: parsed.data.coverageAmount || null,
      policy_expires_at: parsed.data.policyExpiresAt,
    })
    .select('id')
    .single()

  if (insertError) {
    throw createError({ statusCode: 500, message: 'Failed to submit verification' })
  }

  return {
    success: true,
    data: { id: verification.id },
    message: 'COI submitted for review. You\'ll be notified once approved.',
  }
})
