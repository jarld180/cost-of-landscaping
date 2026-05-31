/**
 * Business Hours Schema
 *
 * A lenient schema that accepts multiple formats for business hours data
 * and normalizes them to a consistent object format.
 *
 * Accepted formats:
 * 1. Object format (preferred): { monday: { open: "8:00 AM", close: "5:00 PM" }, ... }
 * 2. Array format (legacy/LLM): [{ day: "Monday", hours: "8 AM to 5 PM" }, ...]
 * 3. null/undefined
 *
 * The schema will NEVER throw validation errors for business hours.
 * Invalid data is normalized to null rather than failing the entire enrichment.
 */

import { z } from 'zod'

// =====================================================
// TYPES
// =====================================================

export interface DayHours {
  open: string | null
  close: string | null
}

export interface BusinessHoursObject {
  monday: DayHours | null
  tuesday: DayHours | null
  wednesday: DayHours | null
  thursday: DayHours | null
  friday: DayHours | null
  saturday: DayHours | null
  sunday: DayHours | null
  [key: string]: DayHours | null  // Allow string indexing
}

export interface BusinessHoursArrayEntry {
  day: string
  hours: string
}

// =====================================================
// SCHEMAS
// =====================================================

/** Schema for a single day's hours in object format */
const dayHoursSchema = z.object({
  open: z.string().nullable(),
  close: z.string().nullable(),
}).nullable()

/** Preferred object format with days as keys */
const businessHoursObjectSchema = z.object({
  monday: dayHoursSchema.optional().default(null),
  tuesday: dayHoursSchema.optional().default(null),
  wednesday: dayHoursSchema.optional().default(null),
  thursday: dayHoursSchema.optional().default(null),
  friday: dayHoursSchema.optional().default(null),
  saturday: dayHoursSchema.optional().default(null),
  sunday: dayHoursSchema.optional().default(null),
})

/** Array format (legacy Google format / LLM variation) */
const businessHoursArrayEntrySchema = z.object({
  day: z.string(),
  hours: z.string(),
})

const businessHoursArraySchema = z.array(businessHoursArrayEntrySchema)

// =====================================================
// NORMALIZERS
// =====================================================

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

/**
 * Parse hours string like "8 AM to 5 PM" or "8:00 AM - 5:00 PM"
 * Returns { open, close } or null for closed/invalid
 */
function parseHoursString(hours: string): DayHours | null {
  if (!hours) return null

  const normalized = hours.trim().toLowerCase()

  // Check for closed indicators
  if (normalized === 'closed' || normalized === 'n/a' || normalized === 'by appointment') {
    return null
  }

  // Try to parse "X to Y" or "X - Y" format
  const match = hours.match(/(.+?)\s*(?:to|-)\s*(.+)/i)
  if (match) {
    return {
      open: match[1].trim(),
      close: match[2].trim(),
    }
  }

  // If we can't parse, store as open time with no close
  return { open: hours.trim(), close: null }
}

/**
 * Normalize array format to object format
 */
function normalizeArrayToObject(arr: BusinessHoursArrayEntry[]): BusinessHoursObject {
  const result: BusinessHoursObject = {
    monday: null,
    tuesday: null,
    wednesday: null,
    thursday: null,
    friday: null,
    saturday: null,
    sunday: null,
  }

  for (const entry of arr) {
    const dayKey = entry.day.toLowerCase().trim() as keyof BusinessHoursObject

    if (DAYS_OF_WEEK.includes(dayKey)) {
      result[dayKey] = parseHoursString(entry.hours)
    }
  }

  return result
}

/**
 * Attempt to normalize any input to BusinessHoursObject or null
 */
function normalizeBusinessHours(input: unknown): BusinessHoursObject | null {
  // Handle null/undefined
  if (input === null || input === undefined) {
    return null
  }

  // Handle array format
  if (Array.isArray(input)) {
    try {
      const parsed = businessHoursArraySchema.safeParse(input)
      if (parsed.success) {
        return normalizeArrayToObject(parsed.data)
      }
    } catch {
      // Fall through to return null
    }
    return null
  }

  // Handle object format
  if (typeof input === 'object') {
    try {
      const parsed = businessHoursObjectSchema.safeParse(input)
      if (parsed.success) {
        return parsed.data
      }
    } catch {
      // Fall through to return null
    }
    return null
  }

  return null
}

// =====================================================
// EXPORTED SCHEMA
// =====================================================

/**
 * Lenient business hours schema that accepts multiple formats.
 *
 * This schema will NEVER throw validation errors.
 * Invalid/unrecognized data is transformed to null.
 *
 * Usage in Zod schemas:
 *   business_hours: lenientBusinessHoursSchema
 */
export const lenientBusinessHoursSchema = z.any()
  .transform((input): BusinessHoursObject | null => normalizeBusinessHours(input))

/**
 * Strict business hours schema for cases where we need exact validation.
 * Use this for owner-submitted data, not LLM output.
 */
export const strictBusinessHoursSchema = businessHoursObjectSchema

/**
 * Type for the normalized business hours output
 */
export type BusinessHours = BusinessHoursObject | null
