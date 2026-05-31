---
discovery_date: 2026-01-22
last_updated: 2026-01-22
source_patterns: [".env*", "nuxt.config.ts", "supabase/config.toml", "*.config.*"]
confidence: high
cartographer_version: 1.0
---

# Configuration

## Environment Files

| File | Purpose | Committed |
|------|---------|-----------|
| `.env.example` | Template for developers | Yes |
| `.env.local` | Local development secrets | No |
| `.env.production` | Production build config | Yes |

### `.env.example` Structure

```bash
# Supabase
SUPABASE_URL=
SUPABASE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Background Jobs
JOB_RUNNER_SECRET=
```

---

## Nuxt Configuration

### Key Settings (`nuxt.config.ts`)

```typescript
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // Custom route hook for state slug matching
  hooks: {
    'pages:extend'(pages) { /* ... */ }
  },

  // Supabase module config
  supabase: {
    redirect: false,  // Manual auth handling
    types: '~/types/supabase.ts',
  },

  // shadcn component config
  shadcn: {
    prefix: 'Ui',
    componentDir: './app/components/admin-ui',
  },

  // Color mode
  colorMode: {
    preference: 'light',
    fallback: 'light',
  },

  // Auto-imports
  imports: {
    dirs: ['./app/lib'],
  },

  // Component registration
  components: [
    { path: '~/components/ui', pathPrefix: false },
    { path: '~/components', pathPrefix: false },
  ],

  // Route rules
  routeRules: {
    '/admin/**': { ssr: false },  // SPA mode for admin
  },
})
```

### Runtime Config

```typescript
runtimeConfig: {
  // Server-only
  googleGeocodingApiKey: process.env.GOOGLE_GEOCODING_API_KEY,
  resendApiKey: process.env.RESEND_API_KEY,
  imageAllowlist: 'lh3.googleusercontent.com,streetviewpixels-pa.googleapis.com',

  public: {
    // Client-accessible
    siteUrl: process.env.NUXT_SITE_URL || 'https://costofconcrete.com',
    siteName: process.env.NUXT_SITE_NAME || 'Cost of Concrete',
  },
}
```

---

## Supabase Configuration

### Local Development (`supabase/config.toml`)

```toml
project_id = "Cost-of-Concrete"

[db]
port = 54322
major_version = 17

[studio]
port = 54323

[api]
port = 54321
schemas = ["public", "graphql_public"]
max_rows = 1000

[inbucket]  # Email testing
port = 54324

[storage]
# Image storage buckets
```

### Ports Summary

| Service | Port |
|---------|------|
| Supabase API | 54321 |
| PostgreSQL | 54322 |
| Studio UI | 54323 |
| Inbucket (email) | 54324 |

---

## TypeScript Configuration

### `tsconfig.json`

```json
{
  "references": [
    { "path": "./.nuxt/tsconfig.app.json" },
    { "path": "./.nuxt/tsconfig.server.json" },
    { "path": "./.nuxt/tsconfig.shared.json" },
    { "path": "./.nuxt/tsconfig.node.json" }
  ]
}
```

Types are managed by Nuxt's auto-generated configs.

---

## Tailwind Configuration

### `tailwind.config.js`

Key customizations:
- Custom color palette
- Typography plugin
- Container queries plugin
- Animation utilities

---

## Testing Configuration

### Vitest (`vitest.config.ts`)

```typescript
export default defineConfig({
  test: {
    include: ['server/**/*.test.ts'],
    environment: 'node',
    globals: true,
    setupFiles: ['./server/__tests__/setup.ts'],
    coverage: {
      include: ['server/services/**', 'server/repositories/**'],
    },
  },
})
```

### Playwright (`playwright.config.ts`)

```typescript
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  use: {
    baseURL: 'http://localhost:3019',
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3019',
  },
})
```

---

## ESLint Configuration

### `eslint.config.mjs`

```javascript
import withNuxt from './.nuxt/eslint.config.mjs'
export default withNuxt()
```

Uses Nuxt's ESLint preset.

---

## Package Manager

### `pnpm-workspace.yaml`

```yaml
packages:
  - '.'
```

Single-package workspace with pnpm.

---

## VSCode Settings

### `.vscode/` (if present)

- Editor configuration
- Extension recommendations
- Debug configurations
