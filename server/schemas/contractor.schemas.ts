/**
 * Zod Validation Schemas for Contractor API
 *
 * Defines validation schemas for contractor CRUD operations.
 */

import { z } from 'zod'

// =====================================================
// COMMON SCHEMAS
// =====================================================

/**
 * String-to-boolean schema that properly handles "false" string values
 * z.coerce.boolean() uses Boolean() which converts "false" string to true
 * This schema correctly parses "true"/"false" strings and boolean values
 */
const stringBooleanSchema = z
  .union([z.boolean(), z.string()])
  .transform((val) => {
    if (typeof val === 'boolean') return val
    return val.toLowerCase() === 'true'
  })

/**
 * Contractor status enum
 */
export const contractorStatusSchema = z.enum(['pending', 'active', 'suspended'])

export type ContractorStatus = z.infer<typeof contractorStatusSchema>

/**
 * Social links structure
 * Allows empty strings (from form inputs) or valid URLs
 */
export const socialLinksSchema = z.object({
  facebook: z.string().url().or(z.literal('')).nullable().optional(),
  instagram: z.string().url().or(z.literal('')).nullable().optional(),
  youtube: z.string().url().or(z.literal('')).nullable().optional(),
  linkedin: z.string().url().or(z.literal('')).nullable().optional(),
}).optional().nullable()

export type SocialLinks = z.infer<typeof socialLinksSchema>

/**
 * Opening hours entry
 */
export const openingHoursEntrySchema = z.object({
  day: z.string(),
  hours: z.string(),
})

export const openingHoursSchema = z.array(openingHoursEntrySchema).optional().nullable()

// =====================================================
// CREATE CONTRACTOR SCHEMA
// =====================================================

export const createContractorSchema = z.object({
  // Required fields
  companyName: z.string()
    .min(1, 'Company name is required')
    .max(200, 'Company name must be 200 characters or less'),

  // Optional - will be auto-generated from company name if not provided
  slug: z.string()
    .max(200, 'Slug must be 200 characters or less')
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers, and hyphens only')
    .optional(),

  // Location (city is required for proper URL structure)
  cityId: z.string().uuid('Invalid city ID').nullable().optional(),
  streetAddress: z.string().max(300).nullable().optional(),
  postalCode: z.string().max(20).nullable().optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),

  // Contact info (allow empty strings from form inputs)
  phone: z.string().max(50).or(z.literal('')).nullable().optional(),
  website: z.string().url('Invalid website URL').or(z.literal('')).nullable().optional(),
  email: z.string().email('Invalid email address').or(z.literal('')).nullable().optional(),

  // Business info
  description: z.string().nullable().optional(),
  rating: z.number().min(0).max(5).nullable().optional(),
  reviewCount: z.number().int().min(0).nullable().optional(),

  // Categories (stored in metadata.categories[])
  categories: z.array(z.string()).optional(),

  // Social links
  socialLinks: socialLinksSchema,

  // Opening hours
  openingHours: openingHoursSchema,

  // Status (defaults to 'pending' for manual entries)
  status: contractorStatusSchema.optional().default('pending'),

  // Google integration (optional for manual entries)
  googlePlaceId: z.string().max(200).nullable().optional(),
  googleCid: z.string().max(50).nullable().optional(),
})

export type CreateContractorInput = z.infer<typeof createContractorSchema>

// =====================================================
// UPDATE CONTRACTOR SCHEMA
// =====================================================

/**
 * Metadata schema for direct updates (images, primary_image, etc.)
 * Uses a flexible record type to allow any metadata structure
 */
export const contractorMetadataSchema = z.record(z.string(), z.unknown())

export type ContractorMetadataInput = z.infer<typeof contractorMetadataSchema>

export const updateContractorSchema = z.object({
  // All fields optional for updates
  companyName: z.string()
    .min(1, 'Company name cannot be empty')
    .max(200, 'Company name must be 200 characters or less')
    .optional(),

  slug: z.string()
    .max(200, 'Slug must be 200 characters or less')
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers, and hyphens only')
    .optional(),

  // Location
  cityId: z.string().uuid('Invalid city ID').nullable().optional(),
  streetAddress: z.string().max(300).nullable().optional(),
  postalCode: z.string().max(20).nullable().optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),

  // Contact info (allow empty strings from form inputs)
  phone: z.string().max(50).or(z.literal('')).nullable().optional(),
  website: z.string().url('Invalid website URL').or(z.literal('')).nullable().optional(),
  email: z.string().email('Invalid email address').or(z.literal('')).nullable().optional(),

  // Business info
  description: z.string().nullable().optional(),
  rating: z.number().min(0).max(5).nullable().optional(),
  reviewCount: z.number().int().min(0).nullable().optional(),

  // Categories (legacy field - prefer using metadata.categories)
  categories: z.array(z.string()).optional(),

  // Social links (legacy field - prefer using metadata.social_links)
  socialLinks: socialLinksSchema,

  // Opening hours (legacy field - prefer using metadata.opening_hours)
  openingHours: openingHoursSchema,

  // Verification tier (admin-only — sets trusted_partner, fully_verified, etc.)
  verificationTier: z.enum(['trusted_partner', 'fully_verified', 'basic_verified', 'unverified']).optional(),

  // Direct metadata update (for images, primary_image, etc.)
  metadata: contractorMetadataSchema.optional(),

  // Status
  status: contractorStatusSchema.optional(),
})

