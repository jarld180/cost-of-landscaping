# Creating Page Templates - Developer Guide

**Version:** 1.0
**Last Updated:** 2025-11-21
**Related Issues:** BAM-53, BAM-54, BAM-55, BAM-56, BAM-57, BAM-58, BAM-59

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Developer Workflow](#developer-workflow)
4. [Metadata Schema Guidelines](#metadata-schema-guidelines)
5. [Vue Component Guidelines](#vue-component-guidelines)
6. [Component Registry](#component-registry)
7. [Logging Best Practices](#logging-best-practices)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)
10. [Future Enhancements](#future-enhancements)

---

## Overview

### What is the Page Template System?

The **Page Template System** is a database-driven architecture that allows flexible creation and management of page templates without requiring code changes. Templates define how pages are rendered, what metadata they support, and which Vue components are used.

### Key Features

- ✅ **Database-Driven**: Templates stored in `page_templates` table
- ✅ **No Depth Restrictions**: Any template can be used at any depth
- ✅ **Explicit Selection**: Template must be explicitly chosen (no auto-assignment)
- ✅ **Extensible**: Add new templates via migrations
- ✅ **Flexible Component Mapping**: Reuse existing components or create new ones
- ✅ **Type-Safe**: Branded types provide autocomplete while accepting custom templates

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer                            │
│  page_templates table (slug, name, component_name, schema)  │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                  Repository Layer                            │
│         PageTemplateRepository (data access)                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                   Service Layer                              │
│      PageTemplateService (business logic, validation)        │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                     API Layer                                │
│    /api/templates, /api/templates/[slug]/schema             │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                   Client Layer                               │
│  PageForm (template selection), useTemplateSchema (fetch)   │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                 Component Registry                           │
│    pageTemplateRegistry (slug → Vue component mapping)      │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                  Vue Components                              │
│   HubTemplate, SpokeTemplate, ArticleTemplate, etc.         │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Adding a New Template (5 Steps)

1. **Create Migration** - Add template to database
2. **Create/Reuse Component** - Vue component for rendering
3. **Update Registry** - Map slug to component
4. **Apply Migration** - Run via Supabase
5. **Test** - Create page and verify rendering

**Estimated Time:** 30-60 minutes

---

## Developer Workflow

### Step 1: Plan Your Template

Before writing any code, define:

- **Slug**: URL-friendly identifier (kebab-case, e.g., `product-showcase`)
- **Name**: Display name (e.g., "Product Showcase Template")
- **Description**: Purpose and use case
- **Component**: Reuse existing or create new? (e.g., `ProductShowcaseTemplate`)
- **Metadata Schema**: What fields does this template need?

**Example Planning:**

```yaml
Slug: product-showcase
Name: Product Showcase Template
Description: Display products in a grid with filtering and search
Component: ProductShowcaseTemplate (new)
Metadata:
  - showFilters: boolean
  - gridColumns: number (2, 3, 4)
  - featuredProducts: array of UUIDs
  - sortOrder: enum (price, name, date)
```

### Step 2: Create Migration

Create a new migration file in `supabase/migrations/` with timestamp naming:

**Filename:** `YYYYMMDDHHMMSS_add_product_showcase_template.sql`

**Example:** `20251121120000_add_product_showcase_template.sql`

**Migration Template:**

```sql
-- =====================================================
-- Add Product Showcase Template
-- =====================================================
-- Description: Template for displaying products in a grid
-- Related: [Your Issue Number]
-- =====================================================

INSERT INTO page_templates (
  slug,
  name,
  description,
  component_name,
  metadata_schema,
  default_metadata,
  color,
  display_order,
  is_enabled,
  is_system
)
VALUES (
  'product-showcase',
  'Product Showcase Template',
  'Display products in a grid with filtering and search capabilities',
  'ProductShowcaseTemplate',
  '{
    "type": "object",
    "properties": {
      "showFilters": {
        "type": "boolean",
        "description": "Show product filters"
      },
      "gridColumns": {
        "type": "number",
        "enum": [2, 3, 4],
        "description": "Number of columns in grid"
      },
      "featuredProducts": {
        "type": "array",
        "items": {"type": "string", "format": "uuid"},
        "description": "Featured product page IDs"
      },
      "sortOrder": {
        "type": "string",
        "enum": ["price", "name", "date"],
        "description": "Default sort order"
      }
    },
    "required": ["showFilters", "gridColumns"]
  }'::jsonb,
  '{
    "showFilters": true,
    "gridColumns": 3,
    "sortOrder": "name"
  }'::jsonb,
  '#3B82F6',
  7,
  true,
  false
);
```

**Key Fields Explained:**

- **slug**: Must be unique, kebab-case, matches regex `^[a-z0-9]+(-[a-z0-9]+)*$`
- **component_name**: PascalCase, matches regex `^[A-Z][a-zA-Z0-9]*$`
- **metadata_schema**: JSON Schema for validation (see [Metadata Schema Guidelines](#metadata-schema-guidelines))
- **default_metadata**: Default values when creating new pages
- **color**: Hex color for UI badges (e.g., `#3B82F6`)
- **display_order**: Order in template dropdown (higher = later)
- **is_enabled**: `true` to make available, `false` to hide
- **is_system**: `true` prevents deletion (use `false` for custom templates)

### Step 3: Create Vue Component (if needed)

If reusing an existing component (e.g., `DefaultTemplate`), skip to Step 4.

**Location:** `app/components/templates/ProductShowcaseTemplate.vue`

**Component Template:**

```vue
<script setup lang="ts">
import type { Database } from '~/types/supabase'

type Page = Database['public']['Tables']['pages']['Row']

interface Props {
  page: Page
}

const props = defineProps<Props>()

// Parse metadata with type safety
const metadata = computed(() => {
  return props.page.metadata as {
    showFilters?: boolean
    gridColumns?: number
    featuredProducts?: string[]
    sortOrder?: 'price' | 'name' | 'date'
  }
})

// Component logic here
const showFilters = computed(() => metadata.value.showFilters ?? true)
const gridColumns = computed(() => metadata.value.gridColumns ?? 3)
</script>

<template>
  <div class="product-showcase-template">
    <!-- Header -->
    <header class="mb-8">
      <h1 class="text-4xl font-bold text-gray-900 dark:text-white">
        {{ page.title }}
      </h1>
      <div v-if="page.content" class="mt-4 prose dark:prose-invert">
        <ContentRenderer :value="page.content" />
      </div>
    </header>

    <!-- Filters (conditional) -->
    <div v-if="showFilters" class="mb-6">
      <!-- Filter UI here -->
    </div>

    <!-- Product Grid -->
    <div
      class="grid gap-6"
      :class="{
        'grid-cols-1 md:grid-cols-2': gridColumns === 2,
        'grid-cols-1 md:grid-cols-2 lg:grid-cols-3': gridColumns === 3,
        'grid-cols-1 md:grid-cols-2 lg:grid-cols-4': gridColumns === 4
      }"
    >
      <!-- Product cards here -->
    </div>
  </div>
</template>

<style scoped>
/* Component-specific styles */
</style>
```

**Component Best Practices:**

- ✅ Accept `page` prop with type `Database['public']['Tables']['pages']['Row']`
- ✅ Parse `page.metadata` with type safety
- ✅ Provide fallback values for all metadata fields
- ✅ Use Tailwind CSS for styling (mobile-first)
- ✅ Support light and dark modes
- ✅ Use semantic HTML
- ✅ Add accessibility attributes (ARIA labels, roles)

### Step 4: Update Component Registry

**Location:** `app/utils/pageTemplateRegistry.ts`

**Add Import:**

```typescript
import ProductShowcaseTemplate from '~/components/templates/ProductShowcaseTemplate.vue'
```

**Add Mapping:**

```typescript
export const TEMPLATE_COMPONENTS: Record<string, Component> = {
  'hub': HubTemplate,
  'spoke': SpokeTemplate,
  'sub-spoke': SubSpokeTemplate,
  'article': ArticleTemplate,
  'custom': DefaultTemplate,
  'default': DefaultTemplate,
  'product-showcase': ProductShowcaseTemplate  // ← Add this line
}
```

**That's it!** The registry will automatically handle component resolution.

### Step 5: Apply Migration

Use the Supabase MCP server to apply the migration:

```bash
# Via Supabase MCP
apply_migration_Supabase({
  name: "add_product_showcase_template",
  query: "INSERT INTO page_templates (...) VALUES (...);"
})
```

**Verify the migration:**

```sql
SELECT slug, name, component_name, is_enabled, display_order
FROM page_templates
WHERE slug = 'product-showcase';
```

### Step 6: Test Your Template

1. **Navigate to Admin Panel**: `/admin/pages/create`
2. **Select Template**: Choose "Product Showcase Template" from dropdown
3. **Fill Form**: Add title, slug, content
4. **Configure Metadata**: Set template-specific fields
5. **Save Page**: Create the page
6. **Verify Rendering**: Visit the page URL and verify component renders correctly
7. **Check Console**: Verify logging appears (dev mode only)

**Expected Console Logs:**

```
[PageForm] Templates loaded from API {count: 7}
[PageForm] Template selected {template: product-showcase}
[useTemplateSchema] Fetching schema for template {slug: product-showcase}
[TemplateRegistry] Getting component for template {slug: product-showcase}
[TemplateRegistry] Component found {slug: product-showcase, component: ProductShowcaseTemplate}
[PageRenderer] Page loaded {path: /my-products, template: product-showcase, depth: 0}
```

### Step 7: Document Your Template

Add documentation to your project docs explaining:

- Template purpose and use cases
- Metadata fields and their effects
- Example configurations
- Screenshots (if applicable)

---

## Metadata Schema Guidelines

### JSON Schema Basics

The `metadata_schema` field uses [JSON Schema](https://json-schema.org/) for validation. This ensures data integrity and provides autocomplete in the admin UI.

### Common Patterns

#### 1. Boolean Field

```json
{
  "type": "object",
  "properties": {
    "showSidebar": {
      "type": "boolean",
      "description": "Display sidebar navigation"
    }
  }
}
```

**Default Metadata:**
```json
{
  "showSidebar": true
}
```

#### 2. Enum Field (Dropdown)

```json
{
  "type": "object",
  "properties": {
    "layout": {
      "type": "string",
      "enum": ["grid", "list", "masonry"],
      "description": "Page layout style"
    }
  }
}
```

**Default Metadata:**
```json
{
  "layout": "grid"
}
```

#### 3. Number Field with Constraints

```json
{
  "type": "object",
  "properties": {
    "columns": {
      "type": "number",
      "enum": [2, 3, 4, 6],
      "description": "Number of grid columns"
    }
  }
}
```

**Default Metadata:**
```json
{
  "columns": 3
}
```

#### 4. Array of UUIDs (Related Pages)

```json
{
  "type": "object",
  "properties": {
    "featuredPages": {
      "type": "array",
      "items": {
        "type": "string",
        "format": "uuid"
      },
      "description": "Featured page IDs"
    }
  }
}
```

**Default Metadata:**
```json
{
  "featuredPages": []
}
```

#### 5. Nested Object (Complex Configuration)

```json
{
  "type": "object",
  "properties": {
    "callToAction": {
      "type": "object",
      "properties": {
        "text": {
          "type": "string",
          "description": "Button text"
        },
        "url": {
          "type": "string",
          "format": "uri",
          "description": "Button URL"
        },
        "style": {
          "type": "string",
          "enum": ["primary", "secondary", "outline"],
          "description": "Button style"
        }
      },
      "required": ["text", "url"]
    }
  }
}
```

**Default Metadata:**
```json
{
  "callToAction": {
    "text": "Learn More",
    "url": "/contact",
    "style": "primary"
  }
}
```

#### 6. Array of Strings (Tags)

```json
{
  "type": "object",
  "properties": {
    "tags": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Content tags"
    }
  }
}
```

**Default Metadata:**
```json
{
  "tags": []
}
```

### Required vs Optional Fields

Use the `required` array to specify mandatory fields:

```json
{
  "type": "object",
  "properties": {
    "layout": {"type": "string"},
    "showSidebar": {"type": "boolean"},
    "columns": {"type": "number"}
  },
  "required": ["layout", "showSidebar"]
}
```

In this example:
- ✅ `layout` and `showSidebar` are **required**
- ⚪ `columns` is **optional**

---

## Vue Component Guidelines

### Component Structure

All template components should follow this structure:

```vue
<script setup lang="ts">
// 1. Imports
import type { Database } from '~/types/supabase'

// 2. Type Definitions
type Page = Database['public']['Tables']['pages']['Row']

interface Props {
  page: Page
}

// 3. Props
const props = defineProps<Props>()

// 4. Metadata Parsing (with type safety)
const metadata = computed(() => {
  return props.page.metadata as {
    // Define your metadata types here
  }
})

// 5. Computed Properties (with fallbacks)
const someField = computed(() => metadata.value.someField ?? defaultValue)

// 6. Component Logic
</script>

<template>
  <!-- 7. Template Markup -->
</template>

<style scoped>
/* 8. Component Styles */
</style>
```

### Metadata Type Safety

Always parse metadata with proper TypeScript types:

```typescript
const metadata = computed(() => {
  return props.page.metadata as {
    showSidebar?: boolean
    layout?: 'grid' | 'list' | 'masonry'
    columns?: number
    featuredPages?: string[]
  }
})
```

### Fallback Values

Always provide fallback values for metadata fields:

```typescript
// ✅ Good - with fallback
const showSidebar = computed(() => metadata.value.showSidebar ?? true)

// ❌ Bad - no fallback
const showSidebar = computed(() => metadata.value.showSidebar)
```

### Responsive Design

Use Tailwind's responsive classes for mobile-first design:

```vue
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <!-- Mobile: 1 column, Tablet: 2 columns, Desktop: 3 columns -->
</div>
```

### Dark Mode Support

Always support both light and dark modes:

```vue
<h1 class="text-gray-900 dark:text-white">
  {{ page.title }}
</h1>

<div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
  <!-- Content -->
</div>
```

### Content Rendering

Use `ContentRenderer` for markdown content:

```vue
<div v-if="page.content" class="prose dark:prose-invert max-w-none">
  <ContentRenderer :value="page.content" />
</div>
```

---

## Component Registry

### How It Works

The component registry (`app/utils/pageTemplateRegistry.ts`) maps template slugs to Vue components:

```typescript
export const TEMPLATE_COMPONENTS: Record<string, Component> = {
  'hub': HubTemplate,
  'spoke': SpokeTemplate,
  'product-showcase': ProductShowcaseTemplate
}
```

### Adding a Template

1. Import the component
2. Add mapping to `TEMPLATE_COMPONENTS`
3. Done!

### Fallback Behavior

If a template slug is not found in the registry:
- ✅ Falls back to `DefaultTemplate`
- ⚠️ Logs warning in dev mode
- ✅ Page still renders (graceful degradation)

### Type Safety

The registry uses the `TemplateSlug` branded type:

```typescript
export type TemplateSlug = CoreTemplateSlug | (string & {})
```

This provides:
- ✅ Autocomplete for core templates (`hub`, `spoke`, etc.)
- ✅ Accepts any string for custom templates
- ✅ No runtime overhead

---

## Logging Best Practices

### Dev-Only Logging

All logging must be wrapped in `import.meta.dev` check:

```typescript
if (import.meta.dev) {
  consola.info('[ServiceName] Message', { context })
}
```

### Logging Conventions

#### 1. Service Name Prefix

Always use `[ServiceName]` prefix:

```typescript
consola.info('[PageTemplateService] Fetching template', { slug })
consola.info('[TemplateRegistry] Component found', { slug, component })
consola.info('[PageForm] Template selected', { template })
```

#### 2. Contextual Data

Include relevant context in logs:

```typescript
// ✅ Good - with context
consola.info('[PageTemplateService] Template validated', {
  slug: 'hub',
  isEnabled: true,
  componentName: 'HubTemplate'
})

// ❌ Bad - no context
consola.info('[PageTemplateService] Template validated')
```

#### 3. Log Levels

Use appropriate log levels:

```typescript
// Info - General information
consola.info('[Service] Operation started', { data })

// Success - Successful operations
consola.success('[Service] Operation completed', { result })

// Warn - Non-critical issues
consola.warn('[Service] Fallback used', { reason })

// Error - Critical errors
consola.error('[Service] Operation failed', { error })
```

#### 4. Example Logging Flow

```typescript
// Repository
if (import.meta.dev) {
  consola.info('[PageTemplateRepository] list() - Fetching templates', { enabledOnly })
}

// Service
if (import.meta.dev) {
  consola.info('[PageTemplateService] getEnabledTemplates() - Start')
}

// Success
if (import.meta.dev) {
  consola.success('[PageTemplateService] Found 6 templates')
}
```

---

## Troubleshooting

### Template Not Appearing in Dropdown

**Symptoms:** New template doesn't show in admin page form

**Checklist:**
1. ✅ Migration applied successfully?
2. ✅ `is_enabled = true` in database?
3. ✅ `deleted_at IS NULL` in database?
4. ✅ Check browser console for API errors
5. ✅ Verify `/api/templates` returns your template

**Solution:**
```sql
-- Check template status
SELECT slug, name, is_enabled, deleted_at
FROM page_templates
WHERE slug = 'your-template-slug';

-- Enable if disabled
UPDATE page_templates
SET is_enabled = true
WHERE slug = 'your-template-slug';
```

### Page Renders DefaultTemplate Instead of Custom Template

**Symptoms:** Page uses DefaultTemplate even though custom template is selected

**Checklist:**
1. ✅ Component imported in `pageTemplateRegistry.ts`?
2. ✅ Mapping added to `TEMPLATE_COMPONENTS`?
3. ✅ Component file exists at correct path?
4. ✅ Check browser console for registry warnings

**Solution:**

Check console for warning:
```
⚠️ [TemplateRegistry] No mapping found for template, using DefaultTemplate
{slug: 'your-template', availableTemplates: ['hub', 'spoke', ...]}
```

Add mapping to registry:
```typescript
// app/utils/pageTemplateRegistry.ts
import YourTemplate from '~/components/templates/YourTemplate.vue'

export const TEMPLATE_COMPONENTS: Record<string, Component> = {
  // ... existing mappings
  'your-template': YourTemplate
}
```

### TypeScript Errors on Template Slug

**Symptoms:** TypeScript complains about custom template slug

**Example Error:**
```
Type '"my-custom-template"' is not assignable to type 'TemplateSlug'
```

**Solution:**

This shouldn't happen with branded types, but if it does:

```typescript
// ✅ Correct - branded type accepts any string
const template: TemplateSlug = 'my-custom-template'

// ❌ Incorrect - using old enum type
const template: CoreTemplateSlug = 'my-custom-template' // Error!
```

Make sure you're using `TemplateSlug` (not `CoreTemplateSlug`).

### Metadata Not Saving

**Symptoms:** Template metadata fields don't save or reset to defaults

**Checklist:**
1. ✅ Metadata schema valid JSON Schema?
2. ✅ Field names match between schema and component?
3. ✅ Check browser console for validation errors
4. ✅ Verify API request payload includes metadata

**Solution:**

Validate your JSON Schema:
```bash
# Use online validator: https://www.jsonschemavalidator.net/
```

Check API payload in browser DevTools:
```json
{
  "title": "My Page",
  "template": "product-showcase",
  "metadata": {
    "showFilters": true,
    "gridColumns": 3
  }
}
```

### Migration Fails

**Symptoms:** Migration fails to apply

**Common Errors:**

1. **Duplicate slug:**
   ```
   ERROR: duplicate key value violates unique constraint "page_templates_slug_key"
   ```
   **Solution:** Use a different slug or delete existing template

2. **Invalid slug format:**
   ```
   ERROR: new row violates check constraint "valid_slug_format"
   ```
   **Solution:** Use kebab-case (lowercase, hyphens only)

3. **Invalid component name:**
   ```
   ERROR: new row violates check constraint "valid_component_name_format"
   ```
   **Solution:** Use PascalCase (e.g., `MyTemplate`, not `myTemplate`)

4. **Invalid JSON:**
   ```
   ERROR: invalid input syntax for type json
   ```
   **Solution:** Validate JSON syntax (use online validator)

---

## Best Practices

### 1. Template Naming

**Slugs:**
- ✅ Use kebab-case: `product-showcase`, `team-directory`
- ❌ Avoid: `ProductShowcase`, `team_directory`, `TEAM-DIRECTORY`

**Names:**
- ✅ Use descriptive names: "Product Showcase Template", "Team Directory"
- ❌ Avoid: "Template 1", "New Template"

**Component Names:**
- ✅ Use PascalCase: `ProductShowcaseTemplate`, `TeamDirectoryTemplate`
- ❌ Avoid: `productShowcaseTemplate`, `product-showcase-template`

### 2. Metadata Schema Design

**Keep It Simple:**
- ✅ Start with minimal fields
- ✅ Add fields as needed
- ❌ Don't over-engineer upfront

**Use Enums for Dropdowns:**
```json
{
  "layout": {
    "type": "string",
    "enum": ["grid", "list", "masonry"]
  }
}
```

**Provide Descriptions:**
```json
{
  "showFilters": {
    "type": "boolean",
    "description": "Display product filters above the grid"
  }
}
```

**Set Sensible Defaults:**
```json
{
  "gridColumns": 3,
  "showFilters": true,
  "sortOrder": "name"
}
```

### 3. Component Reusability

**Reuse When Possible:**
- ✅ Multiple templates can use `DefaultTemplate`
- ✅ Similar layouts can share components
- ❌ Don't create new components unnecessarily

**Example:**
```sql
-- Both use DefaultTemplate
INSERT INTO page_templates (...) VALUES ('simple-page', ..., 'DefaultTemplate', ...);
INSERT INTO page_templates (...) VALUES ('basic-content', ..., 'DefaultTemplate', ...);
```

### 4. Testing Strategy

**Test Checklist:**
1. ✅ Create page with template
2. ✅ Verify component renders
3. ✅ Test all metadata fields
4. ✅ Test responsive design (mobile, tablet, desktop)
5. ✅ Test dark mode
6. ✅ Check console logs (dev mode)
7. ✅ Edit page and change metadata
8. ✅ Verify changes persist

### 5. Documentation

**Document Your Template:**
- ✅ Purpose and use cases
- ✅ Metadata fields and their effects
- ✅ Example configurations
- ✅ Screenshots (optional)

**Example:**
```markdown
## Product Showcase Template

**Purpose:** Display products in a filterable grid layout

**Use Cases:**
- Product catalogs
- Service listings
- Portfolio galleries

**Metadata Fields:**
- `showFilters` (boolean) - Show/hide filter UI
- `gridColumns` (number) - Grid columns (2, 3, or 4)
- `sortOrder` (string) - Default sort (price, name, date)

**Example Configuration:**
{
  "showFilters": true,
  "gridColumns": 3,
  "sortOrder": "price"
}
```

### 6. Performance Considerations

**Optimize Images:**
- ✅ Use Nuxt Image component
- ✅ Lazy load images
- ✅ Provide responsive sizes

**Minimize Metadata:**
- ✅ Store only essential data in metadata
- ✅ Use references (UUIDs) instead of full objects
- ❌ Don't store large arrays or nested objects

**Example:**
```json
// ✅ Good - store UUIDs
{
  "featuredProducts": ["uuid-1", "uuid-2", "uuid-3"]
}

// ❌ Bad - store full objects
{
  "featuredProducts": [
    {"id": "uuid-1", "name": "Product 1", "price": 99.99, ...},
    {"id": "uuid-2", "name": "Product 2", "price": 149.99, ...}
  ]
}
```

---

## Future Enhancements

### Planned Features

1. **Admin UI for Template Management**
   - Create templates via admin panel (no migrations)
   - Visual schema builder
   - Template preview

2. **Template Versioning**
   - Track template changes over time
   - Rollback to previous versions
   - Migration path for breaking changes

3. **Template Marketplace**
   - Share templates across projects
   - Import/export templates
   - Community templates

4. **Advanced Metadata Types**
   - Rich text editor fields
   - Image upload fields
   - Color picker fields
   - Date/time picker fields

5. **Template Analytics**
   - Track template usage
   - Popular templates
   - Performance metrics

### Contributing

If you create a useful template, consider:
- ✅ Documenting it thoroughly
- ✅ Sharing with the team
- ✅ Adding to template library
- ✅ Creating reusable components

---

## Summary

### Quick Reference

**Adding a Template:**
1. Create migration → 2. Create/reuse component → 3. Update registry → 4. Apply migration → 5. Test

**Key Files:**
- `supabase/migrations/` - Database migrations
- `app/components/templates/` - Vue components
- `app/utils/pageTemplateRegistry.ts` - Component registry
- `app/types/templates.ts` - Type definitions

**Important Constraints:**
- Slug: kebab-case, unique
- Component name: PascalCase
- Metadata schema: Valid JSON Schema
- Color: Hex format (e.g., `#3B82F6`)

**Logging Pattern:**
```typescript
if (import.meta.dev) {
  consola.info('[ServiceName] Message', { context })
}
```

---

## Additional Resources

- [JSON Schema Documentation](https://json-schema.org/)
- [Nuxt 3 Documentation](https://nuxt.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)

---

**Questions or Issues?**

If you encounter problems or have questions:
1. Check this documentation
2. Review existing templates for examples
3. Check browser console for errors
4. Ask the team for help

**Happy template building! 🚀**

