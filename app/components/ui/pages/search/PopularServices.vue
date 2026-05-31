<script setup lang="ts">
/**
 * PopularServices - Directory navigation component for finding contractors by service type
 * Displays service categories as clickable Card components with icons
 */

interface ServiceCategory {
  name: string
  slug: string
  description: string
  icon: string
}

// Service categories matching existing filter options
const services: ServiceCategory[] = [
  {
    name: 'Driveways',
    slug: 'landscape-driveways',
    description: 'Installation, repair, and resurfacing for residential and commercial driveways',
    icon: 'heroicons:truck'
  },
  {
    name: 'Patios',
    slug: 'landscape-patios',
    description: 'Custom outdoor living spaces with decorative finishes and durable construction',
    icon: 'heroicons:sun'
  },
  {
    name: 'Foundations',
    slug: 'landscape-foundations',
    description: 'Structural landscape work including slabs, footings, and foundation repair',
    icon: 'heroicons:home-modern'
  },
  {
    name: 'Walkways',
    slug: 'sidewalks-walkways',
    description: 'Sidewalks, garden paths, and front entry walkways built to last',
    icon: 'heroicons:arrow-long-right'
  },
  {
    name: 'Stamped & Decorative',
    slug: 'stamped-decorative',
    description: 'Colored, stamped, and textured landscape for unique aesthetic appeal',
    icon: 'heroicons:sparkles'
  },
  {
    name: 'landscape Repair',
    slug: 'landscape-repair',
    description: 'Crack repair, slab lifting, and surface restoration services',
    icon: 'heroicons:wrench-screwdriver'
  }
]
</script>

<template>
  <section class="py-16 md:py-20 lg:py-28">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <!-- Section Header -->
      <div class="mb-12">
        <Eyebrow
          text="Browse by Service"
          variant="blue-blue"
          size="md"
          class="mb-4"
        />
        <h2 class="font-heading text-3xl font-bold text-neutral-900 dark:text-neutral-50 md:text-4xl">
          Popular landscape Services
        </h2>
        <p class="mt-3 text-lg text-neutral-600 dark:text-neutral-400">
          Find contractors specialized in your specific project type
        </p>
      </div>

      <!-- Services Grid -->
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <NuxtLink
          v-for="service in services"
          :key="service.slug"
          :to="`/${service.slug}`"
          class="group block transition-transform hover:-translate-y-1"
        >
          <Card
            variant="secondary-light-outline"
            border-width="thin"
            :icon="service.icon"
            :heading="service.name"
            :shadow="true"
            class="h-full"
          >
            {{ service.description }}
          </Card>
        </NuxtLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Hover state enhancement for cards */
.group:hover :deep(.border) {
  border-color: theme('colors.blue.400');
}

:is(.dark .group:hover) :deep(.border) {
  border-color: theme('colors.blue.500');
}
</style>

