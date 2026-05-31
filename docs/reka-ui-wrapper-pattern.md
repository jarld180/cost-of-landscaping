# Reka UI Wrapper Component Pattern

## Overview

This document describes the **correct pattern** for wrapping Reka UI components in custom Vue components. Following this pattern is **critical** - deviating from it will result in non-functional components.

## The Problem

When wrapping Reka UI components (DialogRoot, PopoverRoot, etc.) in custom Vue components, certain patterns **break** Reka UI's internal state management, causing the components to not open when triggered.

## What Breaks Reka UI

### ❌ DO NOT: Bind the `open` prop in any way

```vue
<!-- ❌ BROKEN: Direct binding -->
<DialogRoot :open="open">

<!-- ❌ BROKEN: v-bind with object -->
<DialogRoot v-bind="{ open: props.open }">

<!-- ❌ BROKEN: v-bind with computed -->
<DialogRoot v-bind="dialogRootProps">

<!-- ❌ BROKEN: v-if/v-else on root component -->
<DialogRoot v-if="isControlled" :open="open">
<DialogRoot v-else>
```

**Why it breaks:** Any binding of the `open` prop (even when `undefined`) interferes with Reka UI's internal state management, preventing the component from opening.

## What Works

### ✅ DO: Use uncontrolled mode only

```vue
<script setup lang="ts">
interface Props {
  triggerText?: string
  title?: string
  // ❌ NO 'open' prop!
}

const props = withDefaults(defineProps<Props>(), {
  triggerText: 'Open Dialog',
  title: 'Dialog'
})

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const slots = useSlots()
const hasCustomTrigger = computed(() => !!slots.trigger)
</script>

<template>
  <!-- ✅ Single root component -->
  <!-- ✅ Only @update:open event handler -->
  <!-- ✅ NO :open binding -->
  <DialogRoot
    @update:open="(value) => emit('update:open', value)"
  >
    <!-- Custom trigger with as-child -->
    <DialogTrigger
      v-if="hasCustomTrigger"
      as-child
    >
      <slot name="trigger" />
    </DialogTrigger>

    <!-- Default trigger -->
    <DialogTrigger
      v-else
      class="..."
    >
      {{ triggerText }}
    </DialogTrigger>

    <DialogPortal>
      <DialogOverlay class="..." />
      <DialogContent class="...">
        <DialogTitle>{{ title }}</DialogTitle>
        <slot />
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
```

## Pattern Rules

### ✅ Allowed

1. **Props** - Any props EXCEPT `open`
2. **Slots** - All slots including `as-child` pattern
3. **Event handlers** - `@update:open` and other events
4. **Computed properties** - For classes, styles, slot detection
5. **Single root component** - One `DialogRoot`/`PopoverRoot` per template

### ❌ Not Allowed

1. **`open` prop** - Cannot be included in Props interface
2. **`:open` binding** - Cannot bind open in any form
3. **`v-bind` with objects** - Cannot use `v-bind="{ ... }"` on root
4. **`v-if/v-else` on root** - Cannot conditionally render root component
5. **Controlled mode** - Cannot support external state management

## Controlled Mode Alternative

If users need controlled mode (external state management), they should use **raw Reka UI components** directly:

```vue
<script setup lang="ts">
const isOpen = ref(false)
</script>

<template>
  <DialogRoot :open="isOpen" @update:open="isOpen = $event">
    <DialogTrigger>Open</DialogTrigger>
    <DialogPortal>
      <DialogOverlay />
      <DialogContent>
        <DialogTitle>Controlled Dialog</DialogTitle>
        <p>This dialog's state is managed externally</p>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
```

## Testing Pattern

When creating new Reka UI wrapper components, use this incremental testing approach:

### Test 1: Minimal Hard-coded Component
```vue
<template>
  <DialogRoot>
    <DialogTrigger>Click Me</DialogTrigger>
    <DialogPortal>
      <DialogContent>
        <DialogTitle>Test</DialogTitle>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
```
**Expected:** ✅ Should work

### Test 2: Add Props (no `open`)
```vue
<script setup lang="ts">
interface Props {
  triggerText?: string
}
const props = defineProps<Props>()
</script>

<template>
  <DialogRoot>
    <DialogTrigger>{{ triggerText }}</DialogTrigger>
    <!-- ... -->
  </DialogRoot>
</template>
```
**Expected:** ✅ Should work

### Test 3: Add Slots
```vue
<script setup lang="ts">
const slots = useSlots()
const hasCustomTrigger = computed(() => !!slots.trigger)
</script>

<template>
  <DialogRoot>
    <DialogTrigger v-if="hasCustomTrigger" as-child>
      <slot name="trigger" />
    </DialogTrigger>
    <DialogTrigger v-else>Default</DialogTrigger>
    <!-- ... -->
  </DialogRoot>
</template>
```
**Expected:** ✅ Should work

### Test 4: Add Event Handler
```vue
<script setup lang="ts">
const emit = defineEmits<{
  'update:open': [value: boolean]
}>()
</script>

<template>
  <DialogRoot @update:open="(value) => emit('update:open', value)">
    <!-- ... -->
  </DialogRoot>
</template>
```
**Expected:** ✅ Should work

### Test 5: Add `:open` binding (DON'T DO THIS)
```vue
<template>
  <DialogRoot :open="open">
    <!-- ... -->
  </DialogRoot>
</template>
```
**Expected:** ❌ Will NOT work

## Diagnostic Checklist

If your Reka UI wrapper component doesn't open when clicked:

- [ ] Remove `open` prop from Props interface
- [ ] Remove any `:open` binding from root component
- [ ] Remove any `v-bind="..."` from root component
- [ ] Ensure only ONE root component (no `v-if/v-else` on root)
- [ ] Keep `@update:open` event handler (this is fine)
- [ ] Test with raw Reka UI components to verify setup

## Examples

### ✅ Correct Dialog Wrapper
See: `app/components/ui/Dialog.vue`

### ✅ Correct Popover Wrapper
See: `app/components/ui/Popover.vue`

### ✅ Test Components
See: `app/components/TestDialog.vue` through `TestDialog7.vue` for incremental testing examples

## Summary

**The Golden Rule:** Never bind the `open` prop to Reka UI root components in wrapper components. Use uncontrolled mode only, and let Reka UI manage its own state.

**For controlled mode:** Use raw Reka UI components directly, not wrappers.

This pattern ensures Reka UI's internal state management works correctly while still allowing full customization through props, slots, and styling.

