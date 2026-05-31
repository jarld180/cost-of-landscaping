<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import type { OwnerOnboardingContractor } from '~/utils/ownerBadge'
import { getOwnerBadgeHtml, getOwnerBadgeUrl } from '~/utils/ownerBadge'

const props = defineProps<{
  contractor: OwnerOnboardingContractor
  siteUrl: string
}>()

defineEmits<{
  next: []
}>()

const { copy } = useClipboard()
const copiedType = ref<'html' | 'png' | null>(null)

const badgeSvgUrl = computed(() => props.contractor.embedToken ? getOwnerBadgeUrl(props.contractor.embedToken, props.siteUrl, 'svg') : '')
const badgePngUrl = computed(() => props.contractor.embedToken ? getOwnerBadgeUrl(props.contractor.embedToken, props.siteUrl, 'png') : '')
const badgeHtml = computed(() => props.contractor.embedToken ? getOwnerBadgeHtml(props.contractor.embedToken, props.contractor.profileUrl, props.siteUrl, 'svg') : '')

const platformTips = [
  ['WordPress', 'Paste into a Custom HTML block or widget.'],
  ['Wix', 'Use the Embed HTML element in the editor.'],
  ['Squarespace', 'Add a Code Block in your footer or sidebar.'],
  ['GoDaddy Website Builder', 'Use the HTML section.'],
  ['Custom HTML site', 'Paste into your footer or about page.'],
]

async function copySnippet(text: string, type: 'html' | 'png') {
  await copy(text)
  copiedType.value = type
  setTimeout(() => {
    if (copiedType.value === type) copiedType.value = null
  }, 2000)
}
</script>

<template>
  <div class="rounded-lg border border-neutral-200 bg-white p-8 dark:border-neutral-700 dark:bg-neutral-800">
    <Badge text="Step 2 of 4" icon="heroicons:code-bracket" variant="blue-blue" size="sm" />
    <h2 class="mt-6 text-3xl font-bold text-neutral-900 dark:text-neutral-100">
      Add the badge to your website
    </h2>
    <p class="mt-3 max-w-2xl text-sm leading-6 text-neutral-600 dark:text-neutral-400">
      Copy this snippet into your website. The badge links to your public profile and includes the referrer policy needed for automatic verification.
    </p>

    <div v-if="!contractor.embedToken" class="mt-6 rounded-md bg-yellow-50 p-4 dark:bg-yellow-900/20">
      <p class="text-sm text-yellow-800 dark:text-yellow-300">
        Badge embed is not available for this business yet. Please contact support if this persists.
      </p>
    </div>

    <template v-else>
      <div class="mt-8 grid gap-6 lg:grid-cols-[240px_1fr]">
        <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-700 dark:bg-neutral-900">
          <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Live badge preview</p>
          <a :href="contractor.profileUrl" target="_blank" rel="noopener" class="inline-block">
            <img
              :src="badgeSvgUrl"
              alt="Verified on Cost of landscape"
              class="h-[75px] w-[200px]"
              loading="lazy"
            />
          </a>
        </div>

        <div>
          <div class="mb-2 flex items-center justify-between gap-3">
            <label class="text-sm font-semibold text-neutral-700 dark:text-neutral-300">HTML Embed Code</label>
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-md bg-blue-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-600"
              @click="copySnippet(badgeHtml, 'html')"
            >
              <Icon :name="copiedType === 'html' ? 'heroicons:check' : 'heroicons:clipboard'" class="h-4 w-4" />
              {{ copiedType === 'html' ? 'Copied!' : 'Copy' }}
            </button>
          </div>
          <pre class="max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-md border border-neutral-300 bg-neutral-50 p-4 text-xs font-mono text-neutral-700 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-300">{{ badgeHtml }}</pre>
        </div>
      </div>

      <div class="mt-6 rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">PNG URL fallback</p>
            <p class="mt-1 break-all text-xs font-mono text-neutral-600 dark:text-neutral-400">{{ badgePngUrl }}</p>
          </div>
          <button
            type="button"
            class="inline-flex items-center justify-center gap-1 rounded-md bg-neutral-200 px-3 py-2 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600"
            @click="copySnippet(badgePngUrl, 'png')"
          >
            <Icon :name="copiedType === 'png' ? 'heroicons:check' : 'heroicons:clipboard'" class="h-4 w-4" />
            {{ copiedType === 'png' ? 'Copied!' : 'Copy PNG URL' }}
          </button>
        </div>
      </div>

      <div class="mt-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
        <h3 class="text-sm font-semibold text-blue-900 dark:text-blue-200">Platform-specific tips</h3>
        <div class="mt-3 space-y-2">
          <details v-for="([platform, tip]) in platformTips" :key="platform" class="rounded-md bg-white p-3 dark:bg-neutral-800">
            <summary class="cursor-pointer text-sm font-medium text-neutral-900 dark:text-neutral-100">{{ platform }}</summary>
            <p class="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{{ tip }}</p>
          </details>
        </div>
      </div>
    </template>

    <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
      <Button text="I've added the badge" icon="heroicons:arrow-right" :disabled="!contractor.embedToken" @click="$emit('next')" />
      <Button text="Skip for now" variant="ghost" location="/owner" />
    </div>
  </div>
</template>
