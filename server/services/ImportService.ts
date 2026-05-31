/**
 * Import Service
 *
 * Orchestrates Apify JSON file import for contractor profiles.
 * Handles validation, city auto-creation, geocoding fallback, and upsert logic.
 *
 * Key constraints:
 * - Max 100 rows per import (synchronous processing)
 * - Images stored as URLs in pending_images (no download during import)
 * - Each row processed independently (failures don't rollback others)
 */

import { consola } from 'consola'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../app/types/supabase'
import { ContractorRepository } from '../repositories/ContractorRepository'
import { LookupRepository } from '../repositories/LookupRepository'
import { ReviewRepository } from '../repositories/ReviewRepository'
import { GeocodingService } from './GeocodingService'
import { stateToAbbreviation } from '../utils/stateAbbreviations'
import { processCompanyName, sanitizeWebsiteUrl } from '../utils/textSanitization'
import {
  apifyImportFileSchema,
  MAX_IMPORT_ROWS,
  MAX_IMAGES_PER_CONTRACTOR,
  type ApifyRow,
  type ImportSummary,
  type ImportError,
  type ProcessBatchResult,
} from '../schemas/import.schemas'
import type { ApifyReview } from '../schemas/review.schemas'

// Type alias for contractor from database
type Contractor = Database['public']['Tables']['contractors']['Row']

// Metadata structure for contractors
interface ContractorMetadata {
  categories?: string[]
  social_links?: Record<string, string | null>
  opening_hours?: Array<{ day: string; hours: string }>
  pending_images?: string[]
  images?: Array<{ url: string; alt?: string }>
  geocoding_failed?: boolean
}

interface ImportServiceConfig {
  geocodingApiKey: string
  imageAllowlist: string[]
}

export class ImportService {
  private contractorRepo: ContractorRepository
  private lookupRepo: LookupRepository
  private reviewRepo: ReviewRepository
  private geocodingService: GeocodingService
  private imageAllowlist: string[]

  constructor(
    client: SupabaseClient<Database>,
    config: ImportServiceConfig
  ) {
    this.contractorRepo = new ContractorRepository(client)
    this.lookupRepo = new LookupRepository(client)
    this.reviewRepo = new ReviewRepository(client)
    this.geocodingService = new GeocodingService(config.geocodingApiKey)
    this.imageAllowlist = config.imageAllowlist
  }

  /**
   * Process an Apify JSON import file (synchronous, max 100 rows)
   * Kept for backward compatibility with existing API
   */
  async processImport(jsonData: unknown): Promise<ImportSummary> {
    // Validate JSON structure
    const parseResult = apifyImportFileSchema.safeParse(jsonData)
    if (!parseResult.success) {
      throw new Error(`Invalid JSON structure: ${parseResult.error.message}`)
    }

    const rows = parseResult.data

    // Validate row count
    if (rows.length > MAX_IMPORT_ROWS) {
      throw new Error(`File exceeds ${MAX_IMPORT_ROWS} row limit (received ${rows.length} rows)`)
    }

    consola.info(`Starting import of ${rows.length} rows...`)

    // Use processRows for actual processing
    const result = await this.processRows(rows, 0)

    const summary: ImportSummary = {
      total: rows.length,
      imported: result.imported,
      updated: result.updated,
      skipped: result.skipped,
      skippedClaimed: result.skippedClaimed,
      skippedDuplicate: result.skippedDuplicate,
      pendingImageCount: result.pendingImageCount,
      reviewsImported: result.reviewsImported,
      errors: result.errors,
    }

    const reviewNote = summary.reviewsImported > 0 ? `, ${summary.reviewsImported} reviews` : ''
    const duplicateNote = summary.skippedDuplicate > 0 ? `, ${summary.skippedDuplicate} duplicates` : ''
    consola.success(`Import complete: ${summary.imported} new, ${summary.updated} updated, ${summary.skipped} skipped, ${summary.skippedClaimed} claimed${duplicateNote}${reviewNote}, ${summary.errors.length} errors`)
    return summary
  }

