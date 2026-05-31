<script setup lang="ts">
/**
 * Page Layout - For CMS page templates
 *
 * Provides Header, Footer, and Sonner without container constraints.
 * Templates control their own widths and padding internally.
 */
</script>

<template>
  <div class="flex min-h-screen flex-col bg-white font-sans dark:bg-neutral-800">
    <!-- Header -->
    <Header />

    <!-- Main Content - No container constraints -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- Footer -->
    <Footer />

    <!-- Toast Notifications via Sonner -->
    <UiSonner />
  </div>
</template>

