/**
 * Owner Contractor Form Schema
 *
 * Client-side Zod validation schema for owner contractor edit forms.
 * Simpler than admin schema - excludes status, slug, Google IDs, etc.
 */

import { z } from 'zod'

/**
 * Business hours for a single day
 */
export const dayHoursSchema = z.object({
  open: z.string(),
  close: z.string(),
}).nullable()

/**
 * Business hours object format (matches enrichment data)
 * { monday: { open: "9:00 AM", close: "5:00 PM" }, ... }
 */
export const businessHoursSchema = z.object({
  monday: dayHoursSchema.optional(),
  tuesday: dayHoursSchema.optional(),
  wednesday: dayHoursSchema.optional(),
  thursday: dayHoursSchema.optional(),
  friday: dayHoursSchema.optional(),
  saturday: dayHoursSchema.optional(),
  sunday: dayHoursSchema.optional(),
}).optional().nullable()

export type BusinessHours = z.infer<typeof businessHoursSchema>
export type DayHours = z.infer<typeof dayHoursSchema>

/**
 * Social links structure with all 6 platforms
 */
export const ownerSocialLinksSchema = z.object({
  facebook: z.string().url('Invalid Facebook URL').or(z.literal('')).nullable().optional(),
  instagram: z.string().url('Invalid Instagram URL').or(z.literal('')).nullable().optional(),
  youtube: z.string().url('Invalid YouTube URL').or(z.literal('')).nullable().optional(),
  linkedin: z.string().url('Invalid LinkedIn URL').or(z.literal('')).nullable().optional(),
  twitter: z.string().url('Invalid Twitter URL').or(z.literal('')).nullable().optional(),
  yelp: z.string().url('Invalid Yelp URL').or(z.literal('')).nullable().optional(),
}).optional().nullable()

export type OwnerSocialLinks = z.infer<typeof ownerSocialLinksSchema>

/**
 * Owner contractor form schema
 */
export const ownerContractorFormSchema = z.object({
  // Basic Info
  companyName: z.string()
    .min(1, 'Company name is required')
    .max(200, 'Company name must be 200 characters or less'),

  description: z.string().max(5000).nullable().optional(),

  // Contact
  phone: z.string().max(50).or(z.literal('')).nullable().optional(),
  email: z.string().email('Invalid email address').or(z.literal('')).nullable().optional(),
  website: z.string().url('Invalid website URL').or(z.literal('')).nullable().optional(),

  // Business hours (structured object format)
  businessHours: businessHoursSchema,

  // Service categories (array of service type IDs)
  serviceTypeIds: z.array(z.string().uuid()).optional(),

  // Social links
  socialLinks: ownerSocialLinksSchema,
})

export type OwnerContractorFormData = z.infer<typeof ownerContractorFormSchema>

/**
 * Default values for owner contractor form
 */
export const ownerContractorFormDefaults: OwnerContractorFormData = {
  companyName: '',
  description: '',
  phone: '',
  email: '',
  website: '',
  businessHours: null,
  serviceTypeIds: [],
  socialLinks: {
    facebook: '',
    instagram: '',
    youtube: '',
    linkedin: '',
    twitter: '',
    yelp: '',
  },
}

/**
 * Days of the week in order
 */
export const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

export type DayOfWeek = typeof DAYS_OF_WEEK[number]

/**
 * Day labels for display
 */
export const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
}

/**
 * Time options for dropdowns (5:00 AM - 11:00 PM, 30-min increments)
 */
export const TIME_OPTIONS: string[] = []
for (let hour = 5; hour <= 23; hour++) {
  for (const minute of [0, 30]) {
    const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const m = minute === 0 ? '00' : '30'
    TIME_OPTIONS.push(`${h}:${m} ${ampm}`)
  }
}

