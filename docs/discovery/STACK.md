---
discovery_date: 2026-01-22
last_updated: 2026-01-22
source_patterns: ["package.json", "nuxt.config.ts", "supabase/config.toml"]
confidence: high
cartographer_version: 1.0
---

# Technology Stack

## Core Framework

| Layer | Technology | Version |
|-------|------------|---------|
| **Frontend Framework** | Nuxt 4 | ^4.2.0 |
| **UI Framework** | Vue 3 | ^3.5.22 |
| **Language** | TypeScript | (via Nuxt) |
| **CSS** | Tailwind CSS | (via @nuxtjs/tailwindcss ^6.14.0) |

## Backend & Database

| Component | Technology | Notes |
|-----------|------------|-------|
| **Database** | Supabase (PostgreSQL 17) | Local dev via CLI |
| **ORM/Client** | @supabase/supabase-js | ^2.87.1 |
| **API Layer** | Nitro (via Nuxt) | Server routes in `server/api/` |
| **Auth** | Supabase Auth | Via @nuxtjs/supabase ^2.0.1 |
| **Storage** | Supabase Storage | Buckets for images |
| **Realtime** | Supabase Realtime | Enabled in config |

## UI Components

| Library | Purpose |
|---------|---------|
| **shadcn-nuxt** | Admin UI primitives (prefix: `Ui`) |
| **reka-ui** | Headless UI components |
| **@nuxt/icon** | Icons via Iconify |
| **@iconify-json/lucide** | Lucide icon set |
| **@iconify-json/heroicons** | Heroicons set |

## Forms & Validation

| Library | Purpose |
|---------|---------|
| **vee-validate** | Form handling |
| **@vee-validate/zod** | Zod integration |
| **zod** | Schema validation (^4.1.12) |

## Rich Text & Content

| Library | Purpose |
|---------|---------|
| **@tiptap/vue-3** | Rich text editor |
| **@tiptap/starter-kit** | Base extensions |
| **@tiptap/extension-image** | Image support |
| **@tiptap/extension-bubble-menu** | Bubble menu UI |
| **marked** | Markdown parsing |

## AI Integration

| Service | Library | Purpose |
|---------|---------|---------|
| **Anthropic** | @anthropic-ai/sdk ^0.71.2 | AI extraction, content generation |
| **OpenAI** | openai ^6.10.0 | Alternative AI provider |

## External Services

| Service | Purpose |
|---------|---------|
| **Resend** | Transactional email (^6.5.2) |
| **Google Geocoding API** | Address geocoding |
| **DataForSEO** | SEO data, labs analysis |

## Testing

| Tool | Purpose | Config |
|------|---------|--------|
| **Vitest** | Unit/integration tests | `vitest.config.ts` |
| **Playwright** | E2E tests | `playwright.config.ts` |
| **@vitest/coverage-v8** | Coverage reporting | |

## Build & Dev Tools

| Tool | Purpose |
|------|---------|
| **pnpm** | Package manager |
| **ESLint** | Linting (via @nuxt/eslint) |
| **Supabase CLI** | Local dev, migrations |

## Key Nuxt Modules

```typescript
modules: [
  '@nuxtjs/tailwindcss',    // CSS framework
  '@nuxtjs/google-fonts',   // Font loading
  '@nuxt/eslint',           // Linting
  '@nuxt/icon',             // Icons
  '@nuxt/image',            // Image optimization
  '@nuxt/scripts',          // Script loading
  '@nuxtjs/seo',            // SEO utilities
  '@vueuse/nuxt',           // Composables
  '@formkit/auto-animate',  // Animations
  'reka-ui/nuxt',           // Headless UI
  '@nuxtjs/color-mode',     // Dark/light mode
  '@nuxtjs/supabase',       // Supabase integration
  'shadcn-nuxt',            // UI components
]
```

## Environment Configuration

| File | Purpose |
|------|---------|
| `.env.local` | Local development secrets |
| `.env.production` | Production build config |
| `.env.example` | Template for new developers |

### Required Environment Variables

```bash
# Supabase
SUPABASE_URL=
SUPABASE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Background Jobs
JOB_RUNNER_SECRET=

# External APIs (server-only)
GOOGLE_GEOCODING_API_KEY=
RESEND_API_KEY=
```
