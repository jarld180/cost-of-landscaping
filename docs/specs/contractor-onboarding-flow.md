# Contractor Onboarding Flow — Badge Snippet Setup

## Overview

When a contractor confirms their profile claim and logs in for the first time, they need a guided onboarding experience that walks them through adding the "Verified on Cost of Concrete" badge snippet to their website.

This is critical because:
1. The badge creates a backlink to their Cost of Concrete profile (SEO value for both parties)
2. Badge detection auto-verifies the contractor (`embed_verified = true`) which upgrades their listing ranking
3. It establishes the verification tier system as a value exchange — contractors get visibility, we get link equity

---

## Current State

### What exists today:
- `/claim/activate` — Account creation (set password after admin approves claim)
- `/owner` — Dashboard showing claimed businesses with badge embed code (collapsible section)
- `embed_token` on contractors table — UUID used to generate badge URLs
- Auto-verification via `badgeRequest.ts` — detects badge on contractor's site via referrer header
- Badge served at `/api/public/badges/{embedToken}.svg` and `.png`

### What's missing:
- **No onboarding wizard after first login** — contractor lands on `/owner` with no guided instructions
- The badge embed section is collapsed by default and easily missed
- No progress tracking for the onboarding steps
- No "first time" detection to trigger the onboarding flow

---

## Spec: First-Login Onboarding Wizard

### Route
`/owner/onboarding`

### Trigger
After successful account activation (on `/claim/activate` success), redirect to `/owner/onboarding` instead of `/owner`.

Also show an "incomplete onboarding" banner on `/owner` if badge is not yet verified.

### Onboarding Steps

#### Step 1: Welcome & Profile Confirmation
- **Heading**: "Welcome, {companyName}! Let's get your profile verified."
- **Content**: Brief explanation of the verification benefit (higher ranking, verified badge visible on listing, trust signal for potential customers)
- **Show**: Preview of their public profile card with the "Verified" badge example
- **Action**: "Next" button

#### Step 2: Copy Your Badge Snippet
- **Heading**: "Add the badge to your website"
- **Content**: 
  - Show the badge preview (live SVG render)
  - HTML embed code in a prominent code block with one-click copy
  - Fallback: PNG URL if their platform doesn't support HTML embeds
  - Platform-specific tips (expandable):
    - **WordPress**: "Paste into a Custom HTML block or widget"
    - **Wix**: "Use the Embed HTML element in the editor"
    - **Squarespace**: "Add a Code Block in your footer or sidebar"
    - **GoDaddy Website Builder**: "Use the HTML section"
    - **Custom HTML site**: "Paste into your footer or about page"
- **Code block content** (same as current `getBadgeHtml()` output):
  ```html
  <a href="{profileUrl}?utm_source=verified_badge&utm_medium=embed&utm_campaign=badge" target="_blank" rel="noopener" style="display:inline-block;text-decoration:none;">
    <img src="{badgeUrl}" alt="Verified on Cost of Concrete" width="200" height="75" loading="lazy" decoding="async" referrerpolicy="origin" style="max-width:100%;height:auto;display:block;border:0;" />
  </a>
  ```
- **Important**: Must include `referrerpolicy="origin"` — this is what allows auto-verification to work
- **Action**: "I've added the badge" button + "Skip for now" link

#### Step 3: Verification Check
- **Heading**: "Checking for your badge..."
- **Content**:
  - Explain that verification happens automatically when someone visits their site and the badge loads
  - **Option A** (instant check): Button to trigger a server-side HEAD request to their website URL looking for the badge embed (if `contractor.website` is set)
  - **Option B** (passive): "We'll check automatically within 24-48 hours. You'll receive an email when verified."
- **States**:
  - `checking` — Spinner while we attempt to detect the badge
  - `verified` — Success! Badge detected, `embed_verified` set to true
  - `not_found` — Badge not detected yet. Show troubleshooting tips:
    - "Make sure the snippet is on a publicly accessible page"
    - "If you just added it, it may take a few minutes for caching to clear"
    - "The `referrerpolicy='origin'` attribute must be present"
  - `no_website` — Contractor hasn't set a website URL. Prompt them to add one first.
