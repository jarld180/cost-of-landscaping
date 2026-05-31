<script setup lang="ts">
/**
 * Admin Sidebar Header
 * Displays the Cost of Concrete logo in the sidebar header
 */
import { useSidebar } from '~/components/admin-ui/sidebar'

const { state } = useSidebar()
</script>

<template>
  <div class="flex flex-col gap-1 px-2">
    <NuxtLink to="/admin" class="flex flex-col items-start gap-0.5 py-1.5">
      <!-- Collapsed Logo (icon mode) -->
      <img
        v-if="state === 'collapsed'"
        src="/images/logo-collapsed.webp"
        alt="Cost of Concrete"
        class="h-8 w-auto"
      />
      <!-- Expanded Logo (light mode) -->
      <img
        v-else
        src="/images/logo-light.webp"
        alt="Cost of Concrete"
        class="block h-8 w-auto dark:hidden"
      />
      <!-- Expanded Logo (dark mode) -->
      <img
        v-if="state === 'expanded'"
        src="/images/logo-dark.webp"
        alt="Cost of Concrete"
        class="hidden h-8 w-auto dark:block"
      />
      <!-- Admin Panel text (only when expanded) -->
      <span
        v-if="state === 'expanded'"
        class="mt-1 text-[10px] text-muted-foreground"
      >
        Admin Panel
      </span>
    </NuxtLink>
  </div>
</template>

