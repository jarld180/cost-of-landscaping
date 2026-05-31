---
discovery_date: 2026-01-22
last_updated: 2026-01-22
source_patterns: ["app/components/**", "tailwind.config.js"]
confidence: high
cartographer_version: 1.0
---

# UI Contract

Component patterns, styling conventions, and design system guarantees.

---

## Component Libraries

| Library | Purpose | Location |
|---------|---------|----------|
| shadcn-nuxt | Admin UI primitives | `app/components/admin-ui/` |
| reka-ui | Headless components | Used by shadcn |
| Custom | Public-facing UI | `app/components/ui/` |

---

## Component Prefixes

| Prefix | Source | Usage |
|--------|--------|-------|
| `Ui` | shadcn-nuxt | Admin interface |
| None | Custom | Public pages |

### Example
```vue
<!-- Admin page -->
<UiButton>Save</UiButton>
<UiCard>
  <UiCardHeader>Title</UiCardHeader>
</UiCard>

<!-- Public page -->
<ContractorCard :contractor="contractor" />
```

---

## Directory Structure

```
app/components/
├── ui/                 # Public UI components
├── admin-ui/           # shadcn components (Ui prefix)
├── admin/              # Admin-specific compositions
├── contractor/         # Contractor displays
├── owner/              # Owner portal
├── templates/          # Page template renderers
└── auth/               # Authentication
```

---

## Styling

### Framework
Tailwind CSS with custom configuration.

### Key Classes
```css
/* Spacing */
p-4, m-2, gap-4

/* Colors - use semantic names */
bg-primary, text-muted-foreground

/* Responsive */
sm:, md:, lg:, xl:, 2xl:
```

### Tailwind Config Highlights
- Custom color palette
- Typography plugin (`@tailwindcss/typography`)
- Container queries (`@tailwindcss/container-queries`)
- Animation utilities (`tailwindcss-animate`)

---

## Design Tokens

### Colors
Defined in `tailwind.config.js`:
```javascript
colors: {
  primary: {...},
  secondary: {...},
  accent: {...},
  muted: {...},
  destructive: {...},
}
```

### Typography
Fonts via `@nuxtjs/google-fonts`:
- **Inter** - Body text
- **Inter Tight** - Headings

---

## Component Patterns

### Props Pattern
```typescript
interface Props {
  contractor: Contractor
  compact?: boolean
  showDistance?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  compact: false,
  showDistance: false,
})
```

### Slots Pattern
```vue
<template>
  <div class="card">
    <slot name="header" />
    <slot />
    <slot name="footer" />
  </div>
</template>
```

### Wrapper Pattern
See `docs/reka-ui-wrapper-pattern.md`:
```vue
<RekaComponent v-slot="slotProps">
  <slot v-bind="slotProps" />
</RekaComponent>
```

---

## Forms

### Library
vee-validate + Zod

### Pattern
```vue
<script setup>
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'

const { handleSubmit, errors } = useForm({
  validationSchema: toTypedSchema(Schema),
})
</script>

<template>
  <form @submit="handleSubmit(onSubmit)">
    <UiFormField name="email" label="Email">
      <UiInput v-model="email" />
    </UiFormField>
  </form>
</template>
```

---

## Icons

### Provider
`@nuxt/icon` with Iconify

### Collections
- `lucide` - Primary icons
- `heroicons` - Alternative

### Usage
```vue
<Icon name="lucide:check" class="w-4 h-4" />
<Icon name="heroicons:arrow-right" />
```

---

## Notifications

### Library
vue-sonner

### Usage
```typescript
import { toast } from 'vue-sonner'

toast.success('Saved successfully')
toast.error('Failed to save')
toast.loading('Saving...')
```

---

## Animations

### Auto-animate
`@formkit/auto-animate` for list transitions:
```vue
<div v-auto-animate>
  <div v-for="item in items" :key="item.id">
    {{ item.name }}
  </div>
</div>
```

### Tailwind Animate
```vue
<div class="animate-in fade-in slide-in-from-bottom-4">
  Content
</div>
```

---

## Responsive Breakpoints

| Breakpoint | Min Width |
|------------|-----------|
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |
| `2xl` | 1536px |

---

## Dark Mode

### Configuration
```typescript
// nuxt.config.ts
colorMode: {
  classSuffix: '',
  preference: 'light',
  fallback: 'light',
}
```

### Usage
```vue
<div class="bg-white dark:bg-gray-900">
  Content
</div>
```

Currently defaulting to light mode.

---

## UI Invariants

1. **Admin components** use `Ui` prefix
2. **Public components** in `components/ui/`
3. **No inline styles** - use Tailwind
4. **Icons** via `<Icon>` component only
5. **Forms** use vee-validate + Zod
6. **Toasts** via vue-sonner
