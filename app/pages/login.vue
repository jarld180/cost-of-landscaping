<script setup lang="ts">
definePageMeta({
  layout: 'blank',
})

useHead({
  title: 'Login - Cost of landscape'
})
</script>

<template>
  <LayoutAuth>
    <div class="grid mx-auto max-w-sm gap-6">
      <AuthSignIn />
    </div>
  </LayoutAuth>
</template>

