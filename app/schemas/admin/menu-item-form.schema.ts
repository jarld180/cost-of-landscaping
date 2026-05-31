import { z } from 'zod'

/**
 * Link type enum
 * - dropdown: Label-only dropdown trigger (no link)
 * - page: Link to internal page (from pages table)
 * - internal: Link to internal route (e.g., /find, /login)
 * - custom: Link to custom/external URL
 */
export const linkTypeEnum = z.enum(['dropdown', 'page', 'internal', 'custom'])

/**
 * Zod schema for menu item form validation
 */
export const menuItemFormSchema = z.object({
  label: z.string()
    .min(1, 'Label is required')
    .max(200, 'Label must be 200 characters or less'),

  link_type: linkTypeEnum,

  page_id: z.string()
    .uuid('Invalid page ID')
    .nullable()
    .optional(),

  custom_url: z.string()
    .url('Invalid URL')
    .nullable()
    .optional(),

  internal_path: z.string()
    .nullable()
    .optional(),

  description: z.string()
    .max(500, 'Description must be 500 characters or less')
    .nullable()
    .optional(),

  parent_id: z.string()
    .uuid('Invalid parent ID')
    .nullable()
    .optional(),

  open_in_new_tab: z.boolean(),

  is_enabled: z.boolean(),

  display_order: z.number()
    .int()
    .min(0)
    .nullable()
    .optional(),

  metadata: z.record(z.any()).nullable().optional()
}).superRefine((data, ctx) => {
  if (data.link_type === 'dropdown') {
    if (data.page_id !== null || data.custom_url !== null || data.internal_path !== null || data.parent_id !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Dropdown items cannot have links or parents',
        path: ['link_type']
      })
    }
    return
  }
  
  if (data.link_type === 'page') {
    if (!data.page_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please select a page',
        path: ['page_id']
      })
    }
    return
  }
  
  if (data.link_type === 'internal') {
    if (!data.internal_path) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please select an internal route',
        path: ['internal_path']
      })
    } else if (!data.internal_path.startsWith('/')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Internal route must start with /',
        path: ['internal_path']
      })
    }
    return
  }
  
  if (data.link_type === 'custom') {
    if (!data.custom_url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please enter a URL',
        path: ['custom_url']
      })
    }
    return
  }
})

/**
 * TypeScript type inferred from schema
 */
export type MenuItemFormData = z.infer<typeof menuItemFormSchema>

/**
 * Default values for new menu item form
 */
export const menuItemFormDefaultValues: MenuItemFormData = {
  label: '',
  link_type: 'page',
  page_id: null,
  custom_url: null,
  internal_path: null,
  description: null,
  parent_id: null,
  open_in_new_tab: false,
  is_enabled: true,
  display_order: null,
  metadata: null
}

