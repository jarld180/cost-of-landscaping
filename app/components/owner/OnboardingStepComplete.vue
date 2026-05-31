<script setup lang="ts">
import type { OwnerOnboardingCompleteResponse, OwnerOnboardingContractor } from '~/utils/ownerBadge'

const props = defineProps<{
  contractor: OwnerOnboardingContractor
  alreadyCompleted: boolean
}>()

const emit = defineEmits<{
  dashboard: []
}>()

const isCompleting = ref(false)
const errorMessage = ref<string | null>(null)

async function completeOnboarding() {
  errorMessage.value = null
  isCompleting.value = true

  try {
    const response = await $fetch<OwnerOnboardingCompleteResponse>('/api/owner/onboarding/complete', {
      method: 'POST',
    })
    await navigateTo(response.redirectUrl || '/owner')
    emit('dashboard')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to complete onboarding.'
  } finally {
    isCompleting.value = false
  }
}
</script>

<template>
  <div class="rounded-lg border border-neutral-200 bg-white p-8 dark:border-neutral-700 dark:bg-neutral-800">
    <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
      <Icon name="heroicons:check-badge" class="h-9 w-9 text-green-600 dark:text-green-400" />
    </div>
    <div class="mx-auto mt-6 max-w-2xl text-center">
      <Badge :text="contractor.embedVerified ? 'Already verified' : 'Step 4 of 4'" icon="heroicons:sparkles" variant="blue-blue" size="sm" />
      <h2 class="mt-5 text-3xl font-bold text-neutral-900 dark:text-neutral-100">
        {{ contractor.embedVerified ? 'Your badge is verified!' : 'You’re all set for now.' }}
      </h2>
      <p class="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
        Your dashboard remains available at any time. Badge verification can happen instantly from the checker or automatically when your badge loads from your website.
      </p>
    </div>

    <div class="mt-8 grid gap-4 md:grid-cols-3">
      <div class="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
        <h3 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Basic Verified</h3>
        <p class="mt-2 text-sm text-neutral-600 dark:text-neutral-400">Phone verified OR badge detected.</p>
      </div>
      <div class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <h3 class="text-sm font-semibold text-blue-900 dark:text-blue-200">Fully Verified</h3>
        <p class="mt-2 text-sm text-blue-800 dark:text-blue-300">Badge plus Certificate of Insurance submitted.</p>
      </div>
      <div class="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
        <h3 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Trusted Partner</h3>
        <p class="mt-2 text-sm text-neutral-600 dark:text-neutral-400">Manual admin designation for top partners.</p>
      </div>
    </div>

    <div class="mt-8 rounded-lg bg-neutral-50 p-5 dark:bg-neutral-900">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 class="font-semibold text-neutral-900 dark:text-neutral-100">Want Fully Verified status?</h3>
          <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Upload your Certificate of Insurance from your profile editor.</p>
        </div>
        <Button text="Upload Certificate of Insurance" :location="`/owner/contractors/${contractor.id}/edit`" variant="secondary-outline" size="sm" />
      </div>
    </div>

    <p v-if="errorMessage" class="mt-4 text-center text-sm text-red-600 dark:text-red-400">{{ errorMessage }}</p>

    <div class="mt-8 flex justify-center">
      <Button
        :text="alreadyCompleted ? 'Go to Dashboard' : 'Finish and Go to Dashboard'"
        icon="heroicons:arrow-right"
        :loading="isCompleting"
        @click="completeOnboarding"
      />
    </div>
  </div>
</template>
