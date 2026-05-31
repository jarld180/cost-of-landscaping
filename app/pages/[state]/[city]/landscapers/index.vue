<script setup lang="ts">
import { getStateBySlug } from '~/utils/usStates'

/**
 * Contractor Listing Page
 * Route: /[state]/[city]/landscapers/
 *
 * SEO-optimized URL structure for landscaper directory
 */

// Note: State validation is handled at route level via regex pattern in nuxt.config.ts
definePageMeta({
  layout: 'default',
})

const route = useRoute()
const stateSlug = computed(() => route.params.state as string)
const citySlug = computed(() => route.params.city as string)

// Get state data for display
const stateData = computed(() => getStateBySlug(stateSlug.value))

// Supabase client for building storage URLs
const supabase = useSupabaseClient()

// Build image URL from storage path
function buildImageUrl(storagePath: string | undefined): string | undefined {
  if (!storagePath) return undefined
  const { data } = supabase.storage.from('contractors').getPublicUrl(storagePath)
  return data.publicUrl
}

// Pagination and filters
const page = ref(1)
const limit = 20
const selectedCategory = ref<string | undefined>()
const sortBy = ref<'rating' | 'review_count' | 'distance'>('rating')

// Fetch city info — scope by state to avoid slug collisions (e.g. Wilmington NC vs CA)
const { data: city, error: cityError } = await useFetch(() => `/api/public/cities/${citySlug.value}?state=${stateData.value?.abbreviation || ''}`)

// 404 if city not found
if (cityError.value || !city.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'City Not Found',
    message: `The city "${citySlug.value}" was not found in ${stateData.value?.name || stateSlug.value}.`
  })
}

// Fetch categories
const { data: categoriesData } = await useFetch('/api/public/categories')

// Fetch contractors
const { data: contractorsData, pending } = await useFetch('/api/public/contractors', {
  query: computed(() => ({
    citySlug: citySlug.value,
    stateCode: stateData.value?.abbreviation,
    category: selectedCategory.value,
    limit,
    offset: (page.value - 1) * limit,
    orderBy: sortBy.value
  })),
  watch: [page, selectedCategory, sortBy]
})

// Apply SEO with state slug for proper canonical URL
if (city.value) {
  useCategoryListingSeo({
    cityName: city.value.name,
    citySlug: city.value.slug,
    stateCode: city.value.stateCode,
    stateSlug: stateSlug.value,
    categoryName: undefined,
    categorySlug: undefined,
    totalContractors: contractorsData.value?.total || 0,
    contractors: contractorsData.value?.contractors?.map(c => ({
      id: c.id,
      companyName: c.companyName,
      slug: c.slug,
      citySlug: c.citySlug,
      stateSlug: stateSlug.value,
      rating: c.rating,
      reviewCount: c.reviewCount,
      phone: c.phone
    }))
  })
}

// Handle category change
function onCategoryChange(slug: string | undefined) {
  selectedCategory.value = slug
  page.value = 1
}

// Pagination helpers
const totalPages = computed(() => Math.ceil((contractorsData.value?.total || 0) / limit))
const hasMore = computed(() => contractorsData.value?.hasMore || false)

