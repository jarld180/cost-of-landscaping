/**
 * Contractor Form Schema
 *
 * Client-side Zod validation schema for contractor create/edit forms.
 */

import { z } from 'zod'

/**
 * Contractor status enum
 */
export const contractorStatusSchema = z.enum(['pending', 'active', 'suspended'])

export type ContractorStatus = z.infer<typeof contractorStatusSchema>

/**
 * Social links structure
 */
export const socialLinksSchema = z.object({
  facebook: z.string().url('Invalid Facebook URL').or(z.literal('')).nullable().optional(),
  instagram: z.string().url('Invalid Instagram URL').or(z.literal('')).nullable().optional(),
  youtube: z.string().url('Invalid YouTube URL').or(z.literal('')).nullable().optional(),
  linkedin: z.string().url('Invalid LinkedIn URL').or(z.literal('')).nullable().optional(),
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

/**
 * Contractor form schema
 * Note: Avoid using .default() as it causes issues with @vee-validate/zod and Zod 4
 */
export const contractorFormSchema = z.object({
  // Required
  companyName: z.string()
    .min(1, 'Company name is required')
    .max(200, 'Company name must be 200 characters or less'),

  // Optional - auto-generated from company name
  slug: z.string()
    .max(200, 'Slug must be 200 characters or less')
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers, and hyphens only')
    .or(z.literal(''))
    .optional(),

  // Location
  cityId: z.string().uuid('Invalid city').or(z.literal('')).nullable().optional(),
  streetAddress: z.string().max(300).or(z.literal('')).nullable().optional(),
  postalCode: z.string().max(20).or(z.literal('')).nullable().optional(),

  // Contact
  phone: z.string().max(50).or(z.literal('')).nullable().optional(),
  website: z.string().url('Invalid website URL').or(z.literal('')).nullable().optional(),
  email: z.string().email('Invalid email address').or(z.literal('')).nullable().optional(),

  // Business info
  description: z.string().nullable().optional(),
  rating: z.coerce.number().min(0).max(5).nullable().optional(),
  reviewCount: z.coerce.number().int().min(0).nullable().optional(),

  // Categories (array of service type slugs)
  categories: z.array(z.string()).optional(),

  // Social links
  socialLinks: socialLinksSchema,

  // Opening hours
  openingHours: openingHoursSchema,

  // Status
  status: contractorStatusSchema.optional(),

  // Verification tier (admin-only)
  verificationTier: z.enum(['trusted_partner', 'fully_verified', 'basic_verified', 'unverified']).optional(),

  // Google integration (read-only display)
  googlePlaceId: z.string().nullable().optional(),
  googleCid: z.string().nullable().optional(),
})

export type ContractorFormData = z.infer<typeof contractorFormSchema>

/**
 * Default values for new contractor form
 */
export const contractorFormDefaultValues: ContractorFormData = {
  companyName: '',
  slug: '',
  cityId: null,
  streetAddress: '',
  postalCode: '',
  phone: '',
  website: '',
  email: '',
  description: '',
  rating: null,
  reviewCount: null,
  categories: [],
  socialLinks: {
    facebook: '',
    instagram: '',
    youtube: '',
    linkedin: '',
  },
  openingHours: null,
  status: 'pending',
  verificationTier: 'unverified',
  googlePlaceId: null,
  googleCid: null,
}

