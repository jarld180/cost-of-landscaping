# PRD: Verified Badge Embed System (Completion)

## 1. Overview

### Problem Statement
Contractors who have claimed their profiles need a way to display a verified badge on their own websites. This badge serves dual purposes: (1) providing social proof to the contractor's customers and (2) creating backlinks to Cost of Concrete for SEO benefits. When the badge is served from the contractor's website, we can automatically verify their profile by detecting the referrer domain matches their registered website.

### Solution Summary
Complete the partially-implemented badge embed system by:
1. Hardening logging (atomic dedup + retention + reduced PII via origin-only referrer storage)
2. Correct domain matching (PSL-backed via `tldts` for security)
3. Improving embed UX (linked + responsive + lazy-loading + UTM attribution)
4. Adding PNG support via prebuilt static assets (no runtime generation)

**Note:** "Verification" here means website ownership association - we detected the badge being served from the contractor's registered domain.

### Target Users
- **Contractors** who have claimed their business profiles and want to display verification on their websites
- **Admins** who review verification status and badge analytics

---

## 2. Current Implementation State

### Existing Files

| File | Purpose | Status |
|------|---------|--------|
| `/server/api/public/badges/[token].svg.get.ts` | Badge SVG endpoint | Exists, needs modification |
| `/server/utils/badge.ts` | SVG generation functions | Exists, needs modification |
| `/server/utils/clientIP.ts` | Client IP extraction | Exists, reuse as-is |
| `/app/pages/owner/index.vue` | Owner portal with badge embed UI | Exists, needs modification |
| `/supabase/migrations/20260105085717_add_embed_token_to_contractors.sql` | Adds embed columns | Exists |
| `/supabase/migrations/20260107021600_create_badge_embed_logs.sql` | Creates logs table | Exists |

### Existing Database Schema

**contractors table** (columns added by migration `20260105085717`):
```sql
embed_token UUID UNIQUE           -- Badge URL identifier
embed_verified BOOLEAN DEFAULT FALSE  -- Has badge been served from external site?
embed_verified_at TIMESTAMPTZ     -- When verification occurred
embed_verified_domain TEXT        -- Domain that triggered verification
```

**badge_embed_logs table** (created by migration `20260107021600`):
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE
request_ip TEXT NOT NULL
referrer_url TEXT
user_agent TEXT
created_at TIMESTAMPTZ DEFAULT NOW()
```

### Current Badge Endpoint Logic (`/server/api/public/badges/[token].svg.get.ts`)
1. Validates token is UUID format
2. Looks up contractor by `embed_token`
3. Logs request (IP, referrer, user-agent) to `badge_embed_logs` - **NO deduplication**
4. If `!embed_verified && referrer` is external (not costofconcrete.com), auto-verifies - **NO domain matching**
5. Returns SVG badge

### Current Embed Code in Owner Portal
```typescript
// Current implementation in /app/pages/owner/index.vue lines 62-68
function getBadgeUrl(embedToken: string): string {
  return `https://costofconcrete.com/api/public/badges/${embedToken}.svg`
}

function getBadgeHtml(embedToken: string): string {
  return `<img src="${getBadgeUrl(embedToken)}" alt="Verified Contractor on Cost of Concrete" width="200" height="40" />`
}
```
**Problems**: No link wrapper, no responsive styling, no backlink value, hardcoded production URL.

### Known Issue: TypeScript Types Out of Date
The `app/types/supabase.ts` file does NOT include:
- `embed_token`, `embed_verified`, `embed_verified_at`, `embed_verified_domain` columns on contractors
- `badge_embed_logs` table types

**Action Required**: Run `npx supabase gen types typescript --local > app/types/supabase.ts` after any schema work.

---

## 3. Architecture Notes

### 3.1 Shared Badge Request Handler

To prevent logic drift between SVG and PNG endpoints, centralize token lookup, logging, and verification into a shared server utility.

**New file:** `/server/utils/badgeRequest.ts`

**Responsibilities:**
- Validate/normalize token (UUID format)
- Fetch contractor by embed_token (id + website + embed_verified fields)
- Perform atomic logging with DB-enforced deduplication
- Perform verification update with domain matching
- Return structured result for endpoints to choose response format

**Why:** Without this, SVG and PNG endpoints will duplicate ~80 lines of logic and inevitably drift apart when bugs are fixed in one but not the other.

### 3.2 Configuration-Driven Constants

Move hardcoded values to runtime config:

```typescript
// nuxt.config.ts
runtimeConfig: {
  public: {
    siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3001',
  },
  // Server-only
  badgeOurDomains: ['costofconcrete.com', 'www.costofconcrete.com', 'localhost'],
}
```

**Why:** Hardcoding `costofconcrete.com` breaks staging/dev environments and makes testing difficult.

---

## 4. User Stories

### US-001: Atomic IP-Based Deduplication for Badge Logs

**Description:** As a system, I want to only log unique IP addresses per contractor per hour using atomic DB operations so that logging is race-condition-free and the badge_embed_logs table growth is bounded.

**Layer:** infrastructure + backend

**Files to Modify:**
1. `/supabase/migrations/[timestamp]_update_badge_logs_schema.sql` (NEW)
2. `/server/utils/badgeRequest.ts` (NEW - shared handler)
3. `/server/api/public/badges/[token].svg.get.ts` (MODIFY - use shared handler)

**Acceptance Criteria:**
- [ ] Add `referrer_origin` column (stores scheme+host only, not full URL path)
- [ ] Add `hour_bucket` column for dedup grouping
- [ ] Create unique index on `(contractor_id, request_ip, hour_bucket)` for atomic dedup
- [ ] Logging uses single upsert with `ON CONFLICT DO NOTHING` (no read-before-write)
- [ ] Badge always serves regardless of logging outcome (non-blocking)
- [ ] Typecheck passes: `pnpm run build`
- [ ] Lint passes: `pnpm run lint`

**Database Migration:**
```sql
-- File: /supabase/migrations/[YYYYMMDDHHMMSS]_update_badge_logs_schema.sql

-- 1) Add referrer_origin (stores scheme+host only, reduces PII)
ALTER TABLE badge_embed_logs
  ADD COLUMN IF NOT EXISTS referrer_origin TEXT;

