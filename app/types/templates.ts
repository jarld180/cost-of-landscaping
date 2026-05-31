/**
 * Template Type Definitions
 *
 * Provides type safety for template slugs while allowing flexibility for custom templates.
 * Uses branded types to provide autocomplete for core templates while accepting any string.
 */

// =====================================================
// CORE TEMPLATE CONSTANTS
// =====================================================

/**
 * Core template slugs that ship with the system
 *
 * Active: article, default
 * Deprecated: hub, spoke, sub-spoke (disabled in DB, kept for type compatibility)
 */
export const CORE_TEMPLATES = ['article', 'default'] as const

/**
 * Legacy template slugs (deprecated but kept for backwards compatibility)
 */
export const LEGACY_TEMPLATES = ['hub', 'spoke', 'sub-spoke'] as const

/**
 * Type for core template slugs (with autocomplete)
 */
export type CoreTemplateSlug = typeof CORE_TEMPLATES[number]

/**
 * Type for any template slug (core or custom)
 * Provides autocomplete for core templates while accepting any string
 *
 * This uses a branded type pattern to allow both:
 * - Autocomplete for core templates
 * - Acceptance of any string for custom templates
 */
export type TemplateSlug = CoreTemplateSlug | (string & {})

// =====================================================
// TYPE GUARDS
// =====================================================

/**
 * Type guard to check if a slug is a core template
 *
 * @param slug - Template slug to check
 * @returns True if the slug is a core template
 *
 * @example
 * if (isCoreTemplate('hub')) {
 *   // TypeScript knows this is a CoreTemplateSlug
 * }
 */
export function isCoreTemplate(slug: string): slug is CoreTemplateSlug {
  return CORE_TEMPLATES.includes(slug as CoreTemplateSlug)
}

// =====================================================
// DATABASE TYPES
// =====================================================

/**
 * Page Template (matches database schema)
 *
 * Represents a template record from the page_templates table
 */
export interface PageTemplate {
  id: string
  slug: string
  name: string
  description: string | null
  component_name: string
  metadata_schema: Record<string, any>
  default_metadata: Record<string, any>
  color: string
  display_order: number
  is_enabled: boolean
  is_system: boolean
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
  deleted_at: string | null
}

/**
 * Simplified template data for API responses
 */
export interface TemplateData {
  slug: string
  name: string
  description: string | null
  componentName: string
  color: string
  displayOrder: number
}

/**
 * Template schema data for API responses
 */
export interface TemplateSchemaData {
  slug: string
  name: string
  description: string | null
  schema: Record<string, any>
  defaultMetadata: Record<string, any>
}

