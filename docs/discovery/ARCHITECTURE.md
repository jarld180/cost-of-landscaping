---
discovery_date: 2026-01-22
last_updated: 2026-01-22
source_patterns: ["app/**", "server/**", "supabase/**"]
confidence: high
cartographer_version: 1.0
---

# Architecture Overview

## Application Type

**Cost of Concrete** is a B2B directory and content management platform for concrete contractors. It features:
- Public contractor search/listing pages
- Admin CMS for content management
- Owner portal for contractor self-management
- Background job system for data enrichment

## Directory Structure

```
cost-of-concrete/
├── app/                    # Nuxt 4 app directory
│   ├── pages/              # File-based routing
│   ├── components/         # Vue components
│   ├── composables/        # Vue composables
│   ├── layouts/            # Page layouts
│   ├── middleware/         # Route middleware
│   ├── schemas/            # Client-side Zod schemas
│   ├── types/              # TypeScript types
│   ├── utils/              # Utility functions
│   ├── lib/                # Auto-imported libraries
│   ├── constants/          # Static constants
│   └── assets/             # CSS, fonts
├── server/                 # Nitro server
│   ├── api/                # API endpoints
│   ├── services/           # Business logic
│   ├── repositories/       # Data access layer
│   ├── schemas/            # Server-side Zod schemas
│   ├── utils/              # Server utilities
│   └── __tests__/          # Unit tests
├── supabase/               # Database
│   ├── migrations/         # SQL migrations
│   ├── config.toml         # Local dev config
│   └── tests/              # Database tests
├── tests/                  # E2E tests (Playwright)
├── docs/                   # Documentation
└── public/                 # Static assets
```

## Architectural Patterns

### 1. Layered Server Architecture

```
API Routes (server/api/)
    ↓
Services (server/services/)
    ↓
Repositories (server/repositories/)
    ↓
Supabase Client
```

- **API Routes**: Handle HTTP requests, validate input via Zod schemas
- **Services**: Orchestrate business logic, call multiple repositories
- **Repositories**: Direct database operations, return typed data

### 2. Route Organization

Routes follow RESTful conventions with Nuxt file naming:

```
server/api/contractors/index.get.ts      → GET /api/contractors
server/api/contractors/index.post.ts     → POST /api/contractors
server/api/contractors/[id].get.ts       → GET /api/contractors/:id
server/api/contractors/[id].patch.ts     → PATCH /api/contractors/:id
server/api/contractors/[id].delete.ts    → DELETE /api/contractors/:id
```

### 3. Component Organization

```
app/components/
├── ui/                 # Public-facing components
├── admin-ui/           # shadcn components (prefix: Ui)
├── admin/              # Admin-specific components
├── contractor/         # Contractor card, list components
├── owner/              # Owner portal components
├── templates/          # Page template renderers
└── auth/               # Authentication components
```

### 4. Multi-tenant Auth Pattern

Three user types with separate flows:

| Type | Middleware | Routes | Database Table |
|------|------------|--------|----------------|
| Admin | `admin-auth.global.ts` | `/admin/**` | `account_profiles.is_admin=true` |
| Owner | `owner-auth.global.ts` | `/owner/**` | `account_profiles.account_type='contractor'` |
| Public | None | All other routes | - |

### 5. CMS & Templates System

Pages support dynamic templates via `page_templates` table:

```
page_templates
    ↓ (defines schema)
pages
    ↓ (content stored as JSON)
Template Components (app/components/templates/)
```

## Key Patterns

### Composable Naming

All composables prefixed with `use`:
- `useAdminContractors` - CRUD for contractors in admin
- `useContractorSeo` - SEO meta for contractor pages
- `usePagination` - Generic pagination logic

### Schema Co-location

Zod schemas are duplicated for client/server:
- `app/schemas/` - Client-side validation
- `server/schemas/` - Server-side validation

### Type Generation

Database types auto-generated via Supabase CLI:
- Source: `supabase gen types typescript`
- Output: `app/types/supabase.ts`

### SSR Configuration

Admin routes disable SSR for simpler hydration:
```typescript
routeRules: {
  '/admin/**': { ssr: false },
}
```

## Entry Points

| Entry | File | Purpose |
|-------|------|---------|
| App Root | `app/app.vue` | Main Vue app wrapper |
| Error Page | `app/error.vue` | Global error handler |
| Nuxt Config | `nuxt.config.ts` | Framework configuration |
| Default Layout | `app/layouts/default.vue` | Public pages |
| Admin Layout | `app/layouts/admin.vue` | Admin dashboard |
| Owner Layout | `app/layouts/owner.vue` | Owner portal |

## Build Outputs

| Command | Output | Purpose |
|---------|--------|---------|
| `pnpm dev` | Hot-reload server | Development |
| `pnpm build` | `.output/` | Production build |
| `pnpm generate` | Static HTML | Static site generation |