-- 2) Add hour_bucket for dedup grouping (computed at insert time)
ALTER TABLE badge_embed_logs
  ADD COLUMN IF NOT EXISTS hour_bucket TIMESTAMP;

-- 3) Unique constraint for atomic hourly dedup (avoids SELECT-then-INSERT race)
-- Uses partial index to only apply when hour_bucket is set (new code path)
CREATE UNIQUE INDEX IF NOT EXISTS idx_badge_embed_logs_hourly_unique
  ON badge_embed_logs(contractor_id, request_ip, hour_bucket)
  WHERE hour_bucket IS NOT NULL;

COMMENT ON INDEX idx_badge_embed_logs_hourly_unique IS 'Atomic hourly IP dedup for badge logging';

-- 4) Query helper for analytics by contractor/time
CREATE INDEX IF NOT EXISTS idx_badge_embed_logs_contractor_time
  ON badge_embed_logs(contractor_id, created_at DESC);
```

**Shared Handler Implementation:**

Create `/server/utils/badgeRequest.ts`:
```typescript
/**
 * Shared Badge Request Handler
 *
 * Centralizes token lookup, logging, and verification logic
 * used by both SVG and PNG badge endpoints.
 */

import { consola } from 'consola'
import type { H3Event } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/supabase'
import { getClientIP } from './clientIP'
import { extractRootDomain, doDomainsMatch } from './domain'

// UUID regex for validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface BadgeRequestResult {
  valid: boolean
  contractorId?: string
}

/**
 * Extract origin (scheme + host) from a URL, discarding path/query.
 * Returns null if URL is invalid.
 */
export function extractOrigin(url: string): string | null {
  try {
    const parsed = new URL(url)
    return parsed.origin
  } catch {
    return null
  }
}

/**
 * Process a badge request: validate token, lookup contractor, log request, handle verification.
 * Returns whether the request is valid (contractor found).
 */
export async function processBadgeRequest(
  event: H3Event,
  token: string,
  adminClient: SupabaseClient<Database>
): Promise<BadgeRequestResult> {
  // Validate token format
  if (!token || !UUID_REGEX.test(token)) {
    return { valid: false }
  }

  // Get our domains from config
  const config = useRuntimeConfig()
  const ourDomains: string[] = config.badgeOurDomains || ['costofconcrete.com', 'www.costofconcrete.com', 'localhost']

  // Look up contractor by embed_token
  const { data: contractor, error: lookupError } = await adminClient
    .from('contractors')
    .select('id, embed_verified, embed_verified_at, website')
    .eq('embed_token', token)
    .maybeSingle()

  if (lookupError) {
    consola.error('[badge] Database error:', lookupError.message)
    return { valid: false }
  }

  if (!contractor) {
    return { valid: false }
  }

  // Extract request metadata
  const clientIP = getClientIP(event)
  const referrer = getHeader(event, 'referer') || getHeader(event, 'referrer') || null
  const userAgent = getHeader(event, 'user-agent') || null
  const referrerOrigin = referrer ? extractOrigin(referrer) : null

  // Compute hour bucket for dedup (truncate to hour in UTC)
  const now = new Date()
  const hourBucket = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours(),
    0, 0, 0
  )).toISOString()

  // Atomic logging with DB-enforced dedup (async, non-blocking)
  // Uses upsert with ON CONFLICT DO NOTHING - no race conditions
  ;(async () => {
    try {
      const { error } = await adminClient
        .from('badge_embed_logs')
        .upsert(
          {
            contractor_id: contractor.id,
            request_ip: clientIP,
            referrer_origin: referrerOrigin,
            referrer_url: referrer, // Keep for backwards compat, will deprecate
            user_agent: userAgent,
            hour_bucket: hourBucket,
          },
          {
            onConflict: 'contractor_id,request_ip,hour_bucket',
            ignoreDuplicates: true,
          }
        )

      if (error) {
        consola.error('[badge] Failed to log embed request:', error.message)
      }
    } catch (err) {
      consola.error('[badge] Error in badge logging:', err)
    }
  })()

  // Auto-verification logic
  if (!contractor.embed_verified && referrer) {
    try {
      const referrerUrl = new URL(referrer)
      const referrerDomain = referrerUrl.hostname.toLowerCase()

      // Check if referrer is external (not our domain)
      const isExternal = !ourDomains.some(
        domain => referrerDomain === domain || referrerDomain.endsWith(`.${domain}`)
      )

      if (isExternal) {
        let shouldVerify = false

        if (contractor.website) {
          // Contractor has a website - only verify if referrer matches
          shouldVerify = doDomainsMatch(referrer, contractor.website)
          if (!shouldVerify) {
            consola.debug(`[badge] Referrer ${referrerDomain} does not match contractor website ${contractor.website}`)
          }
        } else {
          // Contractor has no website - verify on any external referrer (legacy behavior)
          shouldVerify = true
          consola.debug(`[badge] No website set for contractor, verifying on external referrer: ${referrerDomain}`)
        }

        if (shouldVerify) {
          const verifiedDomain = extractRootDomain(referrer) || referrerDomain
          const { error: verifyError } = await adminClient
            .from('contractors')
            .update({
              embed_verified: true,
              embed_verified_at: new Date().toISOString(),
              embed_verified_domain: verifiedDomain,
            })
            .eq('id', contractor.id)
            .is('embed_verified', false)

          if (verifyError) {
            consola.error('[badge] Failed to auto-verify contractor:', verifyError.message)
          } else {
            consola.info(`[badge] Auto-verified contractor ${contractor.id} from domain: ${verifiedDomain}`)
          }
        }
      }
    } catch {
      // Invalid referrer URL, ignore
    }
  }

  return { valid: true, contractorId: contractor.id }
}
```

**Testing Requirements:**
- Unit test file: `/server/__tests__/utils/badgeRequest.test.ts` (NEW)
- Test cases:
  1. First request from IP creates log entry
  2. Second request from same IP within same hour bucket does NOT create duplicate (DB constraint)
  3. Request from same IP in next hour bucket DOES create new log entry
  4. Request from different IP creates separate log entry
  5. Badge request result always returned regardless of logging outcome
  6. `extractOrigin` correctly strips path/query from URLs

**Technical Notes:**
- The IIFE pattern `(async () => { ... })()` preserves non-blocking behavior
- DB-enforced dedup via unique index eliminates race conditions
- Storing `referrer_origin` instead of full URL reduces PII exposure and storage
- Keep `referrer_url` for backwards compatibility during migration period

---

### US-002: PSL-Backed Root Domain Matching for Auto-Verification

**Description:** As a contractor, I want the system to auto-verify my badge only when it's served from my registered website domain (or subdomain) so that verification is meaningful and secure against false matches.

**Layer:** backend

**Files to Create/Modify:**
1. `/server/utils/domain.ts` (NEW)
2. `/server/__tests__/utils/domain.test.ts` (NEW)
3. `package.json` (MODIFY - add tldts dependency)

**Acceptance Criteria:**
- [ ] Create `extractRootDomain(url: string): string | null` utility using `tldts` package
- [ ] Function correctly handles multi-part TLDs: `example.co.uk` → `example.co.uk`
- [ ] Function correctly handles PSL private domains: `mybiz.github.io` → `mybiz.github.io`
- [ ] Function handles missing protocol: `blog.example.com` → `example.com`
- [ ] Function handles www prefix: `www.example.com` → `example.com`
- [ ] Function handles subdomains: `app.staging.example.com` → `example.com`
- [ ] Function returns null for invalid URLs
- [ ] **NEW:** When contractor changes their `website` field, reset `embed_verified` to false
- [ ] Typecheck passes: `pnpm run build`
- [ ] Lint passes: `pnpm run lint`

**Package Installation:**
```bash
pnpm add tldts
```

**New Utility File:**
```typescript
// File: /server/utils/domain.ts