const landscapingGuides = [
  { title: 'How Much Does landscaping Cost Per Square Foot?', href: '/how-much-does-landscaping-cost-per-square-foot' },
  { title: 'landscaping Driveway Cost Guide', href: '/lawn-care' },
  { title: 'landscaping Patio Cost & Ideas', href: '/landscape-design' },
  { title: 'Hardscaping Repair Cost Guide', href: '/hardscaping' },
  { title: 'Foundation landscaping Cost', href: '/irrigation' },
  { title: 'How to Hire a Landscaper', href: '/how-to-hire-a-landscaping-contractor' },
]
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-neutral-900">
    <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <!-- Breadcrumbs -->
      <nav class="mb-6 flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
        <NuxtLink to="/" class="hover:text-blue-600 dark:hover:text-blue-400">Home</NuxtLink>
        <Icon name="heroicons:chevron-right" class="h-4 w-4" />
        <NuxtLink :to="`/${stateSlug}`" class="hover:text-blue-600 dark:hover:text-blue-400">
          {{ stateData?.name }}
        </NuxtLink>
        <Icon name="heroicons:chevron-right" class="h-4 w-4" />
        <span class="font-medium text-neutral-900 dark:text-neutral-100">
          {{ city?.name }} Landscapers
        </span>
      </nav>

      <!-- Page Header -->
      <header class="mb-6">
        <h1 class="font-heading text-3xl font-bold text-neutral-900 dark:text-white md:text-4xl">
          Landscapers in {{ city?.name }}, {{ city?.stateCode }}
        </h1>
        <p class="mt-2 text-lg text-neutral-600 dark:text-neutral-400">
          Find trusted landscapers near you. {{ contractorsData?.total || 0 }} contractors available.
        </p>
      </header>

      <!-- Link to ranked listicle page -->
      <div class="mb-6 flex items-center gap-2 text-sm">
        <NuxtLink
          :to="`/${stateSlug}/${citySlug}/best-landscapers`"
          class="inline-flex items-center gap-1.5 font-medium text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
        >
          <Icon name="heroicons:trophy" class="h-4 w-4" />
          See ranked top picks for {{ city?.name }}
          <Icon name="heroicons:arrow-right" class="h-3.5 w-3.5" />
        </NuxtLink>
      </div>

      <!-- Filters Bar -->
      <div class="mb-6 flex flex-wrap items-center gap-4">
        <div class="flex flex-wrap gap-2">
          <Button
            :variant="!selectedCategory ? 'primary' : 'secondary-outline'"
            size="sm"
            text="All"
            @click="onCategoryChange(undefined)"
          />
          <Button
            v-for="cat in categoriesData?.categories"
            :key="cat.slug"
            :variant="selectedCategory === cat.slug ? 'primary' : 'secondary-outline'"
            size="sm"
            :text="cat.name"
            @click="onCategoryChange(cat.slug)"
          />
        </div>
        <div class="ml-auto flex items-center gap-2">
          <span class="text-sm text-neutral-600 dark:text-neutral-400">Sort by:</span>
          <select
            v-model="sortBy"
            class="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm dark:border-neutral-600 dark:bg-neutral-800"
          >
            <option value="rating">Highest Rated</option>
            <option value="review_count">Most Reviews</option>
            <option value="distance">Distance</option>
          </select>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="pending" class="flex items-center justify-center py-12">
        <Icon name="heroicons:arrow-path" class="h-8 w-8 animate-spin text-blue-500" />
      </div>

      <!-- Contractor Grid -->
      <div v-else class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <ContractorCard
          v-for="contractor in contractorsData?.contractors"
          :key="contractor.id"
          :company-name="contractor.companyName"
          :location="`${contractor.cityName}, ${contractor.stateCode}`"
          :rating="contractor.rating || 0"
          :review-count="contractor.reviewCount || 0"
          :contractor-id="contractor.id"
          :contractor-slug="contractor.slug"
          :city-slug="contractor.citySlug"
          :state-code="stateSlug"
          :distance-miles="contractor.distanceMiles"
          :verification-tier="contractor.verificationTier"
          :image="buildImageUrl(contractor.metadata?.primary_image || contractor.metadata?.images?.[0])"
        >
          {{ contractor.description || contractor.metadata?.categories?.join(', ') || '' }}
        </ContractorCard>
      </div>

      <!-- Empty State -->
      <div v-if="!pending && contractorsData?.contractors?.length === 0" class="py-12 text-center">
        <Icon name="heroicons:building-office-2" class="mx-auto h-12 w-12 text-neutral-400" />
        <h2 class="mt-4 text-xl font-semibold text-neutral-900 dark:text-white">No Contractors Found</h2>
        <p class="mt-2 text-neutral-600 dark:text-neutral-400">
          Try adjusting your filters or search in a nearby city.
        </p>
      </div>

      <!-- Pagination -->
      <nav v-if="totalPages > 1" class="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
        <Button variant="secondary-outline" size="sm" text="Previous" :disabled="page <= 1" @click="page--" />
        <span class="px-4 text-sm text-neutral-600 dark:text-neutral-400">Page {{ page }} of {{ totalPages }}</span>
        <Button variant="secondary-outline" size="sm" text="Next" :disabled="!hasMore" @click="page++" />
      </nav>

      <!-- Internal links: landscaping cost guides -->
      <div class="mt-12 border-t border-neutral-200 pt-8 dark:border-neutral-700">
        <h2 class="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">landscaping Cost Guides</h2>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <NuxtLink
            v-for="guide in landscapingGuides"
            :key="guide.href"
            :to="guide.href"
            class="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-medium text-neutral-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-blue-700 dark:hover:text-blue-400"
          >
            {{ guide.title }}
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

