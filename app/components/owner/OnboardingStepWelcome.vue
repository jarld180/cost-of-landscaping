<script setup lang="ts">
import type { OwnerOnboardingContractor } from '~/utils/ownerBadge'

defineProps<{
  contractor: OwnerOnboardingContractor
}>()

defineEmits<{
  next: []
}>()
</script>

<template>
  <div class="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
    <div class="rounded-lg border border-neutral-200 bg-white p-8 dark:border-neutral-700 dark:bg-neutral-800">
      <Badge text="Step 1 of 4" icon="heroicons:sparkles" variant="blue-blue" size="sm" />
      <h2 class="mt-6 text-3xl font-bold text-neutral-900 dark:text-neutral-100">
        Welcome, {{ contractor.companyName }}! Let's get your profile verified.
      </h2>
      <p class="mt-4 text-base leading-7 text-neutral-600 dark:text-neutral-400">
        Verified profiles stand out in contractor search results. Adding your badge helps us confirm your website, gives homeowners a clear trust signal, and can improve your listing visibility.
      </p>

      <div class="mt-6 grid gap-3 sm:grid-cols-3">
        <div class="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
          <Icon name="heroicons:arrow-trending-up" class="h-6 w-6 text-blue-500" />
          <p class="mt-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Higher ranking</p>
          <p class="mt-1 text-xs text-neutral-600 dark:text-neutral-400">Verified listings can earn stronger placement.</p>
        </div>
        <div class="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
          <Icon name="heroicons:check-badge" class="h-6 w-6 text-green-600" />
          <p class="mt-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Verified badge</p>
          <p class="mt-1 text-xs text-neutral-600 dark:text-neutral-400">Show customers your profile is confirmed.</p>
        </div>
        <div class="rounded-lg bg-orange-50 p-4 dark:bg-orange-900/20">
          <Icon name="heroicons:hand-thumb-up" class="h-6 w-6 text-orange-500" />
          <p class="mt-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">More trust</p>
          <p class="mt-1 text-xs text-neutral-600 dark:text-neutral-400">Give homeowners another reason to contact you.</p>
        </div>
      </div>

      <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button text="Next" icon="heroicons:arrow-right" @click="$emit('next')" />
        <Button text="Skip for now" variant="ghost" location="/owner" />
      </div>
    </div>

    <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-700 dark:bg-neutral-900">
      <p class="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Profile preview</p>
      <div class="mt-4 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{{ contractor.companyName }}</h3>
            <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">landscape contractor profile</p>
          </div>
          <Badge text="Verified" icon="heroicons:check-badge" variant="blue-blue" size="sm" />
        </div>
        <div class="mt-5 flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
          <Icon name="heroicons:star-solid" class="h-5 w-5 text-yellow-500" />
          Trust signal visible to potential customers
        </div>
      </div>
    </div>
  </div>
</template>
