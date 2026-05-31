---
discovery_date: 2026-01-22
last_updated: 2026-01-22
source_patterns: ["supabase/migrations/**/*.sql", "supabase/config.toml"]
confidence: high
cartographer_version: 1.0
---

# Persistence & Database

## Database Platform

- **Provider**: Supabase (PostgreSQL 17)
- **Local Dev**: Supabase CLI with Docker
- **Extensions**: PostGIS (geospatial)

## Configuration

### Local Development
```toml
# supabase/config.toml
[db]
port = 54322
major_version = 17

[studio]
port = 54323
```

### Connection
```bash
# Via Supabase client
SUPABASE_URL=http://localhost:54321
SUPABASE_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

---

## Migration History

Migrations located in `supabase/migrations/`.

### Schema Evolution

| Migration | Purpose |
|-----------|---------|
| `20251108035249_create_pages_table` | CMS pages table |
| `20251108040645_add_seo_enhancements` | SEO fields for pages |
| `20251119090000_add_user_profiles_and_pages_admin_rls` | User profiles, RLS |
| `20251119120000_rename_user_profiles_to_account_profiles` | Renamed table |
| `20251119121000_create_menus_table` | Navigation menus |
| `20251119121100_create_menu_items_table` | Menu items |
| `20251119134331_enable_rls_on_pages_table` | Enable RLS |
| `20251119135456_add_public_read_policy_for_published_pages` | Public page access |
| `20251119180500_add_display_order_to_pages` | Page ordering |
| `20251120060000_add_link_type_to_menu_items` | External link support |
| `20251120080000_remove_menu_location_constraint` | Flexible menu locations |
| `20251120094800_remove_display_order_from_pages` | Cleanup |
| `20251120100000_fix_menu_slug_unique_constraint_for_soft_deletes` | Soft delete handling |
| `20251120110000_create_page_templates_table` | Template system |
| `20251120110100_remove_pages_template_constraint` | Flexible templates |
| `20251204100000_create_storage_buckets` | Storage setup |
| `20251204160000_create_cities_table` | City reference data |
| `20251204160100_create_service_types_table` | Service type catalog |
| `20251204160200_create_contractors_table` | Contractor data |
| `20251204160300_seed_service_types` | Seed service types |
| `20251206100000_add_postgis_coordinates` | Geospatial support |
| `20251206100100_add_contractor_search_rpc` | Geo search function |
| `20251209110000_create_import_jobs_table` | Bulk import tracking |
| `20251210120000_create_background_jobs_table` | Background job queue |
| `20251210120100_create_system_logs_table` | System logging |
| `20251210120200_create_job_runner_cron` | pg_cron job runner |

---

## Core Tables

### Content Management

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `pages` | CMS pages | slug, title, content, template_slug, status |
| `page_templates` | Template definitions | slug, name, schema (JSONB) |
| `menus` | Navigation menus | slug, name, location |
| `menu_items` | Menu entries | menu_id, label, href, order |

### Directory

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `contractors` | Contractor listings | name, city_id, coordinates, status |
| `cities` | City reference | name, state, slug |
| `service_types` | Service catalog | name, slug |

### Users & Auth

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `account_profiles` | User profiles | id (FK to auth.users), account_type, is_admin, status |

### Operations

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `background_jobs` | Job queue | type, status, payload, result |
| `import_jobs` | Import tracking | file_name, status, row_count |
| `system_logs` | Event logging | event, level, payload |

---

## Storage Buckets

Configured in migration `20251204100000_create_storage_buckets`:

| Bucket | Purpose | Public |
|--------|---------|--------|
| `contractor-images` | Contractor photos | Yes |
| `page-images` | CMS page images | Yes |

---

## Row Level Security (RLS)

### Pages Table
- **Public**: Can read published pages
- **Admin**: Full CRUD access

### Account Profiles
- **Users**: Can read own profile
- **Admin**: Can read/update all profiles

### Contractors
- **Public**: Can read active contractors
- **Owner**: Can update own contractor
- **Admin**: Full CRUD access

---

## Database Functions (RPC)

### `search_contractors_by_location`
Geospatial search using PostGIS:
```sql
SELECT * FROM search_contractors_by_location(
  lat := 40.7128,
  lng := -74.0060,
  radius_miles := 50
)
```

---

## Seeds

Located in `supabase/seed.sql`:
- Reference data for service types
- Initial admin user (development only)

---

## CLI Commands

```bash
# Push migrations to local DB
pnpm db:push

# Reset and reseed
supabase db reset

# Generate TypeScript types
supabase gen types typescript --local > app/types/supabase.ts

# Create new migration
supabase migration new <name>

# Show migration status
supabase migration list
```
