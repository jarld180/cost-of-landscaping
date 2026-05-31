<script setup lang="ts">
/**
 * InlineSearchBox - CTA search box for embedding in page content
 *
 * Designed to be inserted into article content via <code>searchBox</code> placeholder.
 * Features a styled container with headline, subtext, and zip code search input.
 */

interface Props {
  /** Main headline text */
  headline?: string
  /** Supporting description text */
  subtext?: string
  /** Button text */
  buttonText?: string
  /** Input placeholder */
  placeholder?: string
}

withDefaults(defineProps<Props>(), {
  headline: 'Get landscape Estimates in Just 30 Seconds',
  subtext: 'Match with an expert for your patio, driveway, or other landscape needs.',
  buttonText: 'GET FREE ESTIMATES',
  placeholder: 'Enter Zip Code'
})
</script>

<template>
  <div class="not-prose my-8 rounded-xl border border-neutral-200 bg-gradient-to-br from-neutral-50 to-neutral-100 dark:border-neutral-700 dark:from-neutral-800 dark:to-neutral-900">
    <!-- Decorative city skyline background -->
    <div class="relative px-6 py-8 sm:px-8 sm:py-10">
      <!-- Background pattern (subtle) -->
      <div class="pointer-events-none absolute inset-x-0 bottom-0 h-16 opacity-10">
        <svg class="h-full w-full" viewBox="0 0 400 60" preserveAspectRatio="xMidYMax slice" fill="currentColor">
          <rect x="10" y="20" width="15" height="40" />
          <rect x="30" y="30" width="12" height="30" />
          <rect x="47" y="15" width="18" height="45" />
          <rect x="70" y="25" width="10" height="35" />
          <rect x="85" y="10" width="20" height="50" />
          <rect x="110" y="35" width="14" height="25" />
          <rect x="130" y="20" width="16" height="40" />
          <rect x="150" y="28" width="12" height="32" />
          <rect x="170" y="12" width="22" height="48" />
          <rect x="200" y="30" width="10" height="30" />
          <rect x="220" y="18" width="18" height="42" />
          <rect x="245" y="25" width="14" height="35" />
          <rect x="265" y="8" width="24" height="52" />
          <rect x="295" y="32" width="12" height="28" />
          <rect x="315" y="22" width="16" height="38" />
          <rect x="340" y="15" width="20" height="45" />
          <rect x="365" y="28" width="14" height="32" />
          <rect x="385" y="20" width="15" height="40" />
        </svg>
      </div>

      <!-- Content -->
      <div class="relative text-center">
        <!-- Headline with highlighted text -->
        <h3 class="mb-3 text-xl font-bold text-neutral-900 dark:text-neutral-50 sm:text-2xl">
          {{ headline }}
        </h3>

        <!-- Subtext -->
        <p class="mx-auto mb-6 max-w-md text-sm text-neutral-600 dark:text-neutral-400 sm:text-base">
          {{ subtext }}
        </p>

        <!-- Search Input -->
        <div class="mx-auto max-w-sm">
          <SearchInput
            :placeholder="placeholder"
            :button="buttonText"
            size="md"
            variant="primary-outline"
            :background-color="['#ffffff', '#374151']"
          />
        </div>
      </div>
    </div>
  </div>
</template>

