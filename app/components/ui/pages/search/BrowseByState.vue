<script setup lang="ts">
/**
 * BrowseByState - Directory navigation component for finding contractors by US state
 * Displays all 50 states in an alphabetically ordered, responsive grid
 */
import { US_STATES } from '~/utils/usStates'

// Use shared states data
const states = US_STATES

/**
 * Generate the URL for a specific state
 */
const getStateUrl = (slug: string): string => {
  return `/${slug}`
}
</script>

<template>
  <section class="py-12 md:py-16">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <!-- Section Header -->
      <div class="mb-8">
        <Eyebrow
          text="Browse by Location"
          variant="blue-blue"
          size="md"
          class="mb-4"
        />
        <h2 class="font-heading text-2xl font-bold text-neutral-900 dark:text-neutral-50 md:text-3xl">
          Find Contractors by State
        </h2>
        <p class="mt-2 text-neutral-600 dark:text-neutral-400">
          Select your state to discover trusted landscape pros in your area
        </p>
      </div>

      <!-- States Grid -->
      <!-- Mobile: 2 cols | Tablet: 4 cols | Desktop: 5 cols -->
      <div class="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        <NuxtLink
          v-for="state in states"
          :key="state.abbreviation"
          :to="getStateUrl(state.slug)"
          class="group flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:text-neutral-300 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
        >
          <Icon
            name="heroicons:map-pin"
            class="h-4 w-4 flex-shrink-0 text-neutral-400 transition-colors group-hover:text-blue-500 dark:text-neutral-500 dark:group-hover:text-blue-400"
          />
          <span>{{ state.name }}</span>
        </NuxtLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Component styles handled by Tailwind */
</style>

