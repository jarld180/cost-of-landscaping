---
discovery_date: 2026-01-22
last_updated: 2026-01-22
source_patterns: ["supabase/migrations/**", "app/types/supabase.ts"]
confidence: high
cartographer_version: 1.0
---

# Data Contract

Database schema guarantees and data flow patterns.

---

## Core Tables

### contractors

Primary business entity.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | uuid | No | PK, auto-generated |
| name | text | No | Business name |
| city_id | uuid | No | FK to cities |
| status | text | No | active, inactive, pending |
| coordinates | geography | Yes | PostGIS point |
| created_at | timestamptz | No | Auto |
| updated_at | timestamptz | No | Auto |

**Indexes:** city_id, status, coordinates (GIST)

### cities

Geographic reference data.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | uuid | No | PK |
| name | text | No | City name |
| state | text | No | State code |
| slug | text | No | URL slug, unique |

### pages

CMS content.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | uuid | No | PK |
| slug | text | No | URL path, unique |
| title | text | No | Page title |
| content | jsonb | Yes | Template-specific content |
| template_slug | text | Yes | FK to page_templates |
| status | text | No | draft, published |
| seo_title | text | Yes | SEO override |
| seo_description | text | Yes | Meta description |

### page_templates

Template definitions.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| slug | text | No | PK |
| name | text | No | Display name |
| schema | jsonb | No | Field definitions |

### menus

Navigation structures.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | uuid | No | PK |
| slug | text | No | Identifier |
| name | text | No | Display name |
| location | text | Yes | header, footer, etc. |

### menu_items

Menu entries.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | uuid | No | PK |
| menu_id | uuid | No | FK to menus |
| label | text | No | Display text |
| href | text | No | Link target |
| order | int | No | Sort order |
| link_type | text | No | internal, external |

### account_profiles

User profiles (extends auth.users).

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | uuid | No | PK, FK to auth.users |
| account_type | text | No | system, contractor |
| is_admin | boolean | No | Admin flag |
| status | text | No | active, suspended, deleted |
| metadata | jsonb | Yes | Flexible data |

### background_jobs

Job queue.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | uuid | No | PK |
| type | text | No | Job type identifier |
| status | text | No | pending, running, completed, failed |
| payload | jsonb | Yes | Job input |
| result | jsonb | Yes | Job output |
| logs | jsonb | Yes | Execution logs |
| created_at | timestamptz | No | Auto |
| started_at | timestamptz | Yes | Execution start |
| completed_at | timestamptz | Yes | Execution end |

---

## Foreign Key Relationships

```
contractors.city_id → cities.id
menu_items.menu_id → menus.id
pages.template_slug → page_templates.slug
account_profiles.id → auth.users.id
```

---

## Soft Deletes

Tables using soft delete pattern:
- `menus` (via deleted_at or status)
- `pages` (via status = 'deleted')
- `account_profiles` (via status = 'deleted')

**Convention:** Use `status` field rather than `deleted_at` timestamp.

---

## JSONB Schemas

### pages.content

Varies by template. Example for article template:
```json
{
  "body": "<p>Rich text content</p>",
  "author": "string",
  "publishDate": "2026-01-22"
}
```

### page_templates.schema

Field definitions:
```json
[
  {
    "name": "body",
    "type": "richtext",
    "required": true
  },
  {
    "name": "author",
    "type": "text",
    "required": false
  }
]
```

---

## Type Generation

Types are auto-generated from schema:

```bash
supabase gen types typescript --local > app/types/supabase.ts
```

Usage:
```typescript
import type { Database } from '~/types/supabase'

type Contractor = Database['public']['Tables']['contractors']['Row']
```

---

## Data Invariants

1. **contractors.city_id** must reference valid city
2. **pages.slug** must be unique among non-deleted pages
3. **menu_items.order** must be unique within a menu
4. **account_profiles.id** must match auth.users.id

---

## Migration Protocol

1. Create migration: `supabase migration new <name>`
2. Write SQL in `supabase/migrations/`
3. Apply: `pnpm db:push`
4. Regenerate types: `supabase gen types typescript --local > app/types/supabase.ts`
5. Commit both files together
