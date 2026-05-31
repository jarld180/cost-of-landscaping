<script setup lang="ts">
definePageMeta({ layout: 'default' })

const route = useRoute()
const slug = computed(() => route.params.slug as string)

const { data: contractor, error } = await useFetch(
  () => `/api/public/reviews/contractor-lookup/${slug.value}`
)

if (error.value || !contractor.value) {
  throw createError({ statusCode: 404, statusMessage: 'Contractor Not Found' })
}

useSeoMeta({
  title: `Review ${contractor.value.companyName} — Cost of landscape`,
  description: `Leave a review for ${contractor.value.companyName} in ${contractor.value.cityName}.`,
  robots: 'noindex',
})

const submitted = ref(false)
</script>

<template>
  <div class="mx-auto max-w-xl px-4 py-16">
    <div class="mb-8 text-center">
      <p class="mb-2 text-sm font-medium text-amber-500 uppercase tracking-widest">Leave a Review</p>
      <h1 class="font-heading text-3xl font-bold text-neutral-900 dark:text-white">
        {{ contractor?.companyName }}
      </h1>
      <p class="mt-1 text-neutral-500">{{ contractor?.cityName }}, {{ contractor?.stateCode }}</p>
    </div>

    <ReviewsReviewSubmitForm
      v-if="contractor && !submitted"
      :contractor-id="contractor.id"
      :contractor-name="contractor.companyName"
      @submitted="submitted = true"
    />

    <div v-if="submitted" class="mt-6 text-center text-sm text-neutral-500">
      <NuxtLink
        :to="`/${contractor?.stateSlug}/${contractor?.citySlug}/landscapers/${slug}`"
        class="text-blue-600 hover:underline dark:text-blue-400"
      >
        Back to {{ contractor?.companyName }}'s profile →
      </NuxtLink>
    </div>
  </div>
</template>
