/**
 * Image Upload Validation Schema
 *
 * Defines validation rules for CMS image uploads.
 * Used by /api/images/upload endpoint.
 *
 * Issue: BAM-304 / BAM-306
 */

import { z } from 'zod'

// =====================================================
// CONSTANTS
// =====================================================

/**
 * Maximum file size in bytes (5MB)
 */
export const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

/**
 * Maximum file size in human-readable format
 */
export const MAX_FILE_SIZE_LABEL = '5MB'

/**
 * Allowed MIME types for image uploads
 *
 * FUTURE ENHANCEMENT: Add 'image/svg+xml' with server-side
 * sanitization using DOMPurify to prevent XSS attacks
 */
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const

/**
 * File extensions mapped to MIME types
 */
export const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

/**
 * Maximum length for slugified filename (before hash)
 */
export const MAX_SLUG_LENGTH = 50

// =====================================================
// SCHEMAS
// =====================================================

/**
 * Image upload request schema
 * Note: File validation is done separately since multipart data
 * doesn't work directly with Zod
 */
export const imageUploadMetadataSchema = z.object({
  /**
   * Alt text for the image (used for SEO filename + accessibility)
   */
  alt: z.string()
    .max(200, 'Alt text must be 200 characters or less')
    .optional(),

  /**
   * Title for the image (shows on hover)
   */
  title: z.string()
    .max(200, 'Title must be 200 characters or less')
    .optional(),
})

export type ImageUploadMetadata = z.infer<typeof imageUploadMetadataSchema>

// =====================================================
// RESPONSE TYPES
// =====================================================

/**
 * Successful upload response data
 */
export interface ImageUploadData {
  /** Public URL to access the image */
  url: string
  /** Storage path (for potential future deletion) */
  storagePath: string
  /** Original filename */
  filename: string
  /** File size in bytes */
  size: number
  /** MIME type */
  mimeType: string
  /** Alt text (if provided) */
  alt?: string
  /** Title (if provided) */
  title?: string
}

/**
 * Image upload API response
 */
export interface ImageUploadResponse {
  success: boolean
  data?: ImageUploadData
  error?: string
}

// =====================================================
// VALIDATION HELPERS
// =====================================================

/**
 * Check if a MIME type is allowed
 */
export function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType as typeof ALLOWED_MIME_TYPES[number])
}

/**
 * Get file extension from MIME type
 */
export function getExtensionFromMimeType(mimeType: string): string {
  return MIME_TO_EXTENSION[mimeType] || 'bin'
}

/**
 * Check if file size is within limit
 */
export function isWithinSizeLimit(size: number): boolean {
  return size <= MAX_FILE_SIZE
}

