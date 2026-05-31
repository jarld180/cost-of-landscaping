/**
 * POST /api/contractors/import-jobs
 *
 * Create a new import job from Apify JSON export.
 * Stores raw data in database for batch processing.
 * No row limit - designed for large imports.
 *
 * Request: multipart/form-data with 'file' field containing JSON
 * Response: CreateImportJobResponse with job ID and total rows
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { requireAdmin } from '../../../utils/auth'
import { ImportJobRepository } from '../../../repositories/ImportJobRepository'
import { apifyImportFileSchema, type CreateImportJobResponse, type ApifyRow } from '../../../schemas/import.schemas'
import type { Database } from '../../../../app/types/supabase'

export default defineEventHandler(async (event): Promise<CreateImportJobResponse> => {
  await requireAdmin(event)

  try {
    // Parse multipart form data
    const formData = await readMultipartFormData(event)

    if (!formData || formData.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'No file uploaded. Please provide a JSON file.',
      })
    }

    // Find the file field
    const fileField = formData.find(field => field.name === 'file')

    if (!fileField || !fileField.data) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'No file field found. Please upload a file with field name "file".',
      })
    }

    // Parse JSON from file
    let jsonData: unknown
    try {
      const fileContent = fileField.data.toString('utf-8')
      jsonData = JSON.parse(fileContent)
    } catch {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Invalid JSON format. Please upload a valid JSON file.',
      })
    }

    // Validate it's an array
    if (!Array.isArray(jsonData)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'JSON must be an array of contractor objects.',
      })
    }

    // Validate schema
    const parseResult = apifyImportFileSchema.safeParse(jsonData)
    if (!parseResult.success) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Invalid data format',
        data: parseResult.error.issues.slice(0, 5), // First 5 errors
      })
    }

    const rows = parseResult.data as ApifyRow[]
    const filename = fileField.filename || 'import.json'

    if (import.meta.dev) {
      consola.info(`POST /api/contractors/import-jobs - Creating job with ${rows.length} rows`)
    }

    // Create import job
    const client = await serverSupabaseClient<Database>(event)
    const repository = new ImportJobRepository(client)

    const job = await repository.create({
      filename,
      total_rows: rows.length,
      raw_data: rows,
      status: 'pending',
    })

    if (import.meta.dev) {
      consola.success(`POST /api/contractors/import-jobs - Created job ${job.id}`)
    }

    return {
      success: true,
      jobId: job.id,
      totalRows: rows.length,
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    consola.error('POST /api/contractors/import-jobs - Error:', error)

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to create import job',
    })
  }
})

