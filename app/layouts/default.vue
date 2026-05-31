<script setup lang="ts">
// Default layout for the application
</script>

<template>
  <div class="flex min-h-screen flex-col bg-white font-sans dark:bg-neutral-800">
    <!-- Header -->
    <Header />

    <!-- Main Content -->
    <main class="flex-1">
      <div class="mx-auto max-w-8xl px-4 py-2 sm:px-6 lg:px-8">
        <slot />
      </div>
    </main>

    <!-- Footer -->
    <Footer />

    <!-- Toast Notifications via Sonner -->
    <UiSonner />
  </div>
</template>

<style scoped>
</style>

