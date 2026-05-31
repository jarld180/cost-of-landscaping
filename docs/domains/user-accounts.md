---
discovery_date: 2026-01-22
last_updated: 2026-01-22
cartographer_version: 1.0
---

# Domain: User Accounts

## Business Purpose

The User Accounts domain manages authentication and authorization for three distinct user types: public visitors, contractor owners, and system administrators.

## User Types

| Type | `account_type` | `is_admin` | Access |
|------|----------------|------------|--------|
| Public | - | - | Public pages, search |
| Contractor Owner | `contractor` | `false` | Own listing management |
| System Admin | `system` | `true` | Full admin access |

## Data Model

### account_profiles
Extends Supabase `auth.users`:

```
account_profiles
├── id (FK to auth.users)
├── account_type (system, contractor)
├── is_admin (boolean)
├── status (active, suspended, deleted)
└── metadata (JSONB)
```

## Authentication Flow

### Login
```
1. User visits /login
2. Submits email/password
3. supabase.auth.signInWithPassword()
4. Supabase sets session cookies (sb-*-auth-token)
5. Redirect to appropriate area
```

### Session Validation
- Server: Check for auth cookies
- Client: Call `supabase.auth.getUser()`
- Profile: Query `account_profiles` for role

## Authorization

### Route Middleware

| Middleware | Routes | Checks |
|------------|--------|--------|
| `admin-auth.global.ts` | `/admin/**` | is_admin=true, status=active |
| `owner-auth.global.ts` | `/owner/**` | account_type=contractor, owns resource |

### RLS Policies
Row Level Security enforces:
- Users can read own profile
- Admins can read all profiles
- Owners can update own contractor

## Admin Accounts

### Management
```
/admin/accounts/system         # List admins
/admin/accounts/system/invite  # Invite new admin
/admin/accounts/system/[id]    # View/edit admin
```

### Invite Flow
```
1. Admin creates invite via /admin/accounts/system/invite
2. System sends email with magic link (Resend)
3. New user clicks link, sets password
4. Account created with is_admin=true
```

## Contractor Accounts

### Management
```
/admin/accounts/contractors    # Admin view of contractor accounts
/admin/accounts/contractors/[id]  # View/edit contractor account
```

### Owner Portal
```
/owner/contractors/[id]/edit   # Contractor edits own listing
```

### Claim Flow (if implemented)
```
1. Contractor claims listing via /claim
2. Admin reviews claim
3. On approval, contractor linked to account_profiles
```

## Key Files

| File | Purpose |
|------|---------|
| `app/middleware/admin-auth.global.ts` | Admin route protection |
| `app/middleware/owner-auth.global.ts` | Owner route protection |
| `app/components/AuthSignIn.vue` | Login form |
| `app/composables/useAuthUser.ts` | Current user state |
| `server/services/EmailService.ts` | Invite emails |

## Status Lifecycle

```
active → suspended → active (reactivation)
active → deleted (soft delete)
```

| Status | Can Login | Can Access |
|--------|-----------|------------|
| active | Yes | Full access per role |
| suspended | Yes | 403 on protected routes |
| deleted | No | No access |

## Gotchas

1. **No self-registration** - Admins must be invited
2. **Contractor accounts** - Created when contractor claims listing
3. **Status check on every request** - Middleware validates status=active
4. **Supabase manages sessions** - Don't manually handle tokens

## Security Notes

- Passwords handled by Supabase Auth
- Service role bypasses RLS (admin operations only)
- Email verification optional (configurable in Supabase)
