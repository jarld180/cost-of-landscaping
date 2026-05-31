---
discovery_date: 2026-01-22
last_updated: 2026-01-22
source_patterns: ["app/pages/**", "nuxt.config.ts"]
confidence: high
cartographer_version: 1.0
---

# Navigation Contract

URL structure, routing patterns, and navigation guarantees.

---

## URL Structure

### Public Routes
```
/                           # Homepage
/concrete-contractors       # Contractor search/listing
/concrete-contractors/[state]           # State listing
/concrete-contractors/[state]/[city]    # City listing
/[...slug]                  # CMS catch-all (pages table)
```

### Admin Routes
```
/admin                      # Dashboard
/admin/pages                # CMS pages
/admin/pages/new
/admin/pages/[id]/edit
/admin/menus                # Navigation
/admin/contractors          # Directory
/admin/contractors/[id]
/admin/accounts             # User management
/admin/maintenance          # Operations
/admin/ai                   # AI tools
```

### Owner Routes
```
/owner/contractors/[id]/edit  # Edit own listing
```

### Auth Routes
```
/login                      # Sign in
```

---

## Route Priority

Nuxt file-based routing with custom ordering:

1. **Exact matches** (e.g., `/admin`, `/login`)
2. **State routes** with regex constraint
3. **CMS catch-all** (`/[...slug]`) - moved to end

### State Route Matching
```typescript
// nuxt.config.ts
const STATE_REGEX = `(alabama|alaska|arizona|...)`
route.path = `:state${STATE_REGEX}`
```

This prevents state routes from capturing CMS slugs.

---

## Layouts

| Layout | Routes | Features |
|--------|--------|----------|
| `default` | Public pages | Header, footer |
| `admin` | `/admin/**` | Admin nav, sidebar |
| `owner` | `/owner/**` | Owner nav |
| `blank` | Auth pages | No chrome |
| `page` | CMS pages | Minimal, content-focused |

---

## Navigation Components

### Menus (Database-driven)
```
menus table
  └── menu_items (ordered)
```

Locations:
- `header` - Main navigation
- `footer` - Footer links

### Breadcrumbs
`app/components/Breadcrumbs.vue` - Auto-generated from route.

---

## Link Types

### Internal Links
```vue
<NuxtLink to="/contractors">Contractors</NuxtLink>
```

### External Links
```vue
<a href="https://..." target="_blank" rel="noopener">External</a>
```

### Programmatic Navigation
```typescript
navigateTo('/admin/pages')
navigateTo({ path: '/admin', query: { tab: 'users' } })
```

---

## Query Parameters

### Pagination
```
?page=1&pageSize=20
```

### Search/Filter
```
?q=keyword
?status=active
?city=new-york
```

### State Preservation
Query params should be preserved during navigation within the same section.

---

## Route Guards

### Admin Guard
```typescript
// Redirects to /login if not authenticated
// Throws 403 if authenticated but not admin
```

### Owner Guard
```typescript
// Validates user owns the resource
// Throws 403 if not owner
```

---

## SEO URLs

### Contractors
```
/concrete-contractors/california/los-angeles
/concrete-contractors/texas
```

### CMS Pages
```
/about
/privacy
/terms
/services/residential
```

---

## URL Invariants

1. **No trailing slashes** (Nuxt default)
2. **Lowercase only** for slugs
3. **Hyphens** for word separation (not underscores)
4. **State slugs** must match US state list
5. **CMS slugs** cannot conflict with reserved routes

### Reserved Paths (Cannot be CMS slugs)
- `/admin`
- `/owner`
- `/login`
- `/api`
- `/concrete-contractors`
- US state names

---

## Redirects

Configure in deployment platform or `nuxt.config.ts`:
```typescript
routeRules: {
  '/old-path': { redirect: '/new-path' },
}
```

---

## SSR Configuration

```typescript
routeRules: {
  '/admin/**': { ssr: false },  // SPA mode
}
```

Admin routes render client-side only to avoid auth hydration issues.
