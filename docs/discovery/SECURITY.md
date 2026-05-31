---
discovery_date: 2026-01-22
last_updated: 2026-01-22
source_patterns: ["app/middleware/**", "supabase/migrations/**"]
confidence: high
cartographer_version: 1.0
---

# Security

## Authentication

### Provider
Supabase Auth with email/password authentication.

### Session Management
- Server: Cookie-based sessions via `@nuxtjs/supabase`
- Client: Automatic session refresh via Supabase client

### Auth Flow

1. User submits credentials to `/login`
2. `AuthSignIn` component calls `supabase.auth.signInWithPassword()`
3. Supabase sets session cookies (`sb-*-auth-token`)
4. Middleware validates cookies on protected routes

---

## Authorization

### User Types

| Type | `account_type` | `is_admin` | Access |
|------|----------------|------------|--------|
| Public | - | - | Public pages only |
| Contractor Owner | `contractor` | `false` | `/owner/**` routes |
| Admin | `system` | `true` | `/admin/**` routes |

### Route Protection

#### Admin Routes (`/admin/**`)

Protected by `app/middleware/admin-auth.global.ts`:

```typescript
// Server-side: Check for auth cookies
const hasAuthCookies = cookieNames.some(
  name => name.startsWith('sb-') && name.includes('auth-token')
)

// Client-side: Verify user and admin status
const { data } = await supabase.auth.getUser()
const { data: profile } = await supabase
  .from('account_profiles')
  .select('is_admin, status')
  .eq('id', user.id)
  .single()

if (!profile?.is_admin || profile?.status !== 'active') {
  throw createError({ statusCode: 403 })
}
```

#### Owner Routes (`/owner/**`)

Protected by `app/middleware/owner-auth.global.ts`:
- Validates user owns the contractor being accessed
- Checks `account_type === 'contractor'`

---

## Row-Level Security (RLS)

All database tables have RLS enabled.

### Pages Table

```sql
-- Public can read published pages
CREATE POLICY "Public can read published pages"
ON pages FOR SELECT
USING (status = 'published');

-- Admins have full access
CREATE POLICY "Admins have full access"
ON pages FOR ALL
USING (is_admin(auth.uid()));
```

### Contractors Table

```sql
-- Public can read active contractors
CREATE POLICY "Public can read active contractors"
ON contractors FOR SELECT
USING (status = 'active');

-- Owners can update their own contractor
CREATE POLICY "Owners can update own contractor"
ON contractors FOR UPDATE
USING (owner_id = auth.uid());
```

### Account Profiles

```sql
-- Users can read their own profile
CREATE POLICY "Users can read own profile"
ON account_profiles FOR SELECT
USING (id = auth.uid());
```

---

## API Security

### Server-Side Auth

API routes use service role for admin operations:

```typescript
import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseServiceRole(event)
  // Bypasses RLS for admin operations
})
```

### Job Runner Authentication

Background jobs authenticate via shared secret:

```typescript
// Validate job runner requests
const secret = getHeader(event, 'x-job-runner-secret')
if (secret !== config.jobRunnerSecret) {
  throw createError({ statusCode: 401 })
}
```

---

## Input Validation

All API inputs validated with Zod schemas:

```typescript
import { z } from 'zod'

export const ContractorCreateSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().optional(),
  // No arbitrary fields allowed
})

// In handler
const body = ContractorCreateSchema.parse(await readBody(event))
```

---

## Sensitive Data

### Environment Variables

| Variable | Sensitivity | Usage |
|----------|-------------|-------|
| `SUPABASE_SERVICE_ROLE_KEY` | **Critical** | Server-only, bypasses RLS |
| `JOB_RUNNER_SECRET` | **High** | Job authentication |
| `GOOGLE_GEOCODING_API_KEY` | Medium | Server-only API calls |
| `RESEND_API_KEY` | Medium | Email sending |

### Storage

- `.env.local` - Gitignored, local secrets
- `.env.production` - Minimal, non-secret config
- Supabase Vault - Production secrets

---

## Security Headers

Configure in production deployment (not in Nuxt config):
- `Content-Security-Policy`
- `X-Frame-Options`
- `X-Content-Type-Options`

---

## Common Vulnerabilities - Mitigations

| Vulnerability | Mitigation |
|---------------|------------|
| SQL Injection | Supabase client uses parameterized queries |
| XSS | Vue's default template escaping |
| CSRF | SameSite cookies via Supabase |
| Auth Bypass | Global middleware + RLS |
| Mass Assignment | Zod schema validation |
