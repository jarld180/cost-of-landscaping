/**
 * Zod Validation Schemas for Page API
 *
 * Defines validation schemas for all page-related API requests.
 */

import { z } from 'zod'

// =====================================================
// COMMON SCHEMAS
// =====================================================

/**
 * Valid slug format: lowercase letters, numbers, hyphens
 * Must start and end with alphanumeric
 */
export const slugSchema = z.string()
  .min(1, 'Slug is required')
  .max(100, 'Slug must be 100 characters or less')
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers, and hyphens only')

/**
 * Template slug schema
 * Accepts any non-empty string (validated against database)
 */
export const templateSchema = z.string().min(1, 'Template is required')

/**
 * Valid page status
 */
export const statusSchema = z.enum(['draft', 'published', 'archived'])

/**
 * Valid meta robots directives
 */
export const metaRobotsSchema = z.array(
  z.enum(['index', 'noindex', 'follow', 'nofollow', 'noarchive', 'nosnippet', 'noimageindex', 'notranslate', 'none', 'all'])
).optional()

/**
 * Valid sitemap change frequency
 */
export const sitemapChangefreqSchema = z.enum(['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']).optional()

/**
 * Valid redirect types
 */
export const redirectTypeSchema = z.number().refine(
  (val) => [301, 302, 307, 308].includes(val),
  { message: 'Redirect type must be 301, 302, 307, or 308' }
).optional()

// =====================================================
// CREATE PAGE SCHEMA
// =====================================================

export const createPageSchema = z.object({
  // Required fields
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less'),

  content: z.string()
    .min(1, 'Content is required'),

  // Optional hierarchy
  parentId: z.string().uuid('Invalid parent ID').optional().nullable(),

  // Optional slug (auto-generated if not provided)
  slug: slugSchema.optional(),

  // Required template (must be explicitly specified)
  template: templateSchema,

  // Optional content fields
  description: z.string().max(500, 'Description must be 500 characters or less').optional().nullable(),

  // Optional SEO fields
  metaTitle: z.string().max(60, 'Meta title must be 60 characters or less').optional().nullable(),
  metaDescription: z.string().max(160, 'Meta description must be 160 characters or less').optional().nullable(),
  metaKeywords: z.array(z.string()).optional().nullable(),
  focusKeyword: z.string().max(100, 'Focus keyword must be 100 characters or less').optional().nullable(),

  // Open Graph fields
  ogTitle: z.string().max(60, 'OG title must be 60 characters or less').optional().nullable(),
  ogDescription: z.string().max(160, 'OG description must be 160 characters or less').optional().nullable(),
  ogImage: z.string().refine((val) => !val || z.string().url().safeParse(val).success, {
    message: 'Invalid OG image URL'
  }).optional().nullable(),
  ogType: z.string().optional().nullable(),

  // Twitter Card fields
  twitterCard: z.enum(['summary', 'summary_large_image', 'app', 'player']).optional().nullable(),
  twitterTitle: z.string().max(60, 'Twitter title must be 60 characters or less').optional().nullable(),
  twitterDescription: z.string().max(160, 'Twitter description must be 160 characters or less').optional().nullable(),
  twitterImage: z.string().refine((val) => !val || z.string().url().safeParse(val).success, {
    message: 'Invalid Twitter image URL'
  }).optional().nullable(),

  // Schema.org fields
  schemaType: z.string().optional().nullable(),

  // Advanced SEO fields
  metaRobots: metaRobotsSchema,
  sitemapPriority: z.number().min(0).max(1).optional().nullable(),
  sitemapChangefreq: sitemapChangefreqSchema,
  canonicalUrl: z.string().optional().nullable(),
  redirectUrl: z.string().refine((val) => !val || z.string().url().safeParse(val).success, {
    message: 'Invalid redirect URL'
  }).optional().nullable(),
  redirectType: redirectTypeSchema,

  // Optional metadata (JSONB)
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),

  // Optional status
  status: statusSchema.optional()
})

export type CreatePageInput = z.infer<typeof createPageSchema>

// =====================================================
// UPDATE PAGE SCHEMA
// =====================================================

export const updatePageSchema = z.object({
  // All fields are optional for updates
  title: z.string()
    .min(1, 'Title cannot be empty')
    .max(200, 'Title must be 200 characters or less')
    .optional(),

  content: z.string()
    .min(1, 'Content cannot be empty')
    .optional(),

  slug: slugSchema.optional(),
  template: templateSchema.optional(),
  description: z.string().max(500, 'Description must be 500 characters or less').optional().nullable(),

  // SEO fields
  metaTitle: z.string().max(60, 'Meta title must be 60 characters or less').optional().nullable(),
  metaDescription: z.string().max(160, 'Meta description must be 160 characters or less').optional().nullable(),
  metaKeywords: z.array(z.string()).optional().nullable(),
  focusKeyword: z.string().max(100, 'Focus keyword must be 100 characters or less').optional().nullable(),

  // Open Graph fields
  ogTitle: z.string().max(60, 'OG title must be 60 characters or less').optional().nullable(),
  ogDescription: z.string().max(160, 'OG description must be 160 characters or less').optional().nullable(),
  ogImage: z.string().refine((val) => !val || z.string().url().safeParse(val).success, {
    message: 'Invalid OG image URL'
  }).optional().nullable(),
  ogType: z.string().optional().nullable(),

  // Twitter Card fields
  twitterCard: z.enum(['summary', 'summary_large_image', 'app', 'player']).optional().nullable(),
  twitterTitle: z.string().max(60, 'Twitter title must be 60 characters or less').optional().nullable(),
  twitterDescription: z.string().max(160, 'Twitter description must be 160 characters or less').optional().nullable(),
  twitterImage: z.string().refine((val) => !val || z.string().url().safeParse(val).success, {
    message: 'Invalid Twitter image URL'
  }).optional().nullable(),

  // Schema.org fields
  schemaType: z.string().optional().nullable(),

  // Advanced SEO fields
  metaRobots: metaRobotsSchema,
  sitemapPriority: z.number().min(0).max(1).optional().nullable(),
  sitemapChangefreq: sitemapChangefreqSchema,
  canonicalUrl: z.string().optional().nullable(),
  redirectUrl: z.string().refine((val) => !val || z.string().url().safeParse(val).success, {
    message: 'Invalid redirect URL'
  }).optional().nullable(),
  redirectType: redirectTypeSchema,

  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  status: statusSchema.optional()
})

export type UpdatePageInput = z.infer<typeof updatePageSchema>

// =====================================================
// QUERY PARAMETER SCHEMAS
// =====================================================

/**
 * List pages query parameters
 */
export const listPagesQuerySchema = z.object({
  status: statusSchema.optional(),
  template: templateSchema.optional(),
  parentId: z.string().uuid('Invalid parent ID').optional(),
  depth: z.coerce.number().int().min(0).optional(),
  includeDeleted: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
  orderBy: z.enum(['created_at', 'updated_at', 'title', 'depth', 'full_path']).optional().default('created_at'),
  orderDirection: z.enum(['asc', 'desc']).optional().default('desc')
})

export type ListPagesQuery = z.infer<typeof listPagesQuerySchema>

/**
 * Get page by path query parameters
 */
export const getPageByPathQuerySchema = z.object({
  path: z.string().min(1, 'Path is required')
})

export type GetPageByPathQuery = z.infer<typeof getPageByPathQuerySchema>

/**
 * Get children query parameters
 */
export const getChildrenQuerySchema = z.object({
  includeDescendants: z.coerce.boolean().optional().default(false)
})

export type GetChildrenQuery = z.infer<typeof getChildrenQuerySchema>

