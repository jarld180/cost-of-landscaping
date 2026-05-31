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
    name: 'Lawn Care',
    slug: 'lawn-care',
    description: 'Weekly mowing, fertilization programs, aeration + overseeding, and full-season maintenance',
    icon: 'heroicons:sun'
  },
  {
    name: 'Landscape Design',
    slug: 'landscape-design',
    description: 'Design-only fees, design-build pricing, front-yard refreshes and full-property installs',
    icon: 'heroicons:pencil-square'
  },
  {
    name: 'Hardscaping',
    slug: 'hardscaping',
    description: 'Paver patios, natural stone walkways, retaining walls, fire pits and outdoor kitchens',
    icon: 'heroicons:rectangle-stack'
  },
  {
    name: 'Irrigation',
    slug: 'irrigation',
    description: 'Sprinkler installs by zone, drip systems, smart Wi-Fi controllers and winterization',
    icon: 'heroicons:cloud'
  },
  {
    name: 'Tree Service',
    slug: 'tree-service',
    description: 'Trimming, removal, stump grinding, and ISA-certified arborist services',
    icon: 'heroicons:sparkles'
  },
  {
    name: 'Mulch & Planting',
    slug: 'mulch-planting',
    description: 'Mulch refresh by yard, plant material and markups, sod vs. seed pricing, tree and shrub installs',
    icon: 'heroicons:cube'
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
          Popular Landscape Services
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

