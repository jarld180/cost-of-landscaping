<script setup lang="ts">
import type { CarouselApi } from '~/components/admin-ui/carousel'
import { Carousel as UiCarousel, CarouselContent as UiCarouselContent, CarouselItem as UiCarouselItem } from '~/components/admin-ui/carousel'

// Explore Categories component for the homepage
// Features eyebrow, heading with carousel controls, and category cards in responsive carousel

interface Category {
  title: string
  description: string
  image: string
  slug: string
}

const api = ref<CarouselApi>()

function setApi(val: CarouselApi) {
  api.value = val
}

// Category data for explore section
const categories: Category[] = [
  {
    title: 'Lawn Care',
    description: 'Weekly mowing, seasonal fertilization programs, aeration + overseeding — what it actually costs to keep a healthy lawn in 2026 and the verified pros doing it.',
    image: '/images/lawn-care.webp',
    slug: 'lawn-care'
  },
  {
    title: 'Landscape Design',
    description: 'Design-only fees, design-build pricing, front-yard refreshes, full-property installs. What a real residential landscape design budget looks like and where the money actually goes.',
    image: '/images/landscape-design.webp',
    slug: 'landscape-design'
  },
  {
    title: 'Hardscaping',
    description: 'Paver patios, natural stone walkways, retaining walls, fire pits, outdoor kitchens. Per-square-foot pricing for every common hardscape material in 2026.',
    image: '/images/hardscaping.webp',
    slug: 'hardscaping'
  },
  {
    title: 'Irrigation',
    description: 'Sprinkler installs by zone, drip systems for beds, smart Wi-Fi controllers, backflow + winterization — all-in residential pricing.',
    image: '/images/irrigation.webp',
    slug: 'irrigation'
  },
  {
    title: 'Tree Service',
    description: 'Removal by tree size, stump grinding, emergency response. ISA-certified arborists vs. chainsaw operators, and how to tell the difference before you sign.',
    image: '/images/tree-service.webp',
    slug: 'tree-service'
  },
  {
    title: 'Mulch & Planting',
    description: 'Mulch cost per yard installed, plant material markups, sod vs. seed pricing, tree + shrub installation. Recurring and one-time costs.',
    image: '/images/mulch-planting.webp',
    slug: 'mulch-planting'
  }
]
</script>

<template>
  <section class="md:py-26 bg-white py-20 dark:bg-neutral-800 lg:py-28">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <!-- Eyebrow -->
      <div class="mb-6">
        <Eyebrow
          text="Explore by Categories"
          variant="blue-blue"
          size="md"
        />
      </div>

      <!-- Heading + Carousel Controls Row -->
      <div class="mb-12 grid grid-cols-1 items-center gap-6 md:grid-cols-2 md:gap-8">
        <!-- Heading -->
        <h2 class="font-heading text-3xl font-bold leading-tight text-neutral-900 dark:text-neutral-50 md:text-4xl">
          Find the Right Service<br />for Your Project
        </h2>

        <!-- Carousel Controls (Desktop only) -->
        <div class="flex justify-start gap-3 md:justify-end">
          <!-- Previous Button -->
          <button
            @click="api?.scrollPrev()"
            type="button"
            class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-white transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600"
            aria-label="Previous category"
          >
            <Icon name="heroicons:chevron-left" class="h-6 w-6" />
          </button>

          <!-- Next Button -->
          <button
            @click="api?.scrollNext()"
            type="button"
            class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-white transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600"
            aria-label="Next category"
          >
            <Icon name="heroicons:chevron-right" class="h-6 w-6" />
          </button>
        </div>
      </div>

      <!-- Category Carousel -->
      <UiCarousel
        :opts="{ loop: true, align: 'start' }"
        @init-api="setApi"
        class="w-full"
      >
        <UiCarouselContent class="-ml-6">
          <UiCarouselItem
            v-for="category in categories"
            :key="category.slug"
            class="pl-6 basis-full sm:basis-1/2 lg:basis-1/3"
          >
            <div class="flex h-full flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-neutral-700 dark:bg-neutral-900">
              <!-- Category Image -->
              <div class="aspect-[3/2] w-full overflow-hidden">
                <img
                  :src="category.image"
                  :alt="category.title"
                  class="h-full w-full object-cover"
                />
              </div>

              <!-- Category Content -->
              <div class="flex flex-1 flex-col p-6">
                <!-- Category Title -->
                <h3 class="mb-3 font-heading text-2xl font-bold text-neutral-900 dark:text-neutral-50">
                  {{ category.title }}
                </h3>

                <!-- Category Description -->
                <p class="mb-6 flex-1 text-base text-neutral-600 dark:text-neutral-300">
                  {{ category.description }}
                </p>

                <!-- View Contractors Button -->
                <div>
                  <NuxtLink :to="`/${category.slug}`">
                    <Button
                      text="View Contractors"
                      variant="primary-outline"
                      size="md"
                    />
                  </NuxtLink>
                </div>
              </div>
            </div>
          </UiCarouselItem>
        </UiCarouselContent>
      </UiCarousel>
    </div>
  </section>
</template>

<style scoped>
</style>
