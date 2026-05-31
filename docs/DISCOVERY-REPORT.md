---
discovery_date: 2026-01-22
last_updated: 2026-01-22
cartographer_version: 1.0
---

# Discovery Report

## Executive Summary

**Cost of Concrete** is a B2B directory and content management platform for concrete contractors, built on Nuxt 4 with Supabase as the backend. The application serves three user types: public visitors searching for contractors, contractor owners managing their listings, and administrators managing content and data.

### Key Statistics

| Metric | Count |
|--------|-------|
| Page Routes | ~40 |
| API Endpoints | ~50 |
| Database Tables | ~15 |
| Migrations | 27 |
| Services | 18 |
| Repositories | 16 |
| Composables | 24 |

---

## Architecture Summary

### Stack
- **Frontend:** Nuxt 4, Vue 3, TypeScript, Tailwind CSS
- **Backend:** Nitro (Nuxt server), Supabase (PostgreSQL 17)
- **UI:** shadcn-nuxt + reka-ui
- **Testing:** Vitest (unit), Playwright (E2E)

### Key Patterns
1. **Layered server architecture:** API Routes → Services → Repositories → Supabase
2. **Multi-tenant auth:** Admin, Owner, Public with route middleware
3. **CMS with templates:** Dynamic page system with JSON schemas
4. **Background jobs:** pg_cron triggered job execution

---

## Domain Model

```
┌─────────────────────────────────────────────────────────────┐
│                         CONTENT                              │
│  ┌─────────┐    ┌──────────────┐    ┌─────────────┐        │
│  │  Pages  │───▶│ PageTemplates│    │    Menus    │        │
│  └─────────┘    └──────────────┘    └──────┬──────┘        │
│                                            │                │
│                                     ┌──────▼──────┐        │
│                                     │  MenuItems  │        │
│                                     └─────────────┘        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                        DIRECTORY                             │
│  ┌─────────────┐    ┌────────┐    ┌──────────────┐         │
│  │ Contractors │───▶│ Cities │    │ ServiceTypes │         │
│  └──────┬──────┘    └────────┘    └──────────────┘         │
│         │                                                    │
│  ┌──────▼──────┐                                            │
│  │   Reviews   │                                            │
│  └─────────────┘                                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                         USERS                                │
│  ┌─────────────────┐                                        │
│  │ AccountProfiles │──── is_admin: boolean                  │
│  │                 │──── account_type: system|contractor    │
│  └─────────────────┘                                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                       OPERATIONS                             │
│  ┌───────────────┐    ┌────────────┐    ┌───────────┐      │
│  │ BackgroundJobs│    │ ImportJobs │    │SystemLogs │      │
│  └───────────────┘    └────────────┘    └───────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## Route Structure

### Public
- `/` - Homepage
- `/concrete-contractors` - Contractor search
- `/[...slug]` - CMS pages

### Admin (`/admin/**`)
- Dashboard, Pages, Menus, Contractors, Accounts, Maintenance, AI tools

### Owner (`/owner/**`)
- Contractor self-management

---

## Integration Points

| External Service | Purpose | Location |
|------------------|---------|----------|
| Supabase | Database, Auth, Storage | Core infrastructure |
| Google Geocoding | Address → coordinates | GeocodingService |
| Resend | Transactional email | EmailService |
| DataForSEO | SEO data, Labs API | DataForSeoService |
| Anthropic/OpenAI | AI extraction, content | AIExtractionService |

---

## Security Model

- **Authentication:** Supabase Auth (email/password)
- **Authorization:** Route middleware + RLS policies
- **API Protection:** Zod validation, service role segregation
- **Secrets:** Environment variables, Supabase Vault

---

## Testing Coverage

| Type | Framework | Location |
|------|-----------|----------|
| Unit | Vitest | `server/**/*.test.ts` |
| E2E | Playwright | `tests/**/*.spec.ts` |

---

## Documentation Artifacts

Created by this discovery:

| Document | Purpose |
|----------|---------|
| `docs/discovery/STACK.md` | Technology inventory |
| `docs/discovery/ARCHITECTURE.md` | System design |
| `docs/discovery/ROUTES.md` | Route documentation |
| `docs/discovery/MODULES.md` | Component catalog |
| `docs/discovery/INTERFACES.md` | Type definitions |
| `docs/discovery/PERSISTENCE.md` | Database schema |
| `docs/discovery/PATTERNS.md` | Code patterns |
| `docs/discovery/SECURITY.md` | Security model |
| `docs/discovery/CONFIG.md` | Configuration |
| `docs/discovery/OPERATIONS.md` | DevOps procedures |
| `docs/HARD-RULES.md` | Inviolable constraints |
| `docs/contracts/*.md` | Interface contracts |

---

## Recommendations

### Immediate
1. Ensure all agents read `AGENTS.md` before starting work
2. Follow hard rules strictly, especially DR-001 through DR-006

### Technical Debt (Observed)
- `app/types/supabase-new.ts` - Empty file, should be removed
- Some test directories appear sparse (`tests/jobs/`, `tests/pages/`)

### Documentation Gaps
- No API documentation (OpenAPI/Swagger)
- Domain-specific business logic not documented
- Onboarding guide for new developers

---

## Quick Start for Agents

1. Read `AGENTS.md` for workflow
2. Check `docs/HARD-RULES.md` for constraints
3. Use `docs/discovery/` for reference
4. Follow beads workflow for task management
