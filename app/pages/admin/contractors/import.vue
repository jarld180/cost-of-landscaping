<script setup lang="ts">
/**
 * Redirect: Contractor Import has moved to /admin/maintenance/import
 */

definePageMeta({
  layout: 'admin',
})

// Redirect to new location
await navigateTo('/admin/maintenance/import', { redirectCode: 301 })
</script>

<template>
  <div class="flex h-full items-center justify-center p-6">
    <p class="text-muted-foreground">Redirecting to new location...</p>
  </div>
</template>
