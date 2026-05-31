<script setup lang="ts">
interface Props {
  states: Array<{
    name: string
    slug: string
    abbreviation: string
    hasContractors: boolean
    topCities: Array<{ name: string; slug: string; contractorCount: number }>
  }>
}

defineProps<Props>()
</script>

<template>
  <section class="py-12 md:py-16">
    <div class="container mx-auto px-4">
      <Eyebrow text="Browse by Location" class="mb-4" variant="blue-blue" size="md" />
      <h2 class="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white md:text-4xl mb-4">
        Find Contractors by State
      </h2>
      <p class="text-lg text-neutral-600 dark:text-neutral-400 mb-8 max-w-3xl">
        Browse our comprehensive directory of landscape pros across the United States. Select your state to find top-rated professionals in your city.
      </p>
      
      <div class="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        <div v-for="state in states" :key="state.abbreviation">
          <NuxtLink 
            :to="`/${state.slug}`"
            class="font-semibold text-neutral-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400"
          >
            {{ state.name }}
          </NuxtLink>
          
          <div v-if="state.hasContractors && state.topCities.length > 0" class="mt-2 space-y-1">
            <NuxtLink
              v-for="city in state.topCities"
              :key="city.slug"
              :to="`/${state.slug}/${city.slug}/landscapers/`"
              class="block text-sm text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400"
            >
              {{ city.name }}
            </NuxtLink>
          </div>
          
          <p v-else class="mt-2 text-sm text-neutral-500 dark:text-neutral-500">
            Coming soon
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