  /**
   * Process a batch of rows (for async batch processing)
   * Stateless - can be called with any slice of rows
   *
   * @param rows - Array of Apify rows to process
   * @param startIndex - Starting row index (for error reporting)
   * @returns Batch processing result with counts and errors
   */
  async processRows(rows: ApifyRow[], startIndex: number = 0): Promise<ProcessBatchResult> {
    const result: ProcessBatchResult = {
      processed: 0,
      imported: 0,
      updated: 0,
      skipped: 0,
      skippedClaimed: 0,
      skippedDuplicate: 0,
      pendingImageCount: 0,
      reviewsImported: 0,
      errors: [],
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNumber = startIndex + i + 1

      try {
        consola.debug(`Processing row ${rowNumber}: ${row.title || 'No title'} (placeId: ${row.placeId || 'none'})`)
        const rowResult = await this.processRow(row, rowNumber, result)
        result.processed++
        if (rowResult.isNew) {
          result.imported++
        } else if (rowResult.isUpdated) {
          result.updated++
        }
        result.pendingImageCount += rowResult.pendingImageCount
        result.reviewsImported += rowResult.reviewsImported
      } catch (error: unknown) {
        result.processed++
        const message = this.extractErrorMessage(error)
        result.errors.push({
          row: rowNumber,
          placeId: row.placeId || null,
          message,
        })
        consola.error(`Import row ${rowNumber} failed for "${row.title || 'unknown'}":`, message)
        consola.debug('Full error object:', error)
      }
    }

    return result
  }

  /**
   * Check if incoming data has meaningful changes compared to existing record
   * Only compares fields that would actually be updated (not metadata, not auto-generated fields)
   */
  private hasChanges(
    existing: Contractor,
    incoming: ReturnType<typeof this.buildContractorData> extends Promise<infer T> ? T : never
  ): boolean {
    // Fields to compare (exclude metadata, id, timestamps, etc)
    const fieldsToCompare = [
      'company_name',
      'description',
      'street_address',
      'postal_code',
      'lat',
      'lng',
      'phone',
      'website',
      'email',
      'rating',
      'review_count',
    ] as const

    for (const field of fieldsToCompare) {
      const existingValue = existing[field]
      const incomingValue = incoming[field as keyof typeof incoming]

      // Normalize nulls/undefined/empty strings for comparison
      const normalizedExisting = existingValue === '' ? null : existingValue ?? null
      const normalizedIncoming = incomingValue === '' ? null : incomingValue ?? null

      if (normalizedExisting !== normalizedIncoming) {
        if (import.meta.dev) {
          consola.debug(`Change detected in ${field}: "${normalizedExisting}" → "${normalizedIncoming}"`)
        }
        return true
      }
    }

    return false
  }

