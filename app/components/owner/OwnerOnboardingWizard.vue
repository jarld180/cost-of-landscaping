<script setup lang="ts">
import type { OwnerOnboardingStatusResponse } from '~/utils/ownerBadge'

type OnboardingStep = 'welcome' | 'snippet' | 'verify' | 'complete'

const config = useRuntimeConfig()
const { data, pending, error, refresh } = await useFetch<OwnerOnboardingStatusResponse>('/api/owner/onboarding-status')

const step = ref<OnboardingStep>('welcome')

const steps: OnboardingStep[] = ['welcome', 'snippet', 'verify', 'complete']

const contractor = computed(() => data.value?.contractor || null)
const completed = computed(() => data.value?.completed === true)
const currentStepIndex = computed(() => steps.indexOf(step.value))

watchEffect(() => {
  if (contractor.value?.embedVerified || completed.value) {
    step.value = 'complete'
  }
})

function goToStep(nextStep: OnboardingStep) {
  step.value = nextStep
}

function goToDashboard() {
  return navigateTo('/owner')
}
</script>

<template>
  <div class="mx-auto max-w-5xl">
    <div class="mb-8">
      <div class="mb-4 flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400">
        <Icon name="heroicons:shield-check" class="h-5 w-5" />
        Verified badge setup
      </div>
      <h1 class="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
        Get more from your claimed profile
      </h1>
      <p class="mt-2 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
        Add the Cost of landscape badge to your website so your listing can earn verified status and a stronger trust signal.
      </p>
    </div>

    <div v-if="pending" class="flex items-center justify-center rounded-lg border border-neutral-200 bg-white py-16 dark:border-neutral-700 dark:bg-neutral-800">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
    </div>

    <div v-else-if="error" class="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
      <p class="text-sm text-red-700 dark:text-red-300">
        We couldn't load your onboarding status. Please try again.
      </p>
      <Button text="Retry" variant="secondary-outline" size="sm" class="mt-4" @click="refresh()" />
    </div>

    <div v-else-if="!contractor" class="rounded-lg border border-neutral-200 bg-white p-8 text-center dark:border-neutral-700 dark:bg-neutral-800">
      <Icon name="heroicons:building-office-2" class="mx-auto h-12 w-12 text-neutral-400" />
      <h2 class="mt-4 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
        No claimed business found
      </h2>
      <p class="mx-auto mt-2 max-w-md text-sm text-neutral-600 dark:text-neutral-400">
        We couldn't find a claimed business for this account. You can still go to your dashboard to manage your profile.
      </p>
      <Button text="Go to Dashboard" location="/owner" class="mt-6" />
    </div>

    <template v-else>
      <div class="mb-6 grid grid-cols-4 gap-2" aria-label="Onboarding progress">
        <div
          v-for="(stepName, index) in steps"
          :key="stepName"
          class="h-2 rounded-full transition-colors"
          :class="index <= currentStepIndex ? 'bg-blue-500' : 'bg-neutral-200 dark:bg-neutral-700'"
        />
      </div>

      <OnboardingStepWelcome
        v-if="step === 'welcome'"
        :contractor="contractor"
        @next="goToStep('snippet')"
      />

      <OnboardingStepSnippet
        v-else-if="step === 'snippet'"
        :contractor="contractor"
        :site-url="config.public.siteUrl"
        @next="goToStep('verify')"
      />

      <OnboardingStepVerify
        v-else-if="step === 'verify'"
        :contractor="contractor"
        @verified="goToStep('complete')"
        @refresh="refresh()"
      />

      <OnboardingStepComplete
        v-else
        :contractor="contractor"
        :already-completed="completed"
        @dashboard="goToDashboard"
      />
    </template>
  </div>
</template>
