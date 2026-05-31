/**
 * Page Template Registry
 *
 * Central registry for mapping template slugs to Vue components.
 * Provides a flexible, extensible system for template component resolution.
 *
 * @module pageTemplateRegistry
 */

import type { Component } from 'vue'
import type { TemplateSlug } from '~/types/templates'
import { consola } from 'consola'

// Import active template components
import DefaultTemplate from '~/components/templates/DefaultTemplate.vue'
import ArticleTemplate from '~/components/templates/ArticleTemplate.vue'

// Legacy templates (deprecated - kept for backwards compatibility)
import HubTemplateLegacy from '~/components/templates/deprecated/HubTemplateLegacy.vue'
import SpokeTemplateLegacy from '~/components/templates/deprecated/SpokeTemplateLegacy.vue'
import SubSpokeTemplateLegacy from '~/components/templates/deprecated/SubSpokeTemplateLegacy.vue'

// =====================================================
// TEMPLATE COMPONENT REGISTRY
// =====================================================

/**
 * Registry mapping template slugs to Vue components
 *
 * Active templates: article, default
 * Legacy templates: hub, spoke, sub-spoke (disabled in DB, kept for existing pages)
 *
 * To add a new template:
 * 1. Import the component at the top of this file
 * 2. Add the mapping to this object
 * 3. The template will automatically be available for use
 */
export const TEMPLATE_COMPONENTS: Record<string, Component> = {
  // Active templates
  'article': ArticleTemplate,
  'default': DefaultTemplate,

  // Legacy templates (disabled in DB, kept for backwards compatibility)
  'hub': HubTemplateLegacy,
  'spoke': SpokeTemplateLegacy,
  'sub-spoke': SubSpokeTemplateLegacy
}

// =====================================================
// REGISTRY FUNCTIONS
// =====================================================

/**
 * Get the Vue component for a given template slug
 *
 * Falls back to DefaultTemplate if the slug is not found in the registry.
 * Logs a warning in development when fallback is used.
 *
 * @param slug - Template slug to look up
 * @returns Vue component for the template
 *
 * @example
 * const component = getTemplateComponent('hub')
 * // Returns HubTemplate component
 *
 * @example
 * const component = getTemplateComponent('unknown-template')
 * // Returns DefaultTemplate and logs warning in dev
 */
export function getTemplateComponent(slug: TemplateSlug): Component {
  if (import.meta.dev) {
    consola.info('[TemplateRegistry] Getting component for template', { slug })
  }

  // Check if template exists in registry
  const component = TEMPLATE_COMPONENTS[slug]

  if (component) {
    if (import.meta.dev) {
      consola.success('[TemplateRegistry] Component found', {
        slug,
        component: component.__name || 'Component'
      })
    }
    return component
  }

  // Fallback to DefaultTemplate
  if (import.meta.dev) {
    consola.warn('[TemplateRegistry] No mapping found for template, using DefaultTemplate', {
      slug,
      availableTemplates: Object.keys(TEMPLATE_COMPONENTS)
    })
  }

  return DefaultTemplate
}

/**
 * Check if a template slug has a component mapping in the registry
 *
 * @param slug - Template slug to check
 * @returns True if the slug has a mapping, false otherwise
 *
 * @example
 * if (hasTemplateComponent('hub')) {
 *   // Template exists in registry
 * }
 */
export function hasTemplateComponent(slug: TemplateSlug): boolean {
  const exists = slug in TEMPLATE_COMPONENTS

  if (import.meta.dev) {
    consola.info('[TemplateRegistry] Checking if template exists', { slug, exists })
  }

  return exists
}