  /**
   * Extract error message from various error types
   */
  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message
    }
    if (typeof error === 'object' && error !== null) {
      const errObj = error as Record<string, unknown>
      if (errObj.message) return String(errObj.message)
      if (errObj.details) return String(errObj.details)
      if (errObj.hint) return String(errObj.hint)
      if (errObj.code) return `Database error code: ${errObj.code}`
      return JSON.stringify(error)
    }
    if (typeof error === 'string') return error
    return 'Unknown error'
  }

  /**
   * Process a single row from the import file
   * Uses a counter object to track skipped counts
   *
   * Smart merge behavior:
   * - Preserves existing metadata.images (enriched images)
   * - Preserves images_processed flag
   * - Only queues pending_images for unprocessed contractors
   * - Imports reviews even for claimed contractors
   */
  private async processRow(
    row: ApifyRow,
    rowNumber: number,
    counters: { skipped: number; skippedClaimed: number; skippedDuplicate: number }
  ): Promise<{ isNew: boolean; isUpdated: boolean; pendingImageCount: number; reviewsImported: number }> {
    // Skip permanently closed businesses
    if (row.permanentlyClosed) {
      counters.skipped++
      if (import.meta.dev) {
        consola.info(`Row ${rowNumber}: Skipped (permanently closed)`)
      }
      return { isNew: false, isUpdated: false, pendingImageCount: 0, reviewsImported: 0 }
    }

    // Check if contractor already exists by Google Place ID
    const existing = await this.contractorRepo.findByGooglePlaceId(row.placeId)

    // For claimed contractors: skip DATA updates but still import reviews
    if (existing?.is_claimed) {
      counters.skippedClaimed++

      // Still process reviews for claimed contractors (reviews are Google data, not owner-editable)
      let reviewsImported = 0
      if (row.reviews?.length) {
        reviewsImported = await this.processReviews(existing.id, row.reviews)
        if (reviewsImported > 0 && import.meta.dev) {
          consola.info(`Row ${rowNumber}: Imported ${reviewsImported} reviews for claimed contractor "${row.title}"`)
        }
      }

      if (import.meta.dev) {
        consola.info(`Row ${rowNumber}: Skipped data update for "${row.title}" (claimed by owner)`)
      }
      return { isNew: false, isUpdated: false, pendingImageCount: 0, reviewsImported }
    }

    // --- NAME-BASED COLLISION DETECTION (for new records only) ---
    // If no existing record by google_place_id, check for name collisions
    if (!existing) {
      const sanitizedName = processCompanyName(row.title)
      const collisions = await this.contractorRepo.findByCompanyNameCaseInsensitive(sanitizedName)

      if (collisions.length > 0) {
        const incomingAddress = row.street?.trim() || null

        // Case A: Incoming has no address → SKIP
        if (!incomingAddress) {
          counters.skippedDuplicate++
          if (import.meta.dev) {
            consola.info(`Row ${rowNumber}: Skipped duplicate "${sanitizedName}" (no address to differentiate)`)
          }
          return { isNew: false, isUpdated: false, pendingImageCount: 0, reviewsImported: 0 }
        }

        // Case B: Check if any existing record has the same address
        const sameAddressExists = collisions.some(c =>
          c.street_address?.toLowerCase().trim() === incomingAddress.toLowerCase()
        )

        if (sameAddressExists) {
          counters.skippedDuplicate++
          if (import.meta.dev) {
            consola.info(`Row ${rowNumber}: Skipped duplicate "${sanitizedName}" at "${incomingAddress}" (same address exists)`)
          }
          return { isNew: false, isUpdated: false, pendingImageCount: 0, reviewsImported: 0 }
        }

        // Case C: Different address → Allow insert (slug will be made unique by repository)
        if (import.meta.dev) {
          consola.info(`Row ${rowNumber}: Allowing "${sanitizedName}" at "${incomingAddress}" (different location from ${collisions.length} existing)`)
        }
      }
    }

    const isNew = !existing

    // Resolve city - skip geocoding if existing contractor already has a city or geocoding already failed
    let cityId: string | null = null
    if (existing?.city_id) {
      // Reuse existing city assignment (avoids unnecessary geocoding API calls)
      cityId = existing.city_id
    } else if ((existing?.metadata as ContractorMetadata)?.geocoding_failed) {
      // Already tried geocoding and failed - don't retry on re-upload
      cityId = null
    } else {
      // Only geocode for new contractors or those that haven't been geocoded yet
      cityId = await this.resolveCity(row)
    }

    // Build contractor data with smart merge (preserves existing enriched data)
    const contractorData = await this.buildContractorData(row, cityId, existing)

    // --- SKIP if existing record and no meaningful changes ---
    if (existing && !this.hasChanges(existing, contractorData)) {
      // Still process reviews even if contractor data unchanged
      let reviewsImported = 0
      if (row.reviews?.length) {
        reviewsImported = await this.processReviews(existing.id, row.reviews)
      }
      if (import.meta.dev) {
        const reviewNote = reviewsImported > 0 ? ` (but imported ${reviewsImported} reviews)` : ''
        consola.info(`Row ${rowNumber}: Skipped "${row.title}" (no changes)${reviewNote}`)
      }
      counters.skipped++
      return { isNew: false, isUpdated: false, pendingImageCount: 0, reviewsImported }
    }

    // Upsert contractor
    const contractor = await this.contractorRepo.upsertByGooglePlaceId(contractorData)

    const pendingImageCount = (contractorData.metadata as ContractorMetadata)?.pending_images?.length || 0

    // Process reviews if present in the import data
    let reviewsImported = 0
    if (row.reviews?.length) {
      reviewsImported = await this.processReviews(contractor.id, row.reviews)
    }

    if (import.meta.dev) {
      const reviewNote = reviewsImported > 0 ? `, ${reviewsImported} reviews` : ''
      consola.success(`Row ${rowNumber}: ${isNew ? 'Created' : 'Updated'} contractor "${row.title}"${reviewNote}`)
    }

    return { isNew, isUpdated: !isNew, pendingImageCount, reviewsImported }
  }

  /**
   * Process reviews for a contractor
   * Uses bulkUpsert which handles deduplication via google_review_id
   */
  private async processReviews(contractorId: string, reviews: ApifyReview[]): Promise<number> {
    if (!reviews.length) return 0

    try {
      return await this.reviewRepo.bulkUpsert(contractorId, reviews)
    } catch (error) {
      consola.error(`Failed to import reviews for contractor ${contractorId}:`, error)
      // Don't fail the entire row import for review errors
      return 0
    }
  }

  /**
   * Resolve or create city from row data
   */
  private async resolveCity(row: ApifyRow): Promise<string | null> {
    let cityName = row.city?.trim() || null
    let stateCode = stateToAbbreviation(row.state)

    // If missing city or state, try reverse geocoding
    if ((!cityName || !stateCode) && row.location?.lat && row.location?.lng) {
      const geoResult = await this.geocodingService.reverseGeocode(
        row.location.lat,
        row.location.lng
      )

      if (geoResult.success) {
        cityName = cityName || geoResult.city
        stateCode = stateCode || geoResult.stateCode
      }
    }

    // If still missing city or state, return null (geocoding failed will be flagged in metadata)
    if (!cityName || !stateCode) {
      return null
    }

    // Generate city slug
    const citySlug = this.slugify(cityName)

    // Find or create city
    const city = await this.lookupRepo.cities.findOrCreate({
      name: cityName,
      slug: citySlug,
      state_code: stateCode,
      lat: row.location?.lat ?? null,
      lng: row.location?.lng ?? null,
    })

    return city.id
  }

  /**
   * Build contractor data from Apify row
   *
   * Smart merge behavior when existing contractor is provided:
   * - Preserves metadata.images (enriched images from image processing)
   * - Preserves images_processed flag
   * - Only sets pending_images if images haven't been processed yet
   * - Never overwrites existing good data with empty/null values (protected fields)
   *
   * @param row - Apify row data
   * @param cityId - Resolved city ID
   * @param existing - Optional existing contractor for smart merge
   */
  private async buildContractorData(
    row: ApifyRow,
    cityId: string | null,
    existing?: Contractor | null
  ) {
    // Sanitize company name: remove punctuation, normalize case
    const companyName = processCompanyName(row.title)

    // CRITICAL: For updates, preserve existing slug to avoid constraint violations
    // Only generate new slug for new records
    const slug = existing?.slug ?? this.slugify(companyName)

    // --- SMART MERGE: Protected field helper ---
    // If existing has value and incoming is empty, keep existing
    const mergeField = <T>(incoming: T | null | undefined, existingValue: T | null | undefined): T | null => {
      const incomingEmpty = incoming === null || incoming === undefined || incoming === ''
      const existingHasValue = existingValue !== null && existingValue !== undefined && existingValue !== ''
      if (incomingEmpty && existingHasValue) {
        return existingValue as T
      }
      return (incoming ?? null) as T | null
    }

    // Extract categories
    const categories: string[] = []
    if (row.categoryName) categories.push(row.categoryName)
    if (row.categories) {
      for (const cat of row.categories) {
        if (!categories.includes(cat)) categories.push(cat)
      }
    }

    // Extract social links
    const socialLinks: Record<string, string | null> = {
      facebook: row.facebooks?.[0] || null,
      instagram: row.instagrams?.[0] || null,
      linkedin: row.linkedIns?.[0] || null,
      youtube: row.youtubes?.[0] || null,
    }

    // Extract opening hours
    const openingHours = row.openingHours?.map(h => ({
      day: h.day,
      hours: h.hours,
    })) || []

    // --- SMART MERGE LOGIC ---
    // Extract existing metadata to preserve enriched data
    const existingMetadata = (existing?.metadata as ContractorMetadata) || {}

    // Check if images were already processed
    const wasImagesProcessed = existing?.images_processed ?? false

    // Filter and limit image URLs from new import
    const rawImageUrls = this.extractImageUrls(row)

    // Only set pending_images if images haven't been processed yet
    // This prevents re-queuing images that have already been downloaded
    const pendingImages = wasImagesProcessed
      ? [] // Already processed, don't re-queue
      : this.filterImageUrls(rawImageUrls)

    // Build metadata - PRESERVE existing enriched images
    const metadata: ContractorMetadata = {
      categories,
      social_links: socialLinks,
      opening_hours: openingHours,
      pending_images: pendingImages,
      // CRITICAL: Preserve existing enriched images instead of resetting to []
      images: existingMetadata.images || [],
      geocoding_failed: cityId === null && !!(row.location?.lat && row.location?.lng),
    }

    // --- SMART MERGE: Apply to protected fields ---
    // These fields preserve existing values if incoming is empty
    const incomingWebsite = row.website ? sanitizeWebsiteUrl(row.website) : null

    const result = {
      google_place_id: row.placeId,
      google_cid: row.cid || null,
      company_name: companyName,
      slug,
      // Protected fields - preserve existing if incoming is empty
      description: mergeField(row.description, existing?.description),
      city_id: cityId ?? existing?.city_id ?? null, // Special: cityId already resolved, preserve if null
      street_address: mergeField(row.street, existing?.street_address),
      postal_code: mergeField(row.postalCode, existing?.postal_code),
      lat: mergeField(row.location?.lat, existing?.lat),
      lng: mergeField(row.location?.lng, existing?.lng),
      phone: mergeField(row.phone, existing?.phone),
      website: mergeField(incomingWebsite, existing?.website),
      email: mergeField(row.emails?.[0], existing?.email),
      // Non-protected fields - always use incoming
      rating: row.totalScore ?? null,
      review_count: row.reviewsCount ?? 0,
      // CRITICAL: Preserve existing status - NEVER reset active contractors to pending
      status: existing?.status ?? ('pending' as const),
      // CRITICAL: Preserve images_processed flag instead of resetting to false
      images_processed: wasImagesProcessed,
      metadata,
    }

    // Log protected field preservation in dev mode
    if (import.meta.dev && existing) {
      const preserved: string[] = []
      if (!row.street && existing.street_address) preserved.push('street_address')
      if (!row.phone && existing.phone) preserved.push('phone')
      if (!row.website && existing.website) preserved.push('website')
      if (!row.emails?.[0] && existing.email) preserved.push('email')
      if (!row.description && existing.description) preserved.push('description')
      if (preserved.length > 0) {
        consola.debug(`Smart merge preserved fields for "${companyName}": ${preserved.join(', ')}`)
      }
    }

    return result
  }

  /**
   * Extract image URLs from Apify row (handles multiple formats)
   */
  private extractImageUrls(row: ApifyRow): string[] {
    const urls: string[] = []

    // Prefer imageUrls (simple string array)
    if (row.imageUrls && Array.isArray(row.imageUrls)) {
      urls.push(...row.imageUrls)
    }

    // Also check images (can be strings or objects with imageUrl)
    if (row.images && Array.isArray(row.images)) {
      for (const img of row.images) {
        if (typeof img === 'string') {
          urls.push(img)
        } else if (img && typeof img === 'object' && 'imageUrl' in img && typeof img.imageUrl === 'string') {
          urls.push(img.imageUrl)
        }
      }
    }

    // Deduplicate
    return [...new Set(urls)]
  }

  /**
   * Filter image URLs against allowlist and limit count
   */
  private filterImageUrls(urls: string[]): string[] {
    return urls
      .filter(url => {
        try {
          const urlObj = new URL(url)
          return this.imageAllowlist.some(domain => urlObj.hostname === domain)
        } catch {
          return false
        }
      })
      .slice(0, MAX_IMAGES_PER_CONTRACTOR)
  }

  /**
   * Convert string to URL-safe slug
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, '') // Trim hyphens from ends
  }
}

