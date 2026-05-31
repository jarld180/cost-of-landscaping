---
discovery_date: 2026-01-22
last_updated: 2026-01-22
source_patterns: ["app/middleware/**", "supabase/migrations/**"]
confidence: high
cartographer_version: 1.0
---

# Security Contract

Authentication, authorization, and data protection guarantees.

---

## Authentication

### Provider
Supabase Auth with email/password.

### Session Management
- Cookies: `sb-*-auth-token`
- Automatic refresh via Supabase client
- Server-side validation via middleware

### Login Flow
```
1. User submits credentials
2. supabase.auth.signInWithPassword()
3. Supabase sets session cookies
4. Subsequent requests include cookies
5. Middleware validates on protected routes
```

---

## Authorization Levels

| Level | Access | Middleware |
|-------|--------|------------|
| Public | Public pages, contractor search | None |
| Owner | Own contractor management | `owner-auth.global.ts` |
| Admin | Full CMS and admin access | `admin-auth.global.ts` |

### Role Determination
```typescript
// From account_profiles table
{
  account_type: 'system' | 'contractor',
  is_admin: boolean,
  status: 'active' | 'suspended' | 'deleted'
}
```

---

## Route Protection Matrix

| Route Pattern | Required Auth | Required Role |
|---------------|---------------|---------------|
| `/` | None | - |
| `/concrete-contractors/**` | None | - |
| `/[...slug]` | None | - |
| `/login` | None | - |
| `/admin/**` | Yes | is_admin=true, status=active |
| `/owner/**` | Yes | account_type=contractor |

---

## Row Level Security Policies

### pages
```sql
-- Public read for published
SELECT: status = 'published'

-- Admin full access
ALL: is_admin(auth.uid())
```

### contractors
```sql
-- Public read for active
SELECT: status = 'active'

-- Owner update own
UPDATE: owner_id = auth.uid()

-- Admin full access
ALL: is_admin(auth.uid())
```

### account_profiles
```sql
-- Read own profile
SELECT: id = auth.uid()

-- Admin read all
SELECT: is_admin(auth.uid())
```

---

## API Security

### Input Validation
All endpoints validate input with Zod:
```typescript
const validated = Schema.parse(await readBody(event))
```

### Client Types
| Client | Usage | RLS |
|--------|-------|-----|
| `serverSupabaseClient` | User-scoped operations | Enforced |
| `serverSupabaseServiceRole` | Admin operations | Bypassed |

### Service Role Usage
Only for:
- Admin data operations
- Background job execution
- Cross-user data access

---

## Secrets Management

### Never Commit
- `SUPABASE_SERVICE_ROLE_KEY`
- `JOB_RUNNER_SECRET`
- API keys for external services

### Access Pattern
```typescript
// Server-only via runtimeConfig
const config = useRuntimeConfig()
const apiKey = config.googleGeocodingApiKey // Server only

// Public config
const publicConfig = config.public.siteUrl // Client accessible
```

---

## Job Runner Security

Background jobs authenticate via shared secret:
```typescript
const secret = getHeader(event, 'x-job-runner-secret')
if (secret !== config.jobRunnerSecret) {
  throw createError({ statusCode: 401 })
}
```

---

## Storage Security

### Buckets
| Bucket | Public | Policy |
|--------|--------|--------|
| `contractor-images` | Yes | Read: public, Write: authenticated |
| `page-images` | Yes | Read: public, Write: admin |

---

## Security Invariants

1. **No unauthenticated access** to `/admin/**` or `/owner/**`
2. **No non-admin access** to admin routes
3. **Service role** never exposed to client
4. **RLS enforced** on all tables
5. **Input validated** on all API endpoints
6. **Secrets** never in client bundle or git

---

## Incident Response

If security violation detected:
1. Log to `system_logs` with level `error`
2. Block request with appropriate status code
3. Do not leak implementation details in error message
