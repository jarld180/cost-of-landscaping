---
discovery_date: 2026-01-22
last_updated: 2026-01-22
source_patterns: ["app/**/*.vue", "server/**/*.ts"]
confidence: high
cartographer_version: 1.0
---

# Code Patterns

## Server-Side Patterns

### Repository Pattern

All database access goes through repositories:

```typescript
// server/repositories/ContractorRepository.ts
export class ContractorRepository {
  constructor(private client: SupabaseClient) {}

  async findById(id: string) {
    const { data, error } = await this.client
      .from('contractors')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }
}
```

### Service Pattern

Business logic in services, injected with repositories:

```typescript
// server/services/ContractorEnrichmentService.ts
export class ContractorEnrichmentService {
  constructor(
    private contractorRepo: ContractorRepository,
    private geocodingService: GeocodingService,
  ) {}

  async enrichContractor(id: string) {
    const contractor = await this.contractorRepo.findById(id)
    const coords = await this.geocodingService.geocode(contractor.address)
    return this.contractorRepo.update(id, { coordinates: coords })
  }
}
```

### API Handler Pattern

```typescript
// server/api/contractors/[id].get.ts
import { ContractorRepository } from '~/server/repositories/ContractorRepository'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const client = await serverSupabaseServiceRole(event)
  const repo = new ContractorRepository(client)

  return repo.findById(id)
})
```

### Schema Validation in API

```typescript
// server/api/contractors/index.post.ts
import { ContractorCreateSchema } from '~/server/schemas/contractor.schemas'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const validated = ContractorCreateSchema.parse(body)
  // ...
})
```

---

## Frontend Patterns

### Composable Data Fetching

```typescript
// app/composables/useAdminContractors.ts
export function useAdminContractors() {
  const contractors = ref<Contractor[]>([])
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchContractors() {
    loading.value = true
    try {
      contractors.value = await $fetch('/api/contractors')
    } catch (e) {
      error.value = e as Error
    } finally {
      loading.value = false
    }
  }

  return { contractors, loading, error, fetchContractors }
}
```

### Form Pattern with Vee-Validate + Zod

```typescript
// Component script
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { ContractorCreateSchema } from '~/schemas/admin/contractor'

const { handleSubmit, values, errors } = useForm({
  validationSchema: toTypedSchema(ContractorCreateSchema),
  initialValues: {
    name: '',
    city_id: '',
  },
})

const onSubmit = handleSubmit(async (values) => {
  await $fetch('/api/contractors', {
    method: 'POST',
    body: values,
  })
})
```

### Component with Slots Pattern

From `docs/reka-ui-wrapper-pattern.md`:

```vue
<!-- Wrapper component -->
<template>
  <RekaComponent v-slot="slotProps">
    <slot v-bind="slotProps" />
  </RekaComponent>
</template>
```

---

## Naming Conventions

### Files

| Type | Convention | Example |
|------|------------|---------|
| Vue Component | PascalCase | `ContractorCard.vue` |
| Composable | camelCase with `use` | `useAdminContractors.ts` |
| API Route | kebab-case with method | `[id].get.ts` |
| Service | PascalCase + Service | `ContractorService.ts` |
| Repository | PascalCase + Repository | `ContractorRepository.ts` |
| Schema | camelCase + .schemas | `contractor.schemas.ts` |
| Migration | timestamp_description | `20251204_create_contractors` |

### Variables

```typescript
// Refs use value
const contractors = ref<Contractor[]>([])
contractors.value = [...]

// Boolean refs
const isLoading = ref(false)
const hasError = ref(false)

// Handlers
function handleSubmit() {}
async function fetchData() {}
```

---

## Error Handling

### API Errors

```typescript
// Throw H3 errors in API routes
throw createError({
  statusCode: 404,
  message: 'Contractor not found',
})
```

### Client Error Display

```typescript
// Using toast notifications
import { toast } from 'vue-sonner'

try {
  await fetchData()
} catch (e) {
  toast.error('Failed to load data')
}
```

---

## SSE Streaming Pattern

For long-running operations:

```typescript
// server/api/jobs/stream.get.ts
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Content-Type', 'text/event-stream')
  setResponseHeader(event, 'Cache-Control', 'no-cache')
  setResponseHeader(event, 'Connection', 'keep-alive')

  const stream = createEventStream(event)

  // Send updates
  await stream.push({ event: 'progress', data: { percent: 50 } })

  return stream.send()
})
```

---

## Auto-Import Patterns

### Nuxt Auto-Imports

These are automatically available without imports:
- `ref`, `computed`, `watch` (Vue)
- `useRoute`, `navigateTo` (Nuxt)
- `useFetch`, `$fetch` (Nuxt)
- `useSupabaseClient` (@nuxtjs/supabase)
- Custom composables from `app/composables/`
- Utilities from `app/lib/`

### Component Registration

```typescript
// nuxt.config.ts
components: [
  { path: '~/components/ui', pathPrefix: false },
  { path: '~/components', pathPrefix: false },
]
```
