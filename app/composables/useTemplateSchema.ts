/**
 * Template Schema Composable
 *
 * Provides utilities for working with template metadata schemas
 * and generating dynamic form fields based on JSON Schema.
 */

import { consola } from 'consola'
import type { TemplateSlug, TemplateSchemaData } from '~/types/templates'

export interface TemplateSchemaResponse {
  success: boolean
  data: TemplateSchemaData
}

export interface FormField {
  name: string
  label: string
  type: 'text' | 'number' | 'boolean' | 'select' | 'array' | 'object'
  required: boolean
  options?: Array<{ label: string; value: string | number }>
  placeholder?: string
  helpText?: string
  defaultValue?: any
}

/**
 * Composable for template schema utilities
 */
export function useTemplateSchema() {
  const templateSchema = ref<TemplateSchemaResponse['data'] | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Fetch template schema from API
   */
  async function fetchTemplateSchema(templateSlug: TemplateSlug) {
    if (!templateSlug) {
      error.value = 'Template slug is required'
      return null
    }

    loading.value = true
    error.value = null

    try {
      if (import.meta.dev) {
        consola.info('[useTemplateSchema] Fetching schema from API', { templateSlug })
      }

      const response = await $fetch<TemplateSchemaResponse>(`/api/templates/${templateSlug}/schema`)

      if (response.success && response.data) {
        templateSchema.value = response.data

        if (import.meta.dev) {
          consola.success('[useTemplateSchema] Schema loaded', { templateSlug })
        }

        return response.data
      } else {
        throw new Error('Invalid response from API')
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch template schema'

      if (import.meta.dev) {
        consola.error('[useTemplateSchema] Failed to fetch schema:', err)
      }

      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Generate form fields from JSON Schema
   */
  function generateFormFields(schema: Record<string, any>): FormField[] {
    if (!schema || !schema.properties) {
      return []
    }

    const fields: FormField[] = []
    const required = schema.required || []

    for (const [key, prop] of Object.entries(schema.properties)) {
      const property = prop as any
      const field: FormField = {
        name: key,
        label: formatLabel(key),
        type: mapJsonSchemaType(property),
        required: required.includes(key),
        helpText: property.description
      }

      // Add options for enum fields
      if (property.enum) {
        field.options = property.enum.map((value: any) => ({
          label: formatLabel(String(value)),
          value
        }))
      }

      // Add default value
      if (property.default !== undefined) {
        field.defaultValue = property.default
      }

      // Add placeholder
      if (property.type === 'string') {
        field.placeholder = `Enter ${field.label.toLowerCase()}`
      }

      fields.push(field)
    }

    return fields
  }

  /**
   * Map JSON Schema type to form field type
   */
  function mapJsonSchemaType(property: any): FormField['type'] {
    if (property.enum) {
      return 'select'
    }

    switch (property.type) {
      case 'string':
        return 'text'
      case 'number':
      case 'integer':
        return 'number'
      case 'boolean':
        return 'boolean'
      case 'array':
        return 'array'
      case 'object':
        return 'object'
      default:
        return 'text'
    }
  }

  /**
   * Format field name to human-readable label
   */
  function formatLabel(name: string): string {
    return name
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
      .replace(/_/g, ' ') // Replace underscores with spaces
      .trim()
  }

  /**
   * Get default metadata for a template
   */
  function getDefaultMetadata(): Record<string, any> {
    return templateSchema.value?.defaultMetadata || {}
  }

  /**
   * Validate metadata against schema
   */
  function validateMetadata(metadata: Record<string, any>, schema: Record<string, any>): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!schema || !schema.properties) {
      return { valid: true, errors }
    }

    const required = schema.required || []

    // Check required fields
    for (const field of required) {
      if (metadata[field] === undefined || metadata[field] === null || metadata[field] === '') {
        errors.push(`${formatLabel(field)} is required`)
      }
    }

    // Validate field types
    for (const [key, value] of Object.entries(metadata)) {
      const property = schema.properties[key]
      if (!property) continue

      // Type validation
      if (property.type === 'number' && typeof value !== 'number') {
        errors.push(`${formatLabel(key)} must be a number`)
      }

      if (property.type === 'boolean' && typeof value !== 'boolean') {
        errors.push(`${formatLabel(key)} must be a boolean`)
      }

      if (property.type === 'array' && !Array.isArray(value)) {
        errors.push(`${formatLabel(key)} must be an array`)
      }

      // Enum validation
      if (property.enum && !property.enum.includes(value)) {
        errors.push(`${formatLabel(key)} must be one of: ${property.enum.join(', ')}`)
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  return {
    templateSchema,
    loading,
    error,
    fetchTemplateSchema,
    generateFormFields,
    getDefaultMetadata,
    validateMetadata,
    formatLabel
  }
}