/**
 * Domain Extraction Utility
 *
 * Extracts the registrable domain from a URL or hostname using the
 * Public Suffix List (PSL) via tldts. This correctly handles:
 * - Multi-part TLDs (co.uk, com.au)
 * - Private/hosted domains (github.io, vercel.app)
 *
 * Used for matching badge referrer domains to contractor websites.
 */

import { parse } from 'tldts'

/**
 * Extract registrable domain from a URL or hostname.
 *
 * Uses PSL-backed parsing for correctness on multi-part TLDs and private domains.
 *
 * @example
 * extractRootDomain('https://www.blog.example.com/page?q=1') // 'example.com'
 * extractRootDomain('https://foo.bar.example.co.uk') // 'example.co.uk'
 * extractRootDomain('mybiz.github.io') // 'mybiz.github.io' (private domain)
 * extractRootDomain('blog.example.com') // 'example.com'
 * extractRootDomain('localhost') // 'localhost'
 * extractRootDomain('not a url') // null
 */
export function extractRootDomain(urlOrHostname: string): string | null {
  if (!urlOrHostname || typeof urlOrHostname !== 'string') {
    return null
  }

  const input = urlOrHostname.trim()
  if (!input) {
    return null
  }

  // Fast-path localhost (tldts marks it as invalid)
  if (
    input === 'localhost' ||
    input.startsWith('localhost:') ||
    input.startsWith('http://localhost') ||
    input.startsWith('https://localhost')
  ) {
    return 'localhost'
  }

  // Use PSL-backed parsing (allowPrivateDomains handles github.io, vercel.app, etc.)
  const result = parse(input, { allowPrivateDomains: true })

  if (!result || result.hostname === null) {
    return null
  }

  const hostname = result.hostname.toLowerCase()

  // Handle IP addresses (don't extract root)
  if (result.isIp) {
    return hostname
  }

  // Return the registrable domain if available
  if (result.domain) {
    return result.domain.toLowerCase()
  }

  // Fallback to hostname for edge cases
  return hostname
}

/**
 * Check if two domains match by comparing their registrable (root) domains.
 *
 * @example
 * doDomainsMatch('blog.example.com', 'https://www.example.com/page') // true
 * doDomainsMatch('other.com', 'example.com') // false
 * doDomainsMatch('foo.github.io', 'bar.github.io') // false (different private domains)
 */
export function doDomainsMatch(domain1: string, domain2: string): boolean {
  const root1 = extractRootDomain(domain1)
  const root2 = extractRootDomain(domain2)

  if (!root1 || !root2) {
    return false
  }

  return root1 === root2
}
```

**Unit Tests:**
```typescript
// File: /server/__tests__/utils/domain.test.ts

import { describe, it, expect } from 'vitest'
import { extractRootDomain, doDomainsMatch } from '../../utils/domain'

