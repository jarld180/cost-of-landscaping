import { z } from 'zod'

/**
 * Zod schema for menu form validation
 */
export const menuFormSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(200, 'Name must be 200 characters or less'),

  slug: z.string()
    .min(1, 'Slug is required')
    .max(100, 'Slug must be 100 characters or less')
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers, and hyphens only'),

  description: z.string()
    .max(500, 'Description must be 500 characters or less')
    .optional()
    .nullable(),

  show_in_header: z.boolean(),

  show_in_footer: z.boolean(),

  is_enabled: z.boolean(),

  metadata: z.record(z.any()).optional().nullable()
}).refine(
  data => !(data.show_in_header && data.show_in_footer),
  {
    message: 'Menu can only be assigned to one location (Header or Footer)',
    path: ['show_in_header']
  }
)

/**
 * TypeScript type inferred from schema
 */
export type MenuFormData = z.infer<typeof menuFormSchema>

/**
 * Default values for new menu form
 */
export const menuFormDefaultValues: MenuFormData = {
  name: '',
  slug: '',
  description: null,
  show_in_header: false,
  show_in_footer: false,
  is_enabled: true,
  metadata: null
}

