<script setup lang="ts">
/**
 * Owner Layout
 *
 * Simple layout for business owners managing their profiles.
 * Features:
 * - Clean header with navigation
 * - Mobile responsive
 * - Dark mode support
 */

const supabase = useSupabaseClient()

const handleLogout = async () => {
  await supabase.auth.signOut()
  await navigateTo('/')
}
</script>

<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-900">
    <!-- Header -->
    <header class="border-b border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <!-- Logo -->
        <NuxtLink to="/" class="flex items-center gap-2">
          <img
            src="/images/logo-dark.webp"
            alt="Cost of Landscaping"
            class="hidden h-8 dark:block"
          />
          <img
            src="/images/logo-light.webp"
            alt="Cost of Landscaping"
            class="block h-8 dark:hidden"
          />
        </NuxtLink>

        <!-- Navigation -->
        <nav class="flex items-center gap-4">
          <NuxtLink
            to="/owner"
            class="text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            My Businesses
          </NuxtLink>
          <NuxtLink
            to="/"
            class="text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            Home
          </NuxtLink>
          <button
            type="button"
            class="text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            @click="handleLogout"
          >
            Logout
          </button>
        </nav>
      </div>
    </header>

    <!-- Main Content -->
    <main class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <slot />
    </main>

    <!-- Toast Notifications via Sonner -->
    <UiSonner />
  </div>
</template>

