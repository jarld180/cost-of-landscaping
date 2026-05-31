<script setup lang="ts">
import type { OwnerOnboardingCheckBadgeResponse, OwnerOnboardingContractor } from '~/utils/ownerBadge'

type VerifyState = 'idle' | 'checking' | 'verified' | 'not_found' | 'no_website'

const props = defineProps<{
  contractor: OwnerOnboardingContractor
}>()

const emit = defineEmits<{
  verified: []
  refresh: []
}>()

const state = ref<VerifyState>(props.contractor.embedVerified ? 'verified' : props.contractor.website ? 'idle' : 'no_website')
const website = ref(props.contractor.website || '')
const errorMessage = ref<string | null>(null)
const isSavingWebsite = ref(false)

watch(() => props.contractor, (contractor) => {
  if (contractor.embedVerified) state.value = 'verified'
  else if (!contractor.website) state.value = 'no_website'
}, { deep: true })

async function checkBadge() {
  errorMessage.value = null
  state.value = 'checking'

  try {
    const response = await $fetch<OwnerOnboardingCheckBadgeResponse>('/api/owner/onboarding/check-badge', {
      method: 'POST',
      body: { contractorId: props.contractor.id },
    })

    if (response.detected) {
      state.value = 'verified'
      emit('refresh')
      return
    }

    state.value = response.reason === 'no_website' ? 'no_website' : 'not_found'
  } catch (error) {
    state.value = 'not_found'
    errorMessage.value = error instanceof Error ? error.message : 'Unable to check badge right now.'
  }
}

async function saveWebsiteAndCheck() {
  errorMessage.value = null
  isSavingWebsite.value = true

  try {
    await $fetch(`/api/owner/contractors/${props.contractor.id}`, {
      method: 'PATCH',
      body: { website: website.value },
    })
    emit('refresh')
    await checkBadge()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Please enter a valid website URL.'
  } finally {
    isSavingWebsite.value = false
  }
}
</script>

<template>
  <div class="rounded-lg border border-neutral-200 bg-white p-8 dark:border-neutral-700 dark:bg-neutral-800">
    <Badge text="Step 3 of 4" icon="heroicons:magnifying-glass" variant="blue-blue" size="sm" />
    <h2 class="mt-6 text-3xl font-bold text-neutral-900 dark:text-neutral-100">
      Checking for your badge...
    </h2>
    <p class="mt-3 max-w-2xl text-sm leading-6 text-neutral-600 dark:text-neutral-400">
      Verification happens automatically when someone visits your website and the badge loads. You can also run a quick check against your website now.
    </p>

    <div class="mt-8 rounded-lg border border-neutral-200 p-6 dark:border-neutral-700">
      <div v-if="state === 'checking'" class="flex items-center gap-3 text-blue-600 dark:text-blue-400">
        <div class="h-6 w-6 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        <span class="text-sm font-medium">Checking your website for the badge snippet...</span>
      </div>

      <div v-else-if="state === 'verified'" class="rounded-md bg-green-50 p-4 dark:bg-green-900/20">
        <div class="flex items-start gap-3">
          <Icon name="heroicons:check-circle" class="h-6 w-6 text-green-600" />
          <div>
            <h3 class="font-semibold text-green-900 dark:text-green-200">Success! Badge detected.</h3>
            <p class="mt-1 text-sm text-green-800 dark:text-green-300">Your profile is now badge verified.</p>
          </div>
        </div>
      </div>

      <div v-else-if="state === 'no_website'" class="space-y-4">
        <div class="rounded-md bg-yellow-50 p-4 dark:bg-yellow-900/20">
          <h3 class="font-semibold text-yellow-900 dark:text-yellow-200">Add your website URL first</h3>
          <p class="mt-1 text-sm text-yellow-800 dark:text-yellow-300">We need your public website URL before we can check for the badge.</p>
        </div>
        <form class="space-y-3" @submit.prevent="saveWebsiteAndCheck">
          <label for="onboarding-website" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Website URL</label>
          <input
            id="onboarding-website"
            v-model="website"
            type="url"
            required
            placeholder="https://yourcompany.com"
            class="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
          />
          <Button type="submit" :text="isSavingWebsite ? 'Saving...' : 'Save website and check badge'" :loading="isSavingWebsite" />
        </form>
      </div>

      <div v-else class="space-y-4">
        <div v-if="state === 'not_found'" class="rounded-md bg-orange-50 p-4 dark:bg-orange-900/20">
          <h3 class="font-semibold text-orange-900 dark:text-orange-200">Badge not detected yet</h3>
          <ul class="mt-2 list-inside list-disc space-y-1 text-sm text-orange-800 dark:text-orange-300">
            <li>Make sure the snippet is on a publicly accessible page.</li>
            <li>If you just added it, it may take a few minutes for caching to clear.</li>
            <li>The <code>referrerpolicy='origin'</code> attribute must be present.</li>
          </ul>
        </div>
        <p class="text-sm text-neutral-600 dark:text-neutral-400">
          If the badge is on your site but not found yet, we'll still verify automatically when the badge loads from your website.
        </p>
        <Button text="Check my website now" icon="heroicons:arrow-path" @click="checkBadge" />
      </div>
    </div>

    <p v-if="errorMessage" class="mt-4 text-sm text-red-600 dark:text-red-400">{{ errorMessage }}</p>

    <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
      <Button text="Continue" icon="heroicons:arrow-right" @click="state === 'verified' ? $emit('verified') : $emit('verified')" />
      <Button text="Go to Dashboard" variant="secondary-outline" location="/owner" />
    </div>
  </div>
</template>
