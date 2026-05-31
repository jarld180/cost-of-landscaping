---
discovery_date: 2026-01-22
last_updated: 2026-01-22
cartographer_version: 1.0
---

# Hard Rules

These are **inviolable constraints** that all agents and developers MUST follow. Violations require explicit justification and review.

---

## DR-001: Database Migrations

**All schema changes MUST go through migrations.**

| Aspect | Requirement |
|--------|-------------|
| Path | `supabase/migrations/` |
| Naming | `YYYYMMDDHHMMSS_description.sql` |
| Creation | `supabase migration new <name>` |

### What requires a migration:
- New tables
- Column additions/removals/modifications
- Index changes
- RLS policy changes
- Function/trigger changes
- Constraint modifications

### Forbidden:
- Direct SQL execution against production
- Manual schema changes via Studio
- Migrations that drop data without explicit backup step

---

## DR-002: Type Regeneration

**After ANY migration, TypeScript types MUST be regenerated.**

```bash
supabase gen types typescript --local > app/types/supabase.ts
```

### Commit Protocol:
Migration files and updated `supabase.ts` MUST be committed together in the same commit.

---

## DR-003: Row Level Security

**All new tables MUST have RLS enabled with appropriate policies.**

```sql
-- Required in every table migration
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

-- Must define at least one policy
CREATE POLICY "..." ON new_table FOR SELECT USING (...);
```

### Minimum policies:
- Public tables: Read policy for intended audience
- Private tables: User-scoped read/write policies
- Admin tables: Admin-only access policy

---

## DR-004: API Input Validation

**All API endpoints accepting input MUST validate with Zod schemas.**

```typescript
// CORRECT
import { ContractorCreateSchema } from '~/server/schemas/contractor.schemas'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const validated = ContractorCreateSchema.parse(body)
  // Use validated data
})

// FORBIDDEN - unvalidated input
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  await repo.create(body) // NO! Unvalidated
})
```

---

## DR-005: Repository Pattern

**API routes MUST NOT call Supabase client directly for data operations.**

```typescript
// CORRECT - Use repository
const repo = new ContractorRepository(client)
const contractor = await repo.findById(id)

// FORBIDDEN - Direct client call in API route
const { data } = await client.from('contractors').select('*')
```

### Allowed exceptions:
- Auth operations (`supabase.auth.*`)
- Storage operations (`supabase.storage.*`)
- One-off queries in composables (client-side)

---

## DR-006: Service Role Usage

**Service role client MUST only be used for:**
- Admin operations that bypass RLS
- Background job execution
- Server-side operations requiring elevated privileges

```typescript
// Use serverSupabaseServiceRole only when needed
const client = await serverSupabaseServiceRole(event)

// For user-scoped operations, use user client
const client = await serverSupabaseClient(event)
```

---

## DR-007: Type Safety

**No type bypasses without inline justification.**

```typescript
// FORBIDDEN
const data = response as any
// @ts-ignore
const value = obj.prop

// ALLOWED (with justification)
// Type assertion needed: external API returns untyped data
const data = response as ExternalApiResponse
```

### Forbidden patterns:
- `as any`
- `@ts-ignore`
- `@ts-nocheck`
- `// @ts-expect-error` without explanation

---

## DR-008: Seed Data

**All seed data MUST be centralized.**

| Aspect | Requirement |
|--------|-------------|
| Path | `supabase/seed.sql` |
| Execution | `supabase db reset` |

### Forbidden:
- Seed data scattered across migration files (except initial seeds for reference tables)
- Hard-coded IDs in application code that depend on seed data

---

## DR-009: Component Naming

**shadcn/admin-ui components MUST use `Ui` prefix.**

```vue
<!-- CORRECT -->
<UiButton>Click me</UiButton>
<UiCard>Content</UiCard>

<!-- FORBIDDEN in admin -->
<Button>Click me</Button>
```

This is configured in `nuxt.config.ts`:
```typescript
shadcn: {
  prefix: 'Ui',
  componentDir: './app/components/admin-ui',
}
```

---

## DR-010: Composable Naming

**All composables MUST be prefixed with `use`.**

```typescript
// CORRECT
export function useAdminContractors() { }
export function useSearchFilters() { }

// FORBIDDEN
export function adminContractors() { }
export function getSearchFilters() { }
```

---

## DR-011: Route Protection

**Protected routes MUST use appropriate middleware.**

| Route Pattern | Required Middleware |
|---------------|---------------------|
| `/admin/**` | `admin-auth.global.ts` |
| `/owner/**` | `owner-auth.global.ts` |

New protected route patterns MUST have corresponding middleware.

---

## DR-012: Environment Variables

**Secrets MUST NOT be committed.**

| File | Can Commit | Contains |
|------|------------|----------|
| `.env.example` | Yes | Template only, no real values |
| `.env.local` | **No** | Local development secrets |
| `.env.production` | Yes | Non-secret config only |

### Server-only secrets:
These MUST only be accessed via `runtimeConfig` (not `runtimeConfig.public`):
- `SUPABASE_SERVICE_ROLE_KEY`
- `JOB_RUNNER_SECRET`
- `GOOGLE_GEOCODING_API_KEY`
- `RESEND_API_KEY`

---

## DR-013: Error Handling

**API routes MUST use H3 errors for client responses.**

```typescript
// CORRECT
throw createError({
  statusCode: 404,
  message: 'Contractor not found',
})

// FORBIDDEN - leaks implementation details
throw new Error('Database query failed: connection timeout')
```

---

## DR-014: No Direct Main Pushes

**All changes to `main` branch MUST go through pull requests.**

Exceptions:
- Emergency hotfixes (must be documented retroactively)
- Documentation-only changes

---

## Exception Process

When a hard rule must be violated:

1. **Document inline** with comment explaining why:
   ```typescript
   // HARD-RULE-EXCEPTION DR-007: External library returns untyped data
   const result = externalLib.process() as ProcessedData
   ```

2. **For significant exceptions**, create a bead/issue documenting:
   - Which rule is being violated
   - Why it's necessary
   - Plan to remediate (if applicable)

3. **PR review required** for any exception to DR-001 through DR-006

---

## Quick Reference

| Rule | One-liner |
|------|-----------|
| DR-001 | Schema changes → migrations only |
| DR-002 | Migration → regenerate types |
| DR-003 | New tables → RLS required |
| DR-004 | API input → Zod validation |
| DR-005 | Data access → use repositories |
| DR-006 | Service role → admin ops only |
| DR-007 | No `as any` without justification |
| DR-008 | Seed data → `supabase/seed.sql` |
| DR-009 | Admin components → `Ui` prefix |
| DR-010 | Composables → `use` prefix |
| DR-011 | Protected routes → middleware |
| DR-012 | Secrets → never commit |
| DR-013 | API errors → use `createError()` |
| DR-014 | Main branch → PRs only |