describe('domain utilities', () => {
  describe('extractRootDomain', () => {
    it('should extract root domain from full URL with protocol', () => {
      expect(extractRootDomain('https://www.example.com/page?q=1')).toBe('example.com')
      expect(extractRootDomain('http://blog.example.com')).toBe('example.com')
    })

    it('should extract root domain from URL with subdomain', () => {
      expect(extractRootDomain('https://blog.example.com')).toBe('example.com')
      expect(extractRootDomain('https://app.staging.example.com')).toBe('example.com')
    })

    it('should handle www prefix', () => {
      expect(extractRootDomain('https://www.example.com')).toBe('example.com')
      expect(extractRootDomain('www.example.com')).toBe('example.com')
    })

    it('should handle bare domain', () => {
      expect(extractRootDomain('example.com')).toBe('example.com')
    })

    it('should handle hostname without protocol', () => {
      expect(extractRootDomain('blog.example.com/page')).toBe('example.com')
    })

    it('should handle localhost', () => {
      expect(extractRootDomain('localhost')).toBe('localhost')
      expect(extractRootDomain('http://localhost:3000')).toBe('localhost')
    })

    it('should handle IP addresses', () => {
      expect(extractRootDomain('192.168.1.1')).toBe('192.168.1.1')
      expect(extractRootDomain('http://192.168.1.1:8080')).toBe('192.168.1.1')
    })

    it('should handle multi-part TLDs correctly', () => {
      expect(extractRootDomain('https://foo.bar.example.co.uk')).toBe('example.co.uk')
      expect(extractRootDomain('https://www.example.com.au')).toBe('example.com.au')
      expect(extractRootDomain('shop.example.co.nz')).toBe('example.co.nz')
    })

    it('should handle PSL private domains correctly', () => {
      // github.io is a private suffix - mybiz.github.io is the registrable domain
      expect(extractRootDomain('mybiz.github.io')).toBe('mybiz.github.io')
      expect(extractRootDomain('https://mybiz.github.io/page')).toBe('mybiz.github.io')
      // Different users on github.io should NOT match each other
      expect(extractRootDomain('otherbiz.github.io')).toBe('otherbiz.github.io')
    })

    it('should return null for invalid input', () => {
      expect(extractRootDomain('')).toBe(null)
      expect(extractRootDomain('not a url at all')).toBe(null)
      expect(extractRootDomain(null as any)).toBe(null)
      expect(extractRootDomain(undefined as any)).toBe(null)
    })
  })

  describe('doDomainsMatch', () => {
    it('should match same root domains', () => {
      expect(doDomainsMatch('blog.example.com', 'www.example.com')).toBe(true)
      expect(doDomainsMatch('https://example.com', 'http://example.com')).toBe(true)
    })

    it('should not match different domains', () => {
      expect(doDomainsMatch('example.com', 'other.com')).toBe(false)
      expect(doDomainsMatch('example.com', 'example.org')).toBe(false)
    })

    it('should handle subdomain to full URL comparison', () => {
      expect(doDomainsMatch('blog.example.com', 'https://www.example.com/page')).toBe(true)
    })

    it('should not match different private domains on same suffix', () => {
      // Security: Two github.io sites should NOT match each other
      expect(doDomainsMatch('mybiz.github.io', 'otherbiz.github.io')).toBe(false)
    })

    it('should match same private domain', () => {
      expect(doDomainsMatch('mybiz.github.io', 'https://mybiz.github.io/page')).toBe(true)
    })

    it('should return false for invalid inputs', () => {
      expect(doDomainsMatch('', 'example.com')).toBe(false)
      expect(doDomainsMatch('example.com', '')).toBe(false)
    })
  })
})
```

**Reset Verification on Website Change:**

Add database trigger or application logic:

Option A - Database Trigger (recommended):
```sql
-- File: /supabase/migrations/[YYYYMMDDHHMMSS]_reset_embed_verified_on_website_change.sql

-- Reset embed_verified when contractor changes their website
CREATE OR REPLACE FUNCTION reset_embed_verified_on_website_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.website IS DISTINCT FROM NEW.website THEN
    NEW.embed_verified := false;
    NEW.embed_verified_at := NULL;
    NEW.embed_verified_domain := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reset_embed_verified_on_website_change
  BEFORE UPDATE ON contractors
  FOR EACH ROW
  EXECUTE FUNCTION reset_embed_verified_on_website_change();

COMMENT ON TRIGGER trg_reset_embed_verified_on_website_change ON contractors
  IS 'Resets embed verification when contractor website changes';
```

**Testing Requirements:**
- Unit test: Domain extraction with various URL formats including multi-part TLDs
- Unit test: Private domain handling (github.io users should NOT match each other)
- Integration test: Website change resets verification

---

### US-003: Linked Responsive Embed Code with Attribution

**Description:** As a contractor, I want embed code that creates a clickable badge linking to my profile with responsive styling, lazy loading, and referrer policy optimized for verification, so I can copy-paste it directly into my website.

**Layer:** frontend

**Files to Modify:**
1. `/app/pages/owner/index.vue` (MODIFY)
2. `/nuxt.config.ts` (MODIFY - add public.siteUrl)

**Acceptance Criteria:**
- [ ] Embed code wraps `<img>` in `<a>` tag linking to contractor's full profile URL
- [ ] Link includes `rel="noopener"` and `target="_blank"` attributes
- [ ] Link includes UTM parameters for attribution tracking
- [ ] `<img>` includes `referrerpolicy="origin"` to improve verification on strict sites
- [ ] `<img>` includes `loading="lazy"` and `decoding="async"` for performance
- [ ] Image has inline responsive styles for mobile compatibility
- [ ] Alt text: "Verified on Cost of Concrete" (accurate wording)
- [ ] Badge URL uses runtime config (not hardcoded production URL)
- [ ] Both SVG and PNG URL options shown
- [ ] Typecheck passes: `pnpm run build`
- [ ] Lint passes: `pnpm run lint`
- [ ] Verify visually in browser at http://localhost:3001/owner

**Config Update:**

Add to `/nuxt.config.ts`:
```typescript
runtimeConfig: {
  // Server-only
  badgeOurDomains: ['costofconcrete.com', 'www.costofconcrete.com', 'localhost'],

  public: {
    siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3001',
  },
},
```

**Implementation:**

Modify `/app/pages/owner/index.vue`:

1. Update `getBadgeUrl` function:
```typescript
// Support both SVG and PNG formats, use runtime config for base URL
function getBadgeUrl(embedToken: string, format: 'svg' | 'png' = 'svg'): string {
  const config = useRuntimeConfig()
  const baseUrl = config.public.siteUrl
  return `${baseUrl}/api/public/badges/${embedToken}.${format}`
}
```

2. Update `getProfileUrl` to support UTM params:
```typescript
function getProfileUrl(contractor: Contractor, withUtm = false): string {
  if (!contractor.city) return '#'
  const baseUrl = useRuntimeConfig().public.siteUrl
  const path = `/${contractor.city.stateCode.toLowerCase()}/${contractor.city.slug}/${contractor.slug}`
  const url = `${baseUrl}${path}`

  if (withUtm) {
    return `${url}?utm_source=verified_badge&utm_medium=embed&utm_campaign=badge`
  }
  return url
}
```

3. Replace `getBadgeHtml` function:
```typescript
/**
 * Generate responsive, SEO-friendly embed code with backlink and attribution.
 *
 * Includes:
 * - UTM parameters for traffic attribution
 * - referrerpolicy="origin" to improve verification success on strict sites
 * - loading="lazy" and decoding="async" for performance
 * - Inline responsive styles that work without external CSS
 */