- **Action**: "Go to Dashboard" button

#### Step 4: Complete (optional celebration)
- Brief confetti/success moment
- Show verification tier explanation:
  - **Basic Verified** = Phone verified OR badge detected
  - **Fully Verified** = Badge + COI (Certificate of Insurance) submitted
  - **Trusted Partner** = Manual admin designation
- CTA: "Upload your Certificate of Insurance for Fully Verified status" → links to COI upload flow
- "Go to Dashboard" button

---

## Technical Implementation

### Database Changes
```sql
-- Track onboarding state per contractor account
ALTER TABLE account_profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
```

### API Endpoints

#### `GET /api/owner/onboarding-status`
Returns:
```json
{
  "completed": false,
  "contractor": {
    "id": "uuid",
    "companyName": "ABC Concrete",
    "embedToken": "uuid",
    "embedVerified": false,
    "website": "https://abcconcrete.com",
    "profileUrl": "/kentucky/louisville/concrete-contractors/abc-concrete"
  }
}
```

#### `POST /api/owner/onboarding/check-badge`
- Takes `contractorId`
- Server-side fetches contractor's website URL
- Checks if the page HTML contains the badge embed token
- Returns `{ detected: boolean, domain?: string }`
- If detected, auto-sets `embed_verified = true`

#### `POST /api/owner/onboarding/complete`
- Sets `account_profiles.onboarding_completed_at = now()`
- Returns redirect URL

### Routing Logic

In `/claim/activate` success handler, change redirect from:
```ts
router.push(response.redirectUrl || '/owner')
```
to:
```ts
router.push('/owner/onboarding')
```

In `/owner` layout or page, add banner:
```ts
// Show banner if not onboarded AND badge not verified
if (!profile.onboarding_completed_at && !contractor.embed_verified) {
  showOnboardingBanner = true
}
```

### Components

| Component | Purpose |
|-----------|---------|
| `OwnerOnboardingWizard.vue` | Main wizard wrapper with step navigation |
| `OnboardingStepWelcome.vue` | Step 1 — welcome + benefits |
| `OnboardingStepSnippet.vue` | Step 2 — code display + copy + platform tips |
| `OnboardingStepVerify.vue` | Step 3 — verification check + troubleshooting |
| `OnboardingStepComplete.vue` | Step 4 — success + next steps |
| `OnboardingBanner.vue` | Banner shown on `/owner` if incomplete |

---

## UX Principles

1. **Don't block** — "Skip for now" always available. Never gate dashboard access behind onboarding completion.
2. **One action per screen** — Each step has one primary CTA.
3. **Show value first** — Lead with "what they get" (higher ranking, verified badge, trust signal) before asking them to do work.
4. **Platform-aware** — Most contractors are on WordPress, Wix, or Squarespace. Show relevant instructions.
5. **Instant feedback** — When they click "check badge", show a real-time result, not a "we'll email you later" dead end.

---

## Edge Cases

- **Multiple businesses**: If a contractor owns multiple businesses, onboarding should scope to the first/primary one. Dashboard banner should show for any unverified business.
- **No website set**: If `contractor.website` is null, Step 3 should prompt them to enter their website URL first (inline form).
- **Badge already verified**: If they somehow get to onboarding but badge is already verified (e.g. from a prior claim on the same domain), skip to Step 4 / show "Already verified!" state.
- **Returning users**: If they dismiss onboarding and come back later, the banner on `/owner` gives them a way back in.

---

## Success Metrics

- % of activated contractors who complete onboarding
- % of onboarded contractors who achieve `embed_verified = true` within 7 days
- Time from activation to badge verification
- Drop-off rate at each step

---

## Open Questions

1. Should we send a reminder email if badge isn't detected within 48h of activation?
2. Do we want a "paste your website URL and we'll generate the snippet for you" shortcut?
3. Should the badge check be a cron job that periodically re-checks unverified contractors' websites?