export type UpdateContractorInput = z.infer<typeof updateContractorSchema>

// =====================================================
// QUERY PARAMETER SCHEMAS
// =====================================================

/**
 * Enrichment status values for filtering
 */
export const enrichmentStatusSchema = z.enum(['not_started', 'completed', 'failed', 'not_applicable'])
export type EnrichmentStatus = z.infer<typeof enrichmentStatusSchema>

/**
 * Review enrichment status values for filtering
 */
export const reviewEnrichmentStatusSchema = z.enum(['success', 'failed', 'not_started'])
export type ReviewEnrichmentStatus = z.infer<typeof reviewEnrichmentStatusSchema>

/**
 * List contractors query parameters
 */
export const listContractorsQuerySchema = z.object({
  cityId: z.string().uuid('Invalid city ID').optional(),
  category: z.string().optional(),
  status: contractorStatusSchema.optional(),
  search: z.string().optional(),
  imagesProcessed: stringBooleanSchema.optional(),
  enrichmentStatus: enrichmentStatusSchema.optional(),
  hasWebsite: stringBooleanSchema.optional(),
  // Review enrichment filters
  hasReviews: stringBooleanSchema.optional(),
  hasGoogleCid: stringBooleanSchema.optional(),
  reviewEnrichmentStatus: reviewEnrichmentStatusSchema.optional(),
  includeDeleted: stringBooleanSchema.optional().default(false),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
  orderBy: z.enum(['company_name', 'rating', 'review_count', 'created_at', 'updated_at']).optional().default('company_name'),
  orderDirection: z.enum(['asc', 'desc']).optional().default('asc'),
})

export type ListContractorsQuery = z.infer<typeof listContractorsQuerySchema>

// =====================================================
// BULK OPERATIONS SCHEMAS
// =====================================================

/**
 * Shared filter schema for "all matching" mode in bulk operations
 * NOTE: All fields are optional() not nullable() - client must omit null values
 */
export const bulkContractorFiltersSchema = z.object({
  cityId: z.string().uuid().optional(),
  category: z.string().optional(),
  status: contractorStatusSchema.optional(),
  search: z.string().optional(),
})

export type BulkContractorFilters = z.infer<typeof bulkContractorFiltersSchema>

/**
 * Bulk update: supports IDs mode OR filters mode (mutually exclusive)
 */
export const bulkUpdateContractorSchema = z.object({
   // Mode A: Specific IDs
   ids: z.array(z.string().uuid()).min(1).max(100).optional(),
  // Mode B: Filter criteria (for "select all matching")
  filters: bulkContractorFiltersSchema.optional(),
  // Target status (required)
  status: contractorStatusSchema,
}).refine(
  data => (data.ids && !data.filters) || (!data.ids && data.filters),
  { message: 'Provide either ids or filters, not both' }
)

export type BulkUpdateContractorInput = z.infer<typeof bulkUpdateContractorSchema>

/**
 * Bulk delete: same pattern as bulk update
 */
export const bulkDeleteContractorSchema = z.object({
   ids: z.array(z.string().uuid()).min(1).max(100).optional(),
  filters: bulkContractorFiltersSchema.optional(),
}).refine(
  data => (data.ids && !data.filters) || (!data.ids && data.filters),
  { message: 'Provide either ids or filters, not both' }
)

export type BulkDeleteContractorInput = z.infer<typeof bulkDeleteContractorSchema>

/**
 * Count endpoint schema - validates filter parameters
 */
export const countContractorQuerySchema = bulkContractorFiltersSchema.extend({})

export type CountContractorQuery = z.infer<typeof countContractorQuerySchema>

/**
 * Export endpoint schema
 * NOTE: If `ids` is provided, all filter params are IGNORED (ids takes precedence)
 */
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const exportContractorQuerySchema = z.object({
  // Mode A: Export specific IDs (comma-separated query string)
  // When present, filter params below are IGNORED
  ids: z.preprocess(
    (val) => typeof val === 'string' ? val.split(',').filter(Boolean) : undefined,
    z.array(z.string().regex(uuidRegex, 'Invalid UUID format'))
      .max(500, 'Maximum 500 IDs per export')
      .optional()
  ),
  // Mode B: Export by filters (only used when `ids` is NOT provided)
  cityId: z.string().uuid().optional(),
  category: z.string().optional(),
  status: contractorStatusSchema.optional(),
  search: z.string().optional(),
  // Limit for filter mode (up to 10,000) - ignored when ids provided
  limit: z.coerce.number().int().min(1).max(10000).optional().default(10000),
})

export type ExportContractorQuery = z.infer<typeof exportContractorQuerySchema>

