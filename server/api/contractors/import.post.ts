/**
 * POST /api/contractors/import
 *
 * Import contractors from Apify Google Maps Scraper JSON export.
 *
 * Constraints:
 * - Max 100 rows per file
 * - Synchronous processing (no background jobs)
 * - Images stored as URLs (processed separately via enrich-images)
 *
 * Request: multipart/form-data with 'file' field containing JSON
 * Response: ImportResponse with summary of imported/updated/skipped/errors
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { requireAdmin } from '../../utils/auth'
import { ImportService } from '../../services/ImportService'
import { MAX_IMPORT_ROWS, type ImportResponse } from '../../schemas/import.schemas'

export default defineEventHandler(async (event): Promise<ImportResponse> => {
  // Require admin authentication
  await requireAdmin(event)

  try {
    // Get runtime config
    const config = useRuntimeConfig()

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

    // Check row count before processing
    if (jsonData.length > MAX_IMPORT_ROWS) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: `File exceeds ${MAX_IMPORT_ROWS} row limit`,
        data: { count: jsonData.length },
      })
    }

    if (import.meta.dev) {
      consola.info(`POST /api/contractors/import - Processing ${jsonData.length} rows`)
    }

    // Initialize service
    const client = await serverSupabaseClient(event)
    const imageAllowlist = config.imageAllowlist
      ? config.imageAllowlist.split(',').map((s: string) => s.trim())
      : ['lh3.googleusercontent.com', 'streetviewpixels-pa.googleapis.com']

    const importService = new ImportService(client, {
      geocodingApiKey: config.googleGeocodingApiKey || '',
      imageAllowlist,
    })

    // Process import
    const summary = await importService.processImport(jsonData)

    if (import.meta.dev) {
      consola.success('POST /api/contractors/import - Import complete', summary)
    }

    return {
      success: true,
      summary,
    }
  } catch (error) {
    // Re-throw H3 errors as-is
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    consola.error('POST /api/contractors/import - Error:', error)

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to process import',
    })
  }
})

