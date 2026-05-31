<script setup lang="ts">
/**
 * Maintenance Index Page
 *
 * Redirects to the Contractor Import page as the default maintenance tool.
 */

definePageMeta({
  layout: 'admin',
})

// Redirect to import page as the default maintenance tool
await navigateTo('/admin/maintenance/import', { redirectCode: 302 })
</script>

<template>
  <div class="flex h-full items-center justify-center">
    <p class="text-muted-foreground">Redirecting...</p>
  </div>
</template>

