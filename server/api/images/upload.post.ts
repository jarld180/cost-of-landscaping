/**
 * Image Upload API Endpoint
 *
 * Handles image uploads for the CMS TipTap editor.
 * Stores images in Supabase Storage with SEO-friendly filenames.
 *
 * POST /api/images/upload
 *
 * Issue: BAM-304 / BAM-306
 *
 * FUTURE ENHANCEMENTS:
 * - Image optimization: Resize large images (max 2000px width)
 * - WebP conversion: Convert uploads to WebP for better compression
 * - Responsive images: Generate multiple sizes (thumbnail, medium, large)
 * - Media library: Track uploads in database for reuse across pages
 * - Bulk upload: Support multiple file uploads in single request
 */

import { createHash } from 'crypto'
import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { requireAdmin } from '../../utils/auth'
import {
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_LABEL,
  MAX_SLUG_LENGTH,
  isAllowedMimeType,
  isWithinSizeLimit,
  getExtensionFromMimeType,
  imageUploadMetadataSchema,
  type ImageUploadResponse,
} from '../../schemas/image-upload.schema'

/**
 * Generate SEO-friendly slug from text
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .slice(0, MAX_SLUG_LENGTH) // Truncate to max length
}

/**
 * Generate storage path with SEO-friendly filename
 * Format: {year}/{month}/{slug}-{hash}.{ext}
 */
function generateStoragePath(
  filename: string,
  mimeType: string,
  buffer: Buffer,
  altText?: string
): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')

  // Determine slug source: alt text > filename > fallback
  let slugSource = 'image'
  if (altText && altText.trim()) {
    slugSource = altText.trim()
  } else if (filename) {
    // Remove extension from filename
    slugSource = filename.replace(/\.[^/.]+$/, '')
  }

  const slug = slugify(slugSource) || 'image'
  const hash = createHash('md5').update(buffer).digest('hex').slice(0, 6)
  const extension = getExtensionFromMimeType(mimeType)

  return `${year}/${month}/${slug}-${hash}.${extension}`
}

export default defineEventHandler(async (event): Promise<ImageUploadResponse> => {
  // Require admin authentication
  await requireAdmin(event)

  try {
    // Parse multipart form data
    const formData = await readMultipartFormData(event)

    if (!formData || formData.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'No file uploaded. Please provide an image file.',
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

    const { data: fileBuffer, filename, type: mimeType } = fileField

    // Validate MIME type
    if (!mimeType || !isAllowedMimeType(mimeType)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: `Invalid file type "${mimeType || 'unknown'}". Allowed types: JPEG, PNG, WebP, GIF.`,
      })
    }

    // Validate file size
    if (!isWithinSizeLimit(fileBuffer.length)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: `File too large. Maximum size is ${MAX_FILE_SIZE_LABEL}.`,
      })
    }

    // Parse optional metadata (alt, title)
    const altField = formData.find(field => field.name === 'alt')
    const titleField = formData.find(field => field.name === 'title')

    const metadata = imageUploadMetadataSchema.parse({
      alt: altField?.data?.toString('utf-8'),
      title: titleField?.data?.toString('utf-8'),
    })

    // Generate SEO-friendly storage path
    const storagePath = generateStoragePath(
      filename || 'image',
      mimeType,
      fileBuffer,
      metadata.alt
    )

    if (import.meta.dev) {
      consola.info('POST /api/images/upload - Uploading:', {
        filename,
        mimeType,
        size: fileBuffer.length,
        storagePath,
      })
    }

    // Upload to Supabase Storage
    const client = await serverSupabaseClient(event)
    const { error: uploadError } = await client.storage
      .from('images')
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: false, // Don't overwrite existing files
      })

    if (uploadError) {
      consola.error('POST /api/images/upload - Storage error:', uploadError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Internal Server Error',
        message: 'Failed to upload image. Please try again.',
      })
    }

    // Get public URL
    const { data: urlData } = client.storage.from('images').getPublicUrl(storagePath)

    if (import.meta.dev) {
      consola.success('POST /api/images/upload - Success:', urlData.publicUrl)
    }

    return {
      success: true,
      data: {
        url: urlData.publicUrl,
        storagePath,
        filename: filename || 'image',
        size: fileBuffer.length,
        mimeType,
        alt: metadata.alt,
        title: metadata.title,
      },
    }
  } catch (error) {
    // Re-throw H3 errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    consola.error('POST /api/images/upload - Unexpected error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to upload image',
    })
  }
})

