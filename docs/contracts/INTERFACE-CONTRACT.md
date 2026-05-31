---
discovery_date: 2026-01-22
last_updated: 2026-01-22
source_patterns: ["server/api/**/*.ts"]
confidence: high
cartographer_version: 1.0
---

# Interface Contract

Stable API boundaries that agents and developers can rely on.

---

## API Conventions

### URL Structure
```
/api/{resource}                 # Collection
/api/{resource}/{id}            # Single item
/api/{resource}/{id}/{action}   # Action on item
```

### HTTP Methods
| Method | Purpose | Idempotent |
|--------|---------|------------|
| GET | Read | Yes |
| POST | Create | No |
| PATCH | Partial update | Yes |
| DELETE | Remove | Yes |

### File Naming
```
server/api/contractors/index.get.ts     → GET /api/contractors
server/api/contractors/index.post.ts    → POST /api/contractors
server/api/contractors/[id].get.ts      → GET /api/contractors/:id
server/api/contractors/[id].patch.ts    → PATCH /api/contractors/:id
```

---

## Request/Response Format

### Request Bodies
- Content-Type: `application/json`
- Validated by Zod schemas in `server/schemas/`

### Successful Response
```typescript
// Single item
{ id: string, ...fields }

// Collection
{
  data: Item[],
  total: number,
  page: number,
  pageSize: number
}
```

### Error Response
```typescript
{
  statusCode: number,
  message: string,
  data?: any  // Optional additional context
}
```

### Status Codes
| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Validation error |
| 401 | Not authenticated |
| 403 | Not authorized |
| 404 | Not found |
| 500 | Server error |

---

## Stable Endpoints

These endpoints are considered stable. Breaking changes require version bump.

### Contractors
```
GET    /api/contractors          # List/search
POST   /api/contractors          # Create
GET    /api/contractors/:id      # Get one
PATCH  /api/contractors/:id      # Update
DELETE /api/contractors/:id      # Delete
```

### Pages (CMS)
```
GET    /api/pages                # List
POST   /api/pages                # Create
GET    /api/pages/:id            # Get one
PATCH  /api/pages/:id            # Update
DELETE /api/pages/:id            # Delete
```

### Menus
```
GET    /api/menus                # List
POST   /api/menus                # Create
GET    /api/menus/by-slug/:slug  # Get by slug
PATCH  /api/menus/:id            # Update
DELETE /api/menus/:id            # Delete
```

### Jobs
```
GET    /api/jobs                 # List
POST   /api/jobs                 # Create
GET    /api/jobs/:id             # Get one
POST   /api/jobs/:id/execute     # Execute
POST   /api/jobs/:id/cancel      # Cancel
```

---

## Query Parameters

### Pagination
```
?page=1&pageSize=20
```

### Sorting
```
?sort=created_at&order=desc
```

### Filtering
```
?status=active&city_id=uuid
```

---

## Streaming Endpoints

Server-Sent Events (SSE) for long-running operations:

```
GET /api/jobs/stream              # All job updates
GET /api/jobs/:id/stream          # Single job updates
GET /api/contractors/enrich-images/stream  # Image enrichment
```

### SSE Format
```
event: progress
data: {"percent": 50, "message": "Processing..."}

event: complete
data: {"result": {...}}

event: error
data: {"message": "Failed"}
```

---

## Authentication Headers

For authenticated endpoints, Supabase session cookie is used automatically.

For job runner:
```
X-Job-Runner-Secret: <secret>
```

---

## Versioning Policy

- No explicit API versioning currently
- Breaking changes documented in CHANGELOG
- Deprecated endpoints marked in docs before removal
