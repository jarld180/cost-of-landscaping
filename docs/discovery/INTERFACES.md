---
discovery_date: 2026-01-22
last_updated: 2026-01-22
source_patterns: ["app/types/**", "server/schemas/**/*.ts"]
confidence: high
cartographer_version: 1.0
---

# Interfaces & Types

## Database Types

Primary type definitions are auto-generated from Supabase schema.

### Source
```bash
supabase gen types typescript --local > app/types/supabase.ts
```

### Location
`app/types/supabase.ts` (84KB, auto-generated)

### Usage Pattern
```typescript
import type { Database } from '~/types/supabase'

type Contractor = Database['public']['Tables']['contractors']['Row']
type ContractorInsert = Database['public']['Tables']['contractors']['Insert']
type ContractorUpdate = Database['public']['Tables']['contractors']['Update']
```

---

## Custom Type Files

### `app/types/accounts.ts`

Account profile types:
```typescript
interface AccountProfile {
  id: string
  account_type: 'system' | 'contractor'
  is_admin: boolean
  status: 'active' | 'suspended' | 'deleted'
  metadata: Record<string, any>
}
```

### `app/types/claims.ts`

Business claim types for contractor ownership verification.

### `app/types/jobs.ts`

Background job type definitions.

### `app/types/templates.ts`

Page template schema types:
```typescript
interface TemplateField {
  name: string
  type: 'text' | 'richtext' | 'image' | 'select' | ...
  required?: boolean
  options?: string[]
}

interface PageTemplate {
  slug: string
  name: string
  schema: TemplateField[]
}
```

### `app/types/admin-nav.d.ts`

Admin navigation type declarations.

---

## Zod Schemas as Runtime Types

Zod schemas in `server/schemas/` serve as both validation and type inference.

### Pattern
```typescript
// server/schemas/contractor.schemas.ts
import { z } from 'zod'

export const ContractorCreateSchema = z.object({
  name: z.string().min(1),
  city_id: z.string().uuid(),
  // ...
})

export type ContractorCreate = z.infer<typeof ContractorCreateSchema>
```

### Key Schemas

| Schema | Types Defined |
|--------|---------------|
| `contractor.schemas.ts` | ContractorCreate, ContractorUpdate, ContractorSearch |
| `page.schemas.ts` | PageCreate, PageUpdate, PageQuery |
| `menu.schemas.ts` | MenuCreate, MenuUpdate, MenuItemCreate |
| `job.schemas.ts` | JobCreate, JobUpdate, JobQuery |
| `import.schemas.ts` | ImportJobCreate, ImportRow |
| `ai.schemas.ts` | AIRequest, AIResponse, ExtractionResult |

---

## API Response Types

Common response patterns used across API endpoints.

### Paginated Response
```typescript
interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
```

### Error Response
```typescript
interface ApiError {
  statusCode: number
  message: string
  data?: any
}
```

---

## Component Prop Types

Components define props using Vue's `defineProps` with TypeScript:

```typescript
// Example pattern
interface ContractorCardProps {
  contractor: Contractor
  showDistance?: boolean
  compact?: boolean
}

const props = defineProps<ContractorCardProps>()
```

---

## Form Types

Forms use vee-validate with Zod for type-safe forms:

```typescript
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'

const { values, handleSubmit } = useForm({
  validationSchema: toTypedSchema(ContractorCreateSchema),
})
// `values` is typed as ContractorCreate
```

---

## Type Generation Workflow

1. **Modify database**: Create/update migrations in `supabase/migrations/`
2. **Apply locally**: `pnpm db:push`
3. **Regenerate types**: `supabase gen types typescript --local > app/types/supabase.ts`
4. **Commit both**: Migration file + updated types
