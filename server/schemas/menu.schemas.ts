/**
 * Zod Validation Schemas for Menu API
 *
 * Defines validation schemas for all menu-related API requests.
 */

import { z } from 'zod'

// =====================================================
// MENU SCHEMAS
// =====================================================

// Slug validation (lowercase, alphanumeric, hyphens only)
const slugSchema = z.string()
  .min(1, 'Slug is required')
  .max(100, 'Slug must be 100 characters or less')
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens only')

// Create menu schema
export const createMenuSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(200, 'Name must be 200 characters or less'),

  slug: slugSchema,

  description: z.string()
    .max(500, 'Description must be 500 characters or less')
    .optional()
    .nullable(),

  show_in_header: z.boolean().default(false),
  show_in_footer: z.boolean().default(false),

  is_enabled: z.boolean().default(true),

  display_order: z.number().int().min(0).default(0),

  metadata: z.record(z.string(), z.any()).optional().nullable()
}).refine(
  data => !(data.show_in_header && data.show_in_footer),
  {
    message: 'Menu can only be assigned to one location (Header or Footer)',
    path: ['show_in_header']
  }
)

// Update menu schema (all fields optional except what's being updated)
export const updateMenuSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(200, 'Name must be 200 characters or less')
    .optional(),

  slug: slugSchema.optional(),

  description: z.string()
    .max(500, 'Description must be 500 characters or less')
    .optional()
    .nullable(),

  show_in_header: z.boolean().optional(),
  show_in_footer: z.boolean().optional(),

  is_enabled: z.boolean().optional(),

  display_order: z.number().int().min(0).optional(),

  metadata: z.record(z.string(), z.any()).optional().nullable()
})

// =====================================================
// MENU ITEM SCHEMAS
// =====================================================

// Link type enum
// - dropdown: Label-only dropdown trigger (no link)
// - page: Link to internal page (from pages table)
// - internal: Link to internal route (e.g., /find, /login)
// - custom: Link to custom/external URL
export const linkTypeSchema = z.enum(['dropdown', 'page', 'internal', 'custom'])

// Create menu item schema
export const createMenuItemSchema = z.object({
  menu_id: z.string().uuid('Invalid menu ID'),

  parent_id: z.string().uuid('Invalid parent ID').optional().nullable(),

  link_type: linkTypeSchema,

  page_id: z.string().uuid('Invalid page ID').optional().nullable(),

  custom_url: z.string().url('Invalid URL').optional().nullable(),

  internal_path: z.string()
    .regex(/^\//, 'Internal path must start with /')
    .optional()
    .nullable(),

  label: z.string()
    .min(1, 'Label is required')
    .max(200, 'Label must be 200 characters or less'),

  description: z.string()
    .max(500, 'Description must be 500 characters or less')
    .optional()
    .nullable(),

  open_in_new_tab: z.boolean().default(false),

  is_enabled: z.boolean().default(true),

  display_order: z.number().int().min(0).nullable().optional(),

  metadata: z.record(z.string(), z.any()).optional().nullable()
}).refine(
  data => {
    if (data.link_type === 'dropdown') {
      return data.page_id == null && data.custom_url == null && data.internal_path == null && data.parent_id == null
    }
    if (data.link_type === 'page') {
      return data.page_id != null && data.custom_url == null && data.internal_path == null
    }
    if (data.link_type === 'internal') {
      return data.internal_path != null && data.page_id == null && data.custom_url == null
    }
    if (data.link_type === 'custom') {
      return data.custom_url != null && data.page_id == null && data.internal_path == null
    }
    return false
  },
  { message: 'Invalid link configuration for the selected link type' }
)

// Update menu item schema
export const updateMenuItemSchema = z.object({
  parent_id: z.string().uuid('Invalid parent ID').optional().nullable(),

  link_type: linkTypeSchema.optional(),

  page_id: z.string().uuid('Invalid page ID').optional().nullable(),

  custom_url: z.string().url('Invalid URL').optional().nullable(),

  internal_path: z.string()
    .regex(/^\//, 'Internal path must start with /')
    .optional()
    .nullable(),

  label: z.string()
    .min(1, 'Label is required')
    .max(200, 'Label must be 200 characters or less')
    .optional(),

  description: z.string()
    .max(500, 'Description must be 500 characters or less')
    .optional()
    .nullable(),

  open_in_new_tab: z.boolean().optional(),

  is_enabled: z.boolean().optional(),

  display_order: z.number().int().min(0).optional(),

  metadata: z.record(z.string(), z.any()).optional().nullable()
})

// Reorder menu items schema
export const reorderMenuItemsSchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid('Invalid item ID'),
    display_order: z.number().int().min(0)
  })).min(1, 'At least one item is required')
})

