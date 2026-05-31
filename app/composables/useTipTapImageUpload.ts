/**
 * TipTap Image Upload Composable
 *
 * Handles image upload functionality for the TipTap editor.
 * Provides client-side validation and API integration.
 *
 * Issue: BAM-304 / BAM-307
 *
 * FUTURE ENHANCEMENTS:
 * - Upload progress tracking with XHR/fetch progress events
 * - Batch upload support for multiple images
 * - Client-side image optimization before upload
 * - Drag-and-drop zone visual feedback
 */

// Types mirrored from server/schemas/image-upload.schema.ts
interface ImageUploadData {
  url: string
  storagePath: string
  filename: string
  size: number
  mimeType: string
  alt?: string
  title?: string
}

interface ImageUploadResponse {
  success: boolean
  data?: ImageUploadData
  error?: string
}

// =====================================================
// CONSTANTS (mirror server-side for client validation)
// =====================================================

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_FILE_SIZE_LABEL = '5MB'
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif']

// =====================================================
// TYPES
// =====================================================

export interface UploadOptions {
  alt?: string
  title?: string
}

export interface UploadResult {
  success: boolean
  data?: ImageUploadData
  error?: string
}

export interface ImageUploadState {
  isUploading: boolean
  progress: number
  error: string | null
}

// =====================================================
// COMPOSABLE
// =====================================================

export function useTipTapImageUpload() {
  const state = reactive<ImageUploadState>({
    isUploading: false,
    progress: 0,
    error: null,
  })

  /**
   * Validate a file before upload
   */
  function validateFile(file: File): { valid: boolean; error?: string } {
    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: `Invalid file type "${file.type}". Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
      }
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
      return {
        valid: false,
        error: `File too large (${sizeMB}MB). Maximum: ${MAX_FILE_SIZE_LABEL}`,
      }
    }

    return { valid: true }
  }

  /**
   * Upload an image file to the server
   */
  async function uploadImage(file: File, options: UploadOptions = {}): Promise<UploadResult> {
    // Reset state
    state.isUploading = true
    state.progress = 0
    state.error = null

    // Client-side validation
    const validation = validateFile(file)
    if (!validation.valid) {
      state.isUploading = false
      state.error = validation.error || 'Invalid file'
      return { success: false, error: state.error }
    }

    try {
      // Build form data
      const formData = new FormData()
      formData.append('file', file)
      if (options.alt) formData.append('alt', options.alt)
      if (options.title) formData.append('title', options.title)

      // Upload to API
      state.progress = 10 // Starting upload

      const response = await $fetch<ImageUploadResponse>('/api/images/upload', {
        method: 'POST',
        body: formData,
      })

      state.progress = 100

      if (response.success && response.data) {
        state.isUploading = false
        return { success: true, data: response.data }
      } else {
        state.error = response.error || 'Upload failed'
        state.isUploading = false
        return { success: false, error: state.error }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Upload failed'
      state.error = message
      state.isUploading = false
      return { success: false, error: message }
    }
  }

  /**
   * Create a File object from a DataTransfer (for paste/drop)
   */
  function getImageFromDataTransfer(dataTransfer: DataTransfer): File | null {
    const items = Array.from(dataTransfer.items)
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        return item.getAsFile()
      }
    }
    return null
  }

  /**
   * Get allowed file types for input accept attribute
   */
  function getAcceptAttribute(): string {
    return ALLOWED_MIME_TYPES.join(',')
  }

  return {
    state: readonly(state),
    validateFile,
    uploadImage,
    getImageFromDataTransfer,
    getAcceptAttribute,
    MAX_FILE_SIZE,
    MAX_FILE_SIZE_LABEL,
    ALLOWED_EXTENSIONS,
  }
}

