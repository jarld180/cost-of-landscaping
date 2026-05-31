<script setup lang="ts">
// Top Contractors component for the homepage
// Features eyebrow, heading with carousel controls, and contractor cards in responsive grid
// Static implementation - carousel logic to be added later

interface Contractor {
  name: string
  location: string
  services: string
  logo: string
  topRated: boolean
}

// Mock contractor data - only 2 contractors for desktop
const contractors: Contractor[] = [
  {
    name: 'Greenfield Landscape Co.',
    location: 'Houston, TX',
    services: 'Design, Hardscape, Lawn Care',
    logo: 'https://placeholdit.com/600x400',
    topRated: true
  },
  {
    name: 'Cascade Outdoor Living',
    location: 'Phoenix, AZ',
    services: 'Irrigation, Hardscape, Tree Service',
    logo: 'https://placeholdit.com/600x400',
    topRated: true
  }
]
</script>

<template>
  <section class="rounded-3xl py-20 md:py-24 lg:py-28" style="background-color: #103a21;">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <!-- Eyebrow -->
      <div class="mb-6">
        <Eyebrow
          text="Top Contractors"
          variant="white-white"
          size="md"
        />
      </div>

      <!-- Heading + Carousel Controls Row -->
      <div class="mb-12 grid grid-cols-1 items-start gap-6 md:grid-cols-2 md:items-center md:gap-8">
        <!-- Heading + Description -->
        <div>
          <h2 class="mb-4 font-heading text-3xl font-bold leading-tight text-white md:text-4xl">
            Featured Contractors
          </h2>
          <p class="text-base text-neutral-300 md:text-lg">
            Verified and high-ranking contractors based on performance, reliability, and customer trust.
          </p>
        </div>

        <!-- Carousel Controls (Desktop only) -->
        <div class="flex justify-start gap-3 md:justify-end">
          <!-- Previous Button -->
          <button
            type="button"
            class="flex h-12 w-12 items-center justify-center rounded-full bg-white text-neutral-800 transition-colors hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2"
            style="background-color: #ffffff;"
            aria-label="Previous contractor"
          >
            <Icon name="heroicons:chevron-left" class="h-6 w-6" />
          </button>

          <!-- Next Button -->
          <button
            type="button"
            class="flex h-12 w-12 items-center justify-center rounded-full bg-white text-neutral-800 transition-colors hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2"
            style="background-color: #ffffff;"
            aria-label="Next contractor"
          >
            <Icon name="heroicons:chevron-right" class="h-6 w-6" />
          </button>
        </div>
      </div>

      <!-- Contractor Cards Grid -->
      <!-- 1 column on mobile, 2 columns on desktop (larger cards) -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div
          v-for="contractor in contractors"
          :key="contractor.name"
          class="flex gap-6 rounded-lg border p-8"
          style="background-color: #144627; border-color: #1f6f3a; border-width: 1px;"
        >
          <!-- Logo (Left Side) -->
          <div class="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
            <Icon name="heroicons:building-office-2" class="h-12 w-12 text-blue-500" />
          </div>

          <!-- Content (Right Side) - All left-aligned -->
          <div class="flex flex-1 flex-col">
            <!-- Company Name -->
            <h3 class="mb-3 font-heading text-2xl font-bold text-white">
              {{ contractor.name }}
            </h3>

            <!-- Location -->
            <div class="mb-2 flex items-center gap-2 text-base text-neutral-300">
              <Icon name="heroicons:map-pin" class="h-5 w-5" />
              <span>{{ contractor.location }}</span>
            </div>

            <!-- Services -->
            <div class="mb-6 flex items-center gap-2 text-base text-neutral-300">
              <Icon name="heroicons:wrench-screwdriver" class="h-5 w-5" />
              <span>{{ contractor.services }}</span>
            </div>

            <!-- Top Rated Badge -->
            <div v-if="contractor.topRated" class="mb-6">
              <Badge
                text="Top Rated"
                variant="ghost"
                :color="['#ffffff', '#ffffff']"
                size="md"
                borderWidth="thin"
                icon="material-symbols:check-circle"
              />
            </div>

            <!-- View Profile Button -->
            <div class="mt-auto">
              <NuxtLink to="/">
                <Button
                  text="View Profile"
                  variant="ghost"
                  :colors="['#FFFFFF', '#C0C0C0']"
                  icon="heroicons:arrow-right"
                  size="md"
                />
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
</style>

