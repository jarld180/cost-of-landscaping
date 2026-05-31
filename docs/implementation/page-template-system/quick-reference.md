# Page Template System - Quick Reference

**For:** Developers who need quick answers  
**See Also:** [Full Guide](./creating-templates.md) | [Overview](./README.md)

---

## 🚀 Quick Start: Add a New Template

```bash
# 1. Create migration file
touch supabase/migrations/$(date +%Y%m%d%H%M%S)_add_my_template.sql

# 2. Add INSERT statement (see template below)

# 3. Create Vue component (or reuse existing)
touch app/components/templates/MyTemplate.vue

# 4. Update registry
# Edit: app/utils/pageTemplateRegistry.ts

# 5. Apply migration via Supabase MCP

# 6. Test in admin panel
```

---

## 📝 Migration Template

```sql
INSERT INTO page_templates (
  slug, name, description, component_name,
  metadata_schema, default_metadata,
  color, display_order, is_enabled, is_system
)
VALUES (
  'my-template',                    -- kebab-case
  'My Template',                    -- Display name
  'Template description',           -- Purpose
  'MyTemplate',                     -- PascalCase component
  '{"type": "object", "properties": {}}'::jsonb,
  '{}'::jsonb,
  '#3B82F6',                        -- Hex color
  10,                               -- Display order
  true,                             -- Enabled
  false                             -- Not system template
);
```

---

## 🎨 Vue Component Template

```vue
<script setup lang="ts">
import type { Database } from '~/types/supabase'

type Page = Database['public']['Tables']['pages']['Row']

interface Props {
  page: Page
}

const props = defineProps<Props>()

const metadata = computed(() => {
  return props.page.metadata as {
    // Your metadata types here
  }
})
</script>

<template>
  <div class="my-template">
    <h1 class="text-4xl font-bold text-gray-900 dark:text-white">
      {{ page.title }}
    </h1>
    <!-- Your template markup -->
  </div>
</template>
```

---

## 🔧 Registry Update

```typescript
// app/utils/pageTemplateRegistry.ts

// 1. Add import
import MyTemplate from '~/components/templates/MyTemplate.vue'

// 2. Add mapping
export const TEMPLATE_COMPONENTS: Record<string, Component> = {
  // ... existing
  'my-template': MyTemplate  // ← Add this
}
```

---

## 📊 Common Metadata Patterns

### Boolean Field
```json
{
  "showSidebar": {
    "type": "boolean",
    "description": "Show sidebar"
  }
}
```

### Dropdown (Enum)
```json
{
  "layout": {
    "type": "string",
    "enum": ["grid", "list", "masonry"]
  }
}
```

### Number with Options
```json
{
  "columns": {
    "type": "number",
    "enum": [2, 3, 4]
  }
}
```

### Array of UUIDs
```json
{
  "featuredPages": {
    "type": "array",
    "items": {"type": "string", "format": "uuid"}
  }
}
```

### Nested Object
```json
{
  "callToAction": {
    "type": "object",
    "properties": {
      "text": {"type": "string"},
      "url": {"type": "string"}
    },
    "required": ["text", "url"]
  }
}
```

---

## 🐛 Common Issues

### Template Not in Dropdown?
```sql
-- Check if enabled
SELECT slug, is_enabled, deleted_at FROM page_templates WHERE slug = 'my-template';

-- Enable it
UPDATE page_templates SET is_enabled = true WHERE slug = 'my-template';
```

### Wrong Component Renders?
```typescript
// Check registry mapping in: app/utils/pageTemplateRegistry.ts
// Make sure import and mapping exist
```

### Metadata Not Saving?
```json
// Validate JSON Schema at: https://www.jsonschemavalidator.net/
```

---

## 📋 Validation Rules

| Field | Rule | Example |
|-------|------|---------|
| `slug` | kebab-case, unique | `product-showcase` |
| `component_name` | PascalCase | `ProductShowcaseTemplate` |
| `color` | Hex format | `#3B82F6` |
| `metadata_schema` | Valid JSON Schema | `{"type": "object", ...}` |

---

## 🔍 Useful Queries

### List All Templates
```sql
SELECT slug, name, component_name, is_enabled, display_order
FROM page_templates
WHERE deleted_at IS NULL
ORDER BY display_order;
```

### Check Template Details
```sql
SELECT *
FROM page_templates
WHERE slug = 'my-template';
```

### Find Pages Using Template
```sql
SELECT id, slug, title, template
FROM pages
WHERE template = 'my-template'
AND deleted_at IS NULL;
```

---

## 📝 Logging Pattern

```typescript
if (import.meta.dev) {
  consola.info('[ServiceName] Message', { context })
}
```

**Examples:**
```typescript
consola.info('[PageForm] Template selected', { template: 'hub' })
consola.success('[TemplateRegistry] Component found', { slug, component })
consola.warn('[TemplateRegistry] Fallback used', { slug })
consola.error('[PageTemplateService] Validation failed', { error })
```

---

## 🎯 Testing Checklist

- [ ] Template appears in dropdown
- [ ] Page creates successfully
- [ ] Correct component renders
- [ ] Metadata fields work
- [ ] Responsive design works
- [ ] Dark mode works
- [ ] Console logs appear (dev)
- [ ] Edit page works

---

## 📚 Full Documentation

For detailed information, see:
- [Creating Templates Guide](./creating-templates.md) - Complete developer guide
- [README](./README.md) - Implementation overview

