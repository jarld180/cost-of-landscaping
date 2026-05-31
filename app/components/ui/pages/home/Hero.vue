<script setup lang="ts">
// Hero component for the homepage
// Features eyebrow, heading, description, and search input with button
</script>

<template>
  <section class="relative overflow-hidden rounded-3xl bg-[#f0f7f0] py-16 dark:from-blue-950/20 dark:to-neutral-800 md:py-24 lg:py-32">
    <div class="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
      <!-- Content Container -->
      <div class="flex flex-col items-center text-center">
        <!-- Eyebrow -->
        <div class="mb-6">
          <Eyebrow
            text="Homeowners Guide to Landscaping"
            variant="white-blue"
            size="md"
          />
        </div>

        <!-- Heading -->
        <h1 class="leading-tighter mb-6 font-heading text-5xl font-bold text-neutral-900 dark:text-neutral-50 md:text-5xl lg:text-6xl">
          Find Trusted Landscapers Near You
        </h1>

        <!-- Description -->
        <p class="mb-10 max-w-3xl text-base text-neutral-600 dark:text-neutral-300 sm:text-lg md:text-xl">
          Real cost data + a national directory of verified lawn-care pros, landscape designers,
          hardscapers, irrigation installers, and tree-service crews. No paid placements.
        </p>

        <!-- Search Input with Button -->
        <div class="w-full max-w-2xl">
          <SearchInput
            placeholder="Type a city, state or zip code.."
            variant="primary-outline"
            size="lg"
            button="Find Landscapers"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
</style>

