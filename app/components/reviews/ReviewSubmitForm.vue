<script setup lang="ts">
const props = defineProps<{
  contractorId: string
  contractorName: string
}>()

const emit = defineEmits<{
  submitted: []
}>()

const name = ref('')
const email = ref('')
const stars = ref(0)
const hoverStar = ref(0)
const reviewText = ref('')
const isSubmitting = ref(false)
const submitError = ref<string | null>(null)
const submitted = ref(false)
const successMessage = ref('')

async function submit() {
  submitError.value = null

  if (!name.value.trim() || !email.value.trim() || !stars.value || !reviewText.value.trim()) {
    submitError.value = 'All fields are required.'
    return
  }
  if (reviewText.value.trim().length < 10) {
    submitError.value = 'Review must be at least 10 characters.'
    return
  }

  isSubmitting.value = true
  try {
    const res = await $fetch<{ success: boolean; message: string }>('/api/public/reviews/submit', {
      method: 'POST',
      body: {
        contractorId: props.contractorId,
        reviewerName: name.value.trim(),
        reviewerEmail: email.value.trim(),
        stars: stars.value,
        reviewText: reviewText.value.trim(),
      },
    })
    successMessage.value = res?.message || 'Your review has been submitted.'
    submitted.value = true
    emit('submitted')
  } catch (err: any) {
    submitError.value = err?.data?.message || err?.message || 'Something went wrong. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-700 dark:bg-neutral-900">
    <h3 class="mb-4 text-lg font-bold text-neutral-900 dark:text-white">
      Write a Review for {{ contractorName }}
    </h3>

    <div v-if="submitted" class="flex flex-col items-center gap-3 py-6 text-center">
      <Icon name="heroicons:check-circle" class="h-10 w-10 text-emerald-500" />
      <p class="font-semibold text-neutral-800 dark:text-white">{{ successMessage }}</p>
    </div>

    <form v-else class="space-y-4" @submit.prevent="submit">
      <!-- Star picker -->
      <div>
        <p class="mb-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">Rating</p>
        <div class="flex gap-1">
          <button
            v-for="i in 5"
            :key="i"
            type="button"
            class="transition-transform hover:scale-110"
            @click="stars = i"
            @mouseenter="hoverStar = i"
            @mouseleave="hoverStar = 0"
          >
            <Icon
              name="heroicons:star-solid"
              class="h-8 w-8"
              :class="i <= (hoverStar || stars) ? 'text-amber-400' : 'text-neutral-300 dark:text-neutral-600'"
            />
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Your name</label>
          <input
            v-model="name"
            type="text"
            placeholder="Jane Smith"
            maxlength="100"
            class="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-blue-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:placeholder-neutral-500"
          />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Email (not published)</label>
          <input
            v-model="email"
            type="email"
            placeholder="you@example.com"
            maxlength="200"
            class="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-blue-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:placeholder-neutral-500"
          />
        </div>
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Your review</label>
        <textarea
          v-model="reviewText"
          rows="4"
          maxlength="2000"
          placeholder="Tell others about your experience with this contractor..."
          class="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-blue-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:placeholder-neutral-500"
        />
        <p class="mt-1 text-right text-xs text-neutral-400">{{ reviewText.length }}/2000</p>
      </div>

      <div v-if="submitError" class="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
        {{ submitError }}
      </div>

      <button
        type="submit"
        :disabled="isSubmitting || !stars"
        class="w-full rounded-xl bg-amber-400 px-6 py-3 font-bold text-neutral-900 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span v-if="isSubmitting">Submitting...</span>
        <span v-else>Submit Review</span>
      </button>
      <p class="text-center text-xs text-neutral-400">Your review helps others find great landscape pros.</p>
    </form>
  </div>
</template>
