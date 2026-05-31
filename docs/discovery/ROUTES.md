---
discovery_date: 2026-01-22
last_updated: 2026-01-22
source_patterns: ["app/pages/**/*.vue", "server/api/**/*.ts"]
confidence: high
cartographer_version: 1.0
---

# Routes & API Endpoints

## Page Routes (Frontend)

### Public Routes

| Route | File | Purpose |
|-------|------|---------|
| `/` | `index.vue` | Homepage |
| `/concrete-contractors` | `concrete-contractors/index.vue` | Contractor search/listing |
| `/[...slug]` | `[...slug].vue` | CMS catch-all (pages table) |
| `/hub-example` | `hub-example.vue` | Dev/demo page |

### Admin Routes (`/admin/**`)

All admin routes require authentication via `admin-auth.global.ts` middleware.

| Route | File | Purpose |
|-------|------|---------|
| `/admin` | `admin/index.vue` | Dashboard |
| `/admin/pages` | `admin/pages/index.vue` | CMS pages list |
| `/admin/pages/new` | `admin/pages/new.vue` | Create page |
| `/admin/pages/[id]/edit` | `admin/pages/[id]/edit.vue` | Edit page |
| `/admin/menus` | `admin/menus/index.vue` | Menu management |
| `/admin/menus/new` | `admin/menus/new.vue` | Create menu |
| `/admin/menus/[id]/edit` | `admin/menus/[id]/edit.vue` | Edit menu |
| `/admin/menus/[id]/items` | `admin/menus/[id]/items.vue` | Menu items |
| `/admin/contractors` | `admin/contractors/index.vue` | Contractor list |
| `/admin/contractors/new` | `admin/contractors/new.vue` | Add contractor |
| `/admin/contractors/import` | `admin/contractors/import.vue` | Bulk import |
| `/admin/contractors/[id]` | `admin/contractors/[id]/index.vue` | Contractor detail |
| `/admin/contractors/[id]/edit` | `admin/contractors/[id]/edit.vue` | Edit contractor |
| `/admin/accounts/contractors` | `admin/accounts/contractors/index.vue` | Contractor accounts |
| `/admin/accounts/system` | `admin/accounts/system/index.vue` | System users |
| `/admin/accounts/system/invite` | `admin/accounts/system/invite.vue` | Invite admin |
| `/admin/maintenance` | `admin/maintenance/index.vue` | Maintenance tools |
| `/admin/maintenance/jobs` | `admin/maintenance/jobs/index.vue` | Background jobs |
| `/admin/maintenance/image-enrichment` | `admin/maintenance/image-enrichment.vue` | Image processing |
| `/admin/maintenance/contractor-enrichment` | `admin/maintenance/contractor-enrichment.vue` | Data enrichment |
| `/admin/claims` | `admin/claims/index.vue` | Business claims |
| `/admin/ai` | `admin/ai/index.vue` | AI tools |
| `/admin/ai/article-writing` | `admin/ai/article-writing/index.vue` | AI content |
| `/admin/ai/personas` | `admin/ai/personas/index.vue` | AI personas |

### Owner Routes (`/owner/**`)

Contractor self-service portal (auth via `owner-auth.global.ts`).

| Route | File | Purpose |
|-------|------|---------|
| `/owner/contractors/[id]/edit` | `owner/contractors/[id]/edit.vue` | Edit own listing |

---

## API Endpoints (Backend)

### Contractors API

| Method | Endpoint | Handler | Purpose |
|--------|----------|---------|---------|
| GET | `/api/contractors` | `index.get.ts` | List/search contractors |
| POST | `/api/contractors` | `index.post.ts` | Create contractor |
| GET | `/api/contractors/:id` | `[id].get.ts` | Get contractor |
| PATCH | `/api/contractors/:id` | `[id].patch.ts` | Update contractor |
| DELETE | `/api/contractors/:id` | `[id].delete.ts` | Delete contractor |
| POST | `/api/contractors/import` | `import.post.ts` | Bulk import |
| GET | `/api/contractors/enrichment-queue` | `enrichment-queue.get.ts` | Enrichment queue |
| GET | `/api/contractors/enrichment-stats` | `enrichment-stats.get.ts` | Enrichment stats |
| POST | `/api/contractors/enrich-images` | `enrich-images.post.ts` | Start image enrichment |
| GET | `/api/contractors/enrich-images/stream` | `enrich-images/stream.get.ts` | SSE progress |
| GET | `/api/contractors/pending-images` | `pending-images.get.ts` | Images to process |

### Import Jobs API

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/contractors/import-jobs` | List import jobs |
| POST | `/api/contractors/import-jobs` | Create import job |
| GET | `/api/contractors/import-jobs/:id` | Get job details |
| POST | `/api/contractors/import-jobs/:id/process` | Process import |

### Menus API

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/menus` | List menus |
| POST | `/api/menus` | Create menu |
| PATCH | `/api/menus/:id` | Update menu |
| DELETE | `/api/menus/:id` | Delete menu |
| GET | `/api/menus/by-slug/:slug` | Get by slug |
| GET | `/api/menus/by-location/:location` | Get by location |
| GET | `/api/menus/:id/items` | Get menu items |
| POST | `/api/menus/:id/items` | Add menu item |

### Menu Items API

| Method | Endpoint | Purpose |
|--------|----------|---------|
| PATCH | `/api/menu-items/:id` | Update item |
| DELETE | `/api/menu-items/:id` | Delete item |
| PATCH | `/api/menu-items/reorder` | Reorder items |

### Background Jobs API

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/jobs` | List jobs |
| POST | `/api/jobs` | Create job |
| GET | `/api/jobs/:id` | Get job |
| GET | `/api/jobs/:id/logs` | Get job logs |
| GET | `/api/jobs/:id/stream` | SSE job progress |
| POST | `/api/jobs/:id/execute` | Execute job |
| POST | `/api/jobs/:id/cancel` | Cancel job |
| POST | `/api/jobs/:id/retry` | Retry job |
| GET | `/api/jobs/stream` | SSE all jobs |

### Templates API

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/templates` | List page templates |
| GET | `/api/templates/:slug/schema` | Get template schema |

### Admin Accounts API

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/admin/accounts/contractors` | List contractor accounts |
| GET | `/api/admin/accounts/contractors/:id` | Get account |
| PATCH | `/api/admin/accounts/contractors/:id` | Update account |
| GET | `/api/admin/accounts/system` | List system accounts |
| GET | `/api/admin/accounts/system/:id` | Get system account |
| PATCH | `/api/admin/accounts/system/:id` | Update system account |
| DELETE | `/api/admin/accounts/system/:id` | Delete system account |
| POST | `/api/admin/accounts/system/invite` | Invite admin |

### Other APIs

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/cities` | List cities for autocomplete |
| GET | `/api/owner/contractors` | Owner's contractors |
| PATCH | `/api/owner/contractors/:id` | Owner update |

---

## Route Customization

### State Route Matching

The app uses custom route matching for US state slugs to avoid conflicts with CMS pages:

```typescript
// nuxt.config.ts
hooks: {
  'pages:extend'(pages) {
    // State routes use regex: `:state(alabama|alaska|...)`
    // Catch-all `[...slug]` moved to end of route list
  }
}
```

### SSR Configuration

```typescript
routeRules: {
  '/admin/**': { ssr: false },  // SPA mode for admin
}
```