function getBadgeHtml(embedToken: string, profileUrl: string, format: 'svg' | 'png' = 'svg'): string {
  const badgeUrl = getBadgeUrl(embedToken, format)
  const trackedProfileUrl = `${profileUrl}?utm_source=verified_badge&utm_medium=embed&utm_campaign=badge`

  return `<a href="${trackedProfileUrl}" target="_blank" rel="noopener" style="display:inline-block;text-decoration:none;">
  <img
    src="${badgeUrl}"
    alt="Verified on Cost of Concrete"
    width="200"
    height="75"
    loading="lazy"
    decoding="async"
    referrerpolicy="origin"
    style="max-width:100%;height:auto;display:block;border:0;"
  />
</a>`
}
```

4. Update template section - Badge Preview and Embed Options:
```vue
<!-- Expanded Badge Section -->
<div v-if="expandedBadgeSections.has(contractor.id)" class="mt-4 space-y-4">
  <!-- Show message if no embed token -->
  <div v-if="!contractor.embedToken" class="rounded-md bg-yellow-50 p-3 dark:bg-yellow-900/20">
    <p class="text-xs text-yellow-700 dark:text-yellow-400">
      Badge embed is not yet available for this business. Please contact support if you need assistance.
    </p>
  </div>

  <!-- Badge content when token is available -->
  <template v-else>
    <!-- Badge Preview -->
    <div class="flex items-center gap-4">
      <a :href="getProfileUrl(contractor, true)" target="_blank" rel="noopener" class="inline-block">
        <img
          :src="getBadgeUrl(contractor.embedToken, 'svg')"
          alt="Verified on Cost of Concrete"
          class="h-[75px] w-[200px]"
          loading="lazy"
        />
      </a>
      <span class="text-xs text-neutral-500 dark:text-neutral-400">Badge preview (click to test link)</span>
    </div>

    <!-- HTML Embed Code (Recommended) -->
    <div>
      <label class="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
        HTML Embed Code (Recommended)
      </label>
      <div class="relative">
        <pre class="rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-xs font-mono text-neutral-700 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-300 overflow-x-auto whitespace-pre-wrap break-all">{{ getBadgeHtml(contractor.embedToken, getProfileUrl(contractor), 'svg') }}</pre>
        <button
          type="button"
          class="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md bg-orange-500 px-2 py-1 text-xs font-medium text-white hover:bg-orange-600 transition-colors"
          @click="copyToClipboard(getBadgeHtml(contractor.embedToken!, getProfileUrl(contractor), 'svg'), contractor.id, 'html')"
        >
          <Icon
            :name="copiedType === 'html' && copiedContractorId === contractor.id ? 'heroicons:check' : 'heroicons:clipboard'"
            class="h-3 w-3"
          />
          {{ copiedType === 'html' && copiedContractorId === contractor.id ? 'Copied!' : 'Copy' }}
        </button>
      </div>
    </div>

    <!-- Image URL Only (Alternative) -->
    <div>
      <label class="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
        Image URL Only (SVG)
      </label>
      <div class="flex gap-2">
        <input
          type="text"
          readonly
          :value="getBadgeUrl(contractor.embedToken, 'svg')"
          class="flex-1 rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-xs font-mono text-neutral-700 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-300"
        />
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-md bg-neutral-200 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-300 transition-colors dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600"
          @click="copyToClipboard(getBadgeUrl(contractor.embedToken!, 'svg'), contractor.id, 'svg')"
        >
          <Icon
            :name="copiedType === 'svg' && copiedContractorId === contractor.id ? 'heroicons:check' : 'heroicons:clipboard'"
            class="h-4 w-4"
          />
          {{ copiedType === 'svg' && copiedContractorId === contractor.id ? 'Copied!' : 'Copy' }}
        </button>
      </div>
    </div>

    <!-- PNG URL (Alternative for platforms that block SVG) -->
    <div>
      <label class="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
        Image URL (PNG) - Use if SVG is blocked
      </label>
      <div class="flex gap-2">
        <input
          type="text"
          readonly
          :value="getBadgeUrl(contractor.embedToken, 'png')"
          class="flex-1 rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-xs font-mono text-neutral-700 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-300"
        />
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-md bg-neutral-200 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-300 transition-colors dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600"
          @click="copyToClipboard(getBadgeUrl(contractor.embedToken!, 'png'), contractor.id, 'png')"
        >
          <Icon
            :name="copiedType === 'png' && copiedContractorId === contractor.id ? 'heroicons:check' : 'heroicons:clipboard'"
            class="h-4 w-4"
          />
          {{ copiedType === 'png' && copiedContractorId === contractor.id ? 'Copied!' : 'Copy' }}
        </button>
      </div>
    </div>

    <!-- Instructions -->
    <div class="rounded-md bg-blue-50 p-3 dark:bg-blue-900/20">
      <h4 class="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-2">
        Add this badge to your website
      </h4>
      <ol class="space-y-1 text-xs text-blue-700 dark:text-blue-400 list-decimal list-inside">
        <li>Copy the HTML embed code above (recommended for SEO benefits)</li>
        <li>Paste it into your website's HTML where you want the badge to appear</li>
        <li>The badge will link back to your verified profile on Cost of Concrete</li>
        <li>Once we detect the badge on your site, your profile will be marked as verified</li>
      </ol>
    </div>
  </template>
</div>
```

5. Update script section refs and copy function:
```typescript
// Badge embed functionality
const { copy } = useClipboard()
const copiedContractorId = ref<string | null>(null)
const copiedType = ref<'html' | 'svg' | 'png' | null>(null)

