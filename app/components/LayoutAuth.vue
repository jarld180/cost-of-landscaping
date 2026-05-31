<script setup lang="ts">
defineProps<{
  reverse?: boolean
}>()
</script>

<template>
  <div
    class="relative flex items-center justify-center px-4 h-dvh lg:max-w-none lg:px-0"
    :class="{ 'flex-row-reverse': reverse }"
  >
    <!-- Beautiful Gradient Panel -->
    <div class="relative hidden h-full flex-1 flex-col p-10 text-white shadow-2xl lg:flex overflow-hidden">
      <!-- Multi-layer gradient background -->
      <div class="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-600 to-neutral-700" />
      <div class="absolute inset-0 bg-gradient-to-tr from-neutral-800/60 via-blue-600/40 to-transparent" />

      <!-- Subtle pattern overlay -->
      <div class="absolute inset-0 opacity-5">
        <div class="absolute top-0 left-0 w-96 h-96 bg-blue-400 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div class="absolute bottom-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      </div>

      <!-- Content -->
      <div class="relative z-20 flex items-center">
        <NuxtLink to="/">
          <img
            src="/images/logo-light.webp"
            alt="Cost of Landscaping"
            class="h-12 w-auto brightness-0 invert"
          />
        </NuxtLink>
      </div>
      <div class="relative z-20 mt-auto">
        <blockquote class="space-y-2">
          <p class="text-lg leading-relaxed">
            &ldquo;Find trusted landscape pros in your area. Compare quotes, read reviews, and make informed decisions for your landscape projects.&rdquo;
          </p>
          <footer class="text-sm text-blue-50">
            Cost of landscape Team
          </footer>
        </blockquote>
      </div>
    </div>

    <!-- Form Panel -->
    <div class="mx-auto flex-1 lg:p-8">
      <slot />
    </div>
  </div>
</template>

<style scoped>

</style>

