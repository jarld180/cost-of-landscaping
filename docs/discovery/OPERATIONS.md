---
discovery_date: 2026-01-22
last_updated: 2026-01-22
source_patterns: ["package.json", "supabase/**", "playwright/**", ".github/**"]
confidence: high
cartographer_version: 1.0
---

# Operations

## Development Workflow

### Initial Setup

```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env.local
# Fill in SUPABASE_URL, SUPABASE_KEY, etc.

# Start Supabase (requires Docker)
supabase start

# Push migrations
pnpm db:push

# Start dev server
pnpm dev
```

### Daily Development

```bash
# Start Supabase (if not running)
supabase start

# Start dev server
pnpm dev
# Available at http://localhost:3001
```

---

## NPM Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `nuxt dev --dotenv .env.local --host 0.0.0.0 --port 3001` | Development server |
| `build` | `nuxt build --dotenv .env.production` | Production build |
| `generate` | `nuxt generate --dotenv .env.production` | Static generation |
| `preview` | `nuxt preview` | Preview production build |
| `postinstall` | `nuxt prepare --dotenv .env.local` | Post-install setup |
| `db:push` | `npx supabase db push --local --include-all` | Apply migrations |
| `test:unit` | `vitest run` | Run unit tests |
| `test:unit:watch` | `vitest` | Watch mode testing |
| `test:unit:coverage` | `vitest run --coverage` | Coverage report |
| `test:e2e` | `playwright test` | E2E tests |
| `test:e2e:ui` | `playwright test --ui` | Playwright UI mode |
| `test:e2e:headed` | `playwright test --headed` | Visible browser |
| `test:e2e:debug` | `playwright test --debug` | Debug mode |
| `test:e2e:report` | `playwright show-report` | View HTML report |
| `import:zips` | `tsx scripts/import-zip-codes.ts` | Import ZIP data |

---

## Database Operations

### Migration Commands

```bash
# Create new migration
supabase migration new <migration_name>

# Apply all migrations locally
pnpm db:push

# Reset database (destructive!)
supabase db reset

# List migration status
supabase migration list

# Generate TypeScript types
supabase gen types typescript --local > app/types/supabase.ts
```

### Supabase CLI

```bash
# Start local Supabase
supabase start

# Stop local Supabase
supabase stop

# View status
supabase status

# Open Studio UI
# http://localhost:54323
```

---

## Testing

### Unit Tests (Vitest)

```bash
# Run all unit tests
pnpm test:unit

# Watch mode
pnpm test:unit:watch

# Coverage
pnpm test:unit:coverage
```

Test files: `server/**/*.test.ts`
Setup: `server/__tests__/setup.ts`

### E2E Tests (Playwright)

```bash
# Run all E2E tests
pnpm test:e2e

# Interactive UI
pnpm test:e2e:ui

# Debug mode
pnpm test:e2e:debug

# Specific browser
pnpm test:e2e --project=chromium
```

Test files: `tests/**/*.spec.ts`
Auth state: `playwright/.auth/user.json`

---

## Background Jobs

### Job Runner Architecture

1. **pg_cron** schedules job execution
2. Calls `/api/jobs/execute` on the app server
3. `JobService` processes jobs via executors
4. Results stored in `background_jobs` table

### Job Types

| Type | Executor | Purpose |
|------|----------|---------|
| `import` | ImportService | Bulk contractor import |
| `enrich-images` | ImageEnrichmentService | Scrape/process images |
| `enrich-contractor` | ContractorEnrichmentService | Data enrichment |
| `ai-article` | AIJobQueueService | AI content generation |

### Monitoring

- Admin UI: `/admin/maintenance/jobs`
- Direct query: `SELECT * FROM background_jobs ORDER BY created_at DESC`
- Logs: `system_logs` table

---

## Deployment

### Build

```bash
# Production build
pnpm build

# Output: .output/
```

### Environment Variables (Production)

Required in production environment:
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JOB_RUNNER_SECRET`
- `GOOGLE_GEOCODING_API_KEY`
- `RESEND_API_KEY`
- `NUXT_SITE_URL`

---

## Data Import

### ZIP Codes

```bash
pnpm import:zips
```

Imports ZIP code data from external source.

### Contractor Import

Via Admin UI:
1. Go to `/admin/contractors/import`
2. Upload CSV
3. Map columns
4. Process import

---

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
supabase stop
supabase start
```

**Type errors after migration:**
```bash
supabase gen types typescript --local > app/types/supabase.ts
```

**Auth not working locally:**
- Check `.env.local` has correct Supabase keys
- Verify `supabase status` shows all services running

**E2E tests failing:**
- Ensure dev server on port 3019 (Playwright config)
- Check `playwright/.auth/user.json` exists

---

## Logs & Monitoring

### Application Logs
- Dev: Console output from `pnpm dev`
- Prod: Platform-specific (Vercel, etc.)

### Database Logs
- Studio: http://localhost:54323 → Logs
- Table: `system_logs`

### Job Logs
- UI: `/admin/maintenance/jobs/:id`
- Table: `background_jobs.logs`
