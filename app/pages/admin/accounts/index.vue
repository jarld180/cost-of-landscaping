<script setup lang="ts">
/**
 * Admin Accounts Index
 * Redirects to /admin/accounts/system
 */

definePageMeta({
  layout: 'admin',
})

// Redirect to system accounts
navigateTo('/admin/accounts/system', { replace: true })
</script>

<template>
  <div class="flex items-center justify-center py-12">
    <div class="text-center">
      <Icon name="heroicons:arrow-path" class="size-8 animate-spin text-muted-foreground" />
      <p class="mt-2 text-sm text-muted-foreground">
        Redirecting...
      </p>
    </div>
  </div>
</template>

