<script setup lang="ts">
/**
 * BrowseByCity - Directory navigation component for finding contractors by city
 * Displays cities within a specific US state in a responsive grid
 */
import type { City } from '~/utils/usStates'

interface Props {
  /**
   * State name for display purposes
   */
  stateName: string

  /**
   * State slug for URL generation
   */
  stateSlug: string

  /**
   * Array of cities to display
   */
  cities: City[]
}

const props = defineProps<Props>()

/**
 * Generate the URL for a specific city's contractor listing
 * Uses SEO-optimized URL structure: /[state]/[city]/landscapers/
 */
const getCityUrl = (citySlug: string): string => {
  return `/${props.stateSlug}/${citySlug}/landscapers`
}
</script>

<template>
  <section class="py-12 md:py-16">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <!-- Section Header -->
      <div class="mb-8">
        <Eyebrow
          text="Browse by City"
          variant="blue-blue"
          size="md"
          class="mb-4"
        />
        <h2 class="font-heading text-2xl font-bold text-neutral-900 dark:text-neutral-50 md:text-3xl">
          Find Contractors in {{ stateName }}
        </h2>
        <p class="mt-2 text-neutral-600 dark:text-neutral-400">
          Select a city to narrow your search for landscape pros
        </p>
      </div>

      <!-- Cities Grid -->
      <!-- Mobile: 2 cols | Tablet: 3 cols | Desktop: 4 cols -->
      <div class="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 md:grid-cols-4">
        <NuxtLink
          v-for="city in cities"
          :key="city.slug"
          :to="getCityUrl(city.slug)"
          class="group flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:text-neutral-300 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
        >
          <Icon
            name="heroicons:building-office-2"
            class="h-4 w-4 flex-shrink-0 text-neutral-400 transition-colors group-hover:text-blue-500 dark:text-neutral-500 dark:group-hover:text-blue-400"
          />
          <span>{{ city.name }}</span>
        </NuxtLink>
      </div>

      <!-- Empty State -->
      <div
        v-if="cities.length === 0"
        class="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center dark:border-neutral-700 dark:bg-neutral-800/50"
      >
        <Icon
          name="heroicons:map"
          class="mx-auto h-12 w-12 text-neutral-400 dark:text-neutral-500"
        />
        <p class="mt-4 text-neutral-600 dark:text-neutral-400">
          No cities available for {{ stateName }} yet.
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Component styles handled by Tailwind */
</style>