async function copyToClipboard(text: string, contractorId: string, type: 'html' | 'svg' | 'png') {
  await copy(text)
  copiedContractorId.value = contractorId
  copiedType.value = type
  setTimeout(() => {
    if (copiedContractorId.value === contractorId) {
      copiedContractorId.value = null
      copiedType.value = null
    }
  }, 2000)
}
```

**Testing Requirements:**
- Manual E2E test: Navigate to /owner, expand badge section, verify:
  1. Badge preview displays and links to correct profile URL with UTM params
  2. HTML embed code includes all attributes (referrerpolicy, loading, decoding, UTM)
  3. Copy buttons work for all three options
  4. URLs use configured siteUrl, not hardcoded production

---

### US-004: PNG Badge Endpoint with Prebuilt Assets

**Description:** As a contractor, I want a PNG version of the badge available so it works on platforms that filter or block SVG files. The PNG is served from prebuilt assets for simplicity and performance.

**Layer:** backend

**Files to Create/Modify:**
1. `/server/api/public/badges/[token].png.get.ts` (NEW)
2. `/server/utils/badgeAssets.ts` (NEW)
3. `/server/assets/badges/verified.png` (NEW - prebuilt asset)
4. `/server/assets/badges/placeholder.png` (NEW - prebuilt asset)
5. `/server/utils/badge.ts` (MODIFY - update dimensions in SVG)

**Acceptance Criteria:**
- [ ] Create endpoint at `/api/public/badges/[token].png`
- [ ] Returns PNG image with `Content-Type: image/png`
- [ ] PNG served from prebuilt static assets (no runtime image processing)
- [ ] Reuses shared `processBadgeRequest` for logging/verification
- [ ] Badge dimensions: 200x75px
- [ ] Placeholder badge returned for invalid tokens
- [ ] Add security headers: `X-Content-Type-Options: nosniff`
- [ ] Typecheck passes: `pnpm run build`
- [ ] Lint passes: `pnpm run lint`

**Asset Generation (Build-time):**

Generate PNGs once from SVG design and commit to repo:
```bash
# Using Inkscape, ImageMagick, or design tool - run once
inkscape --export-type=png --export-width=200 --export-height=75 \
  server/assets/badges/verified.svg -o server/assets/badges/verified.png

inkscape --export-type=png --export-width=200 --export-height=75 \
  server/assets/badges/placeholder.svg -o server/assets/badges/placeholder.png
```

Or create a build script that generates from SVG strings at build time.

**Asset Loader Utility:**
```typescript
// File: /server/utils/badgeAssets.ts

/**
 * Badge Asset Loader
 *
 * Serves prebuilt PNG badge assets for maximum performance.
 * Assets are loaded once and cached in memory.
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

// In-memory cache for badge assets
let verifiedPng: Buffer | null = null
let placeholderPng: Buffer | null = null

/**
 * Load a prebuilt PNG badge asset.
 * Assets are cached in memory after first load.
 */
export async function loadBadgePng(kind: 'verified' | 'placeholder'): Promise<Buffer> {
  if (kind === 'verified') {
    if (!verifiedPng) {
      verifiedPng = await readFile(
        join(process.cwd(), 'server/assets/badges/verified.png')
      )
    }
    return verifiedPng
  }

  if (!placeholderPng) {
    placeholderPng = await readFile(
      join(process.cwd(), 'server/assets/badges/placeholder.png')
    )
  }
  return placeholderPng
}
```

**PNG Endpoint Implementation:**
```typescript
// File: /server/api/public/badges/[token].png.get.ts

/**
 * GET /api/public/badges/[token].png
 *
 * Serves verified contractor badge as PNG and logs the request.
 * Uses shared handler for logging/verification, serves prebuilt PNG assets.
 */

import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/supabase'
import { processBadgeRequest } from '../../../utils/badgeRequest'
import { loadBadgePng } from '../../../utils/badgeAssets'

export default defineEventHandler(async (event) => {
  // Extract token from route param (remove .png suffix if present)
  const rawToken = getRouterParam(event, 'token') || ''
  const token = rawToken.replace(/\.png$/i, '')

  // Set response headers
  setHeader(event, 'Content-Type', 'image/png')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  setHeader(event, 'Cache-Control', 'public, max-age=300')

  // Get admin client for database operations
  const adminClient = serverSupabaseServiceRole<Database>(event)

  // Use shared handler for token validation, logging, and verification
  const result = await processBadgeRequest(event, token, adminClient)

  // Return appropriate PNG
  if (result.valid) {
    return loadBadgePng('verified')
  }
  return loadBadgePng('placeholder')
})
```

**Update SVG Endpoint to Use Shared Handler:**
```typescript
// File: /server/api/public/badges/[token].svg.get.ts (updated)

import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/supabase'
import { processBadgeRequest } from '../../../utils/badgeRequest'
import { generateBadgeSVG, generatePlaceholderBadgeSVG } from '../../../utils/badge'

export default defineEventHandler(async (event) => {
  const rawToken = getRouterParam(event, 'token') || ''
  const token = rawToken.replace(/\.svg$/i, '')

  // Set response headers
  setHeader(event, 'Content-Type', 'image/svg+xml; charset=utf-8')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  setHeader(event, 'Cache-Control', 'public, max-age=300')

  const adminClient = serverSupabaseServiceRole<Database>(event)
  const result = await processBadgeRequest(event, token, adminClient)

  if (result.valid) {
    return generateBadgeSVG()
  }
  return generatePlaceholderBadgeSVG()
})
```

**Testing Requirements:**
- Integration test: `/server/__tests__/api/badges/png-endpoint.test.ts` (NEW)
- Test cases:
  1. Valid token returns PNG with correct Content-Type
  2. Invalid token returns placeholder PNG
  3. Security headers present (nosniff)
  4. Tracking log is created via shared handler

---

### US-005: Updated Badge Design

**Description:** As a contractor, I want a professional badge design (200x75px) that includes the Cost of Concrete branding so it looks credible on my website.

**Layer:** backend

**Files to Modify:**
- `/server/utils/badge.ts` (MODIFY)

**Acceptance Criteria:**
- [ ] Badge size: 200x75px
- [ ] Includes "Verified on Cost of Concrete" text (accurate wording)
- [ ] Includes green checkmark icon in circle
- [ ] Uses brand colors (#03a71e green, light green background #f0fdf4)
- [ ] Has subtle border for definition
- [ ] SVG output is valid and renders correctly

**Badge Visual Design:**
```
+--------------------------------------------------+
|  +---------+                                      |
|  |    ✓    |  Verified on                        |
|  +---------+  Cost of Concrete                   |
+--------------------------------------------------+
200px x 75px
- Green checkmark in circle (25px from left, centered vertically)
- "Verified on" in 12px gray
- "Cost of Concrete" in 14px bold green
- Light green background (#f0fdf4) with green border
- 6px border radius
```

**Implementation:**
```typescript
// File: /server/utils/badge.ts

/**
 * Badge SVG Generation Utility
 *
 * Generates verified contractor badges for embedding.
 * Uses #03a71e green to match the verified-badge.vue component.
 */

// Badge dimensions
const BADGE_WIDTH = 200
const BADGE_HEIGHT = 75

/**
 * Generate the verified contractor badge SVG
 * Design: 200x75px with "Verified on Cost of Concrete" branding
 */
export function generateBadgeSVG(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${BADGE_WIDTH}" height="${BADGE_HEIGHT}" viewBox="0 0 ${BADGE_WIDTH} ${BADGE_HEIGHT}">
  <rect width="${BADGE_WIDTH}" height="${BADGE_HEIGHT}" rx="6" fill="#f0fdf4" stroke="#03a71e" stroke-width="1"/>
  <circle cx="28" cy="37" r="16" fill="#03a71e"/>
  <path d="M21 37l5 5 9-10" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="54" y="30" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#666">Verified on</text>
  <text x="54" y="50" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600" fill="#03a71e">Cost of Concrete</text>
</svg>`
}

/**
 * Generate a generic/placeholder badge SVG for invalid tokens
 */
export function generatePlaceholderBadgeSVG(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${BADGE_WIDTH}" height="${BADGE_HEIGHT}" viewBox="0 0 ${BADGE_WIDTH} ${BADGE_HEIGHT}">
  <rect width="${BADGE_WIDTH}" height="${BADGE_HEIGHT}" rx="6" fill="#f5f5f5" stroke="#e5e5e5" stroke-width="1"/>
  <text x="100" y="42" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#999" text-anchor="middle">Cost of Concrete</text>
</svg>`
}
```

---

### US-006: Log Retention & Pruning

**Description:** As a system, I want badge embed logs to be automatically pruned after a retention window so the database remains fast and storage remains bounded.

**Layer:** infrastructure

**Files to Create:**
1. `/supabase/migrations/[timestamp]_add_badge_logs_retention.sql` (NEW)

**Acceptance Criteria:**
- [ ] Retain badge logs for 90 days
- [ ] Old rows are deleted automatically on a schedule (daily at 03:00 UTC)
- [ ] Pruning is safe (idempotent) and does not block badge serving
- [ ] Typecheck passes: `pnpm run build`
- [ ] Lint passes: `pnpm run lint`

**Database Migration:**
```sql
-- File: /supabase/migrations/[YYYYMMDDHHMMSS]_add_badge_logs_retention.sql

-- Automated log retention for badge_embed_logs
-- Keeps the table bounded by deleting rows older than 90 days

-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function to prune old badge embed logs
CREATE OR REPLACE FUNCTION prune_badge_embed_logs(retention_days INT DEFAULT 90)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM badge_embed_logs
  WHERE created_at < NOW() - make_interval(days => retention_days);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION prune_badge_embed_logs IS 'Deletes badge embed logs older than retention_days (default 90)';

-- Schedule daily pruning at 03:00 UTC
SELECT cron.schedule(
  'prune-badge-embed-logs-daily',
  '0 3 * * *',
  $$ SELECT prune_badge_embed_logs(90); $$
);

COMMENT ON FUNCTION prune_badge_embed_logs IS 'Daily cleanup of badge_embed_logs older than 90 days';
```

**Testing Requirements:**
- Manual verification: Check cron job is scheduled with `SELECT * FROM cron.job;`
- Test function manually: `SELECT prune_badge_embed_logs(90);`

---

## 5. Technical Specifications

### 5.1 New/Modified Files Summary

| File | Action | Story |
|------|--------|-------|
| `/supabase/migrations/[timestamp]_update_badge_logs_schema.sql` | CREATE | US-001 |
| `/supabase/migrations/[timestamp]_reset_embed_verified_on_website_change.sql` | CREATE | US-002 |
| `/supabase/migrations/[timestamp]_add_badge_logs_retention.sql` | CREATE | US-006 |
| `/server/utils/badgeRequest.ts` | CREATE | US-001 (shared handler) |
| `/server/utils/domain.ts` | CREATE | US-002 |
| `/server/utils/badgeAssets.ts` | CREATE | US-004 |
| `/server/__tests__/utils/domain.test.ts` | CREATE | US-002 |
| `/server/__tests__/utils/badgeRequest.test.ts` | CREATE | US-001 |
| `/server/api/public/badges/[token].svg.get.ts` | MODIFY | US-001, US-002 |
| `/server/api/public/badges/[token].png.get.ts` | CREATE | US-004 |
| `/server/utils/badge.ts` | MODIFY | US-005 |
| `/server/assets/badges/verified.png` | CREATE | US-004 |
| `/server/assets/badges/placeholder.png` | CREATE | US-004 |
| `/app/pages/owner/index.vue` | MODIFY | US-003 |
| `/nuxt.config.ts` | MODIFY | US-003 |

### 5.2 Dependencies to Add

```json
{
  "dependencies": {
    "tldts": "^6.0.0"
  }
}
```

**Note:** No `sharp` dependency needed - PNGs are prebuilt assets.

### 5.3 Type Regeneration Required

After implementing database changes, run:
```bash
npx supabase gen types typescript --local > app/types/supabase.ts
```

---

## 6. Testing Requirements

### 6.1 Test Files to Create

| File | Type | Stories |
|------|------|---------|
| `/server/__tests__/utils/domain.test.ts` | Unit | US-002 |
| `/server/__tests__/utils/badgeRequest.test.ts` | Unit | US-001 |
| `/server/__tests__/api/badges/svg-endpoint.test.ts` | Integration | US-001, US-002 |
| `/server/__tests__/api/badges/png-endpoint.test.ts` | Integration | US-004 |

### 6.2 Test Commands

```bash
# Run all unit tests
pnpm run test:unit

# Run specific test file
pnpm run test:unit -- server/__tests__/utils/domain.test.ts

# Run with coverage
pnpm run test:unit:coverage
```

### 6.3 Manual E2E Testing Checklist

1. **Badge Endpoint (SVG)**
   - [ ] `curl http://localhost:3001/api/public/badges/[valid-token].svg` returns SVG
   - [ ] Response includes `X-Content-Type-Options: nosniff`
   - [ ] Invalid token returns placeholder SVG
   - [ ] Check `badge_embed_logs` table for entries

2. **Badge Endpoint (PNG)**
   - [ ] `curl http://localhost:3001/api/public/badges/[valid-token].png` returns PNG
   - [ ] Response includes `X-Content-Type-Options: nosniff`
   - [ ] Invalid token returns placeholder PNG

3. **Owner Portal**
   - [ ] Navigate to http://localhost:3001/owner
   - [ ] Expand badge section for a contractor
   - [ ] Verify badge preview displays
   - [ ] Copy HTML embed code and verify it includes all attributes
   - [ ] Verify URLs use localhost (not hardcoded production)

4. **Auto-Verification**
   - [ ] Embed badge on external test site
   - [ ] Refresh page with badge
   - [ ] Check contractor's `embed_verified` is now true
   - [ ] Check `embed_verified_domain` matches site

5. **Verification Reset**
   - [ ] Change contractor's website in database
   - [ ] Verify `embed_verified` is reset to false

6. **Log Retention**
   - [ ] Check cron job scheduled: `SELECT * FROM cron.job;`
   - [ ] Test function: `SELECT prune_badge_embed_logs(90);`

---

## 7. Implementation Order

### Phase 1: Infrastructure & Backend Core
1. **US-001**: Atomic logging with DB-enforced dedup + shared handler
2. **US-002**: PSL-backed domain matching + website change trigger
3. **US-006**: Log retention with pg_cron

### Phase 2: Frontend
4. **US-003**: Linked responsive embed code with attribution

### Phase 3: PNG Support
5. **US-004**: PNG endpoint with prebuilt assets
6. **US-005**: Badge design (verify/iterate)

### Dependency Graph
```
US-001 (logging + shared handler) ──┐
                                    ├──► US-004 (PNG - uses shared handler)
US-002 (domain matching) ───────────┤
                                    │
US-006 (retention) ─────────────────┘ (independent, can run in parallel)

US-003 (frontend) ──────────────────── (can run in parallel with Phase 1)

US-005 (design) ────────────────────── (embedded in US-004, review after)
```

---

## 8. Non-Goals (Out of Scope)

- **Custom badge designs per contractor** - All contractors get the same badge
- **Badge analytics dashboard** - Basic logging only, no visualization
- **Rate limiting badge requests** - DB dedup + retention is sufficient
- **Badge size/color customization** - Single standardized badge
- **Verification revocation** - Once verified, stays verified (unless website changes)
- **IP hashing** - Deferred to privacy audit; current raw IP storage is acceptable for MVP
- **Crawler-based "Verify now"** - Deferred to v2 pending production feedback on referrer reliability
- **Automatic continuous re-verification** - Not in MVP

---

## 9. Open Questions (Resolved)

| # | Question | Resolution |
|---|----------|------------|
| 1 | Use PSL-backed parsing for TLD correctness? | Yes - use `tldts` with `allowPrivateDomains: true` |
| 2 | Pre-generate PNG or on-the-fly? | Pre-generate and serve static bytes (no sharp dependency) |
| 3 | How to handle logging race conditions? | DB-enforced unique index with upsert/ignoreDuplicates |
| 4 | What about unbounded log growth? | 90-day retention via pg_cron |
| 5 | Reset verification on website change? | Yes - database trigger resets embed_verified |
| 6 | Hardcoded vs config for base URLs? | Config-driven via runtimeConfig |

---

## Appendix

### A. Key File Locations
```
/home/andy/projects/cost-of-concrete/
├── server/
│   ├── api/public/badges/
│   │   ├── [token].svg.get.ts    # Existing, modify to use shared handler
│   │   └── [token].png.get.ts    # New
│   ├── assets/badges/
│   │   ├── verified.png          # New (prebuilt)
│   │   └── placeholder.png       # New (prebuilt)
│   ├── utils/
│   │   ├── badge.ts              # Existing, update design
│   │   ├── badgeRequest.ts       # New (shared handler)
│   │   ├── badgeAssets.ts        # New (PNG loader)
│   │   ├── domain.ts             # New (PSL-backed)
│   │   └── clientIP.ts           # Existing, reuse
│   └── __tests__/
│       ├── utils/
│       │   ├── domain.test.ts    # New
│       │   └── badgeRequest.test.ts  # New
│       └── api/badges/
│           ├── svg-endpoint.test.ts  # New
│           └── png-endpoint.test.ts  # New
├── app/
│   ├── pages/owner/
│   │   └── index.vue             # Existing, modify
│   └── types/
│       └── supabase.ts           # Regenerate after migrations
├── nuxt.config.ts                # Modify (add runtimeConfig)
└── supabase/
    └── migrations/
        ├── 20260105085717_add_embed_token_to_contractors.sql  # Existing
        ├── 20260107021600_create_badge_embed_logs.sql         # Existing
        ├── [new]_update_badge_logs_schema.sql                 # New
        ├── [new]_reset_embed_verified_on_website_change.sql   # New
        └── [new]_add_badge_logs_retention.sql                 # New
```

### B. Security Considerations

1. **Domain Verification Integrity**: PSL-backed parsing prevents false matches (two `.co.uk` sites matching, or two `github.io` users matching)
2. **PII Reduction**: Store `referrer_origin` instead of full URL path/query
3. **Response Headers**: Include `X-Content-Type-Options: nosniff` on all badge responses
4. **Website Change Reset**: Changing website resets verification to prevent stale domain associations

### C. Revision History
| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2026-01-22 | 1.0 | Claude | Initial draft |
| 2026-01-22 | 2.0 | Claude | Added granular implementation details |
| 2026-01-22 | 3.0 | Claude | Incorporated reviewer feedback: PSL-backed domain parsing, atomic DB dedup, log retention, prebuilt PNG assets, shared handler, embed improvements |
