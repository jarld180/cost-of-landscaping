<script setup lang="ts">
/**
 * Owner Dashboard
 *
 * Lists all businesses claimed by the current user with links to edit.
 */

definePageMeta({
  layout: 'owner'
})

useSeoMeta({
  title: 'My Businesses',
  robots: 'noindex, nofollow'
})

import { useClipboard } from '@vueuse/core'
import type { OwnerOnboardingStatusResponse } from '~/utils/ownerBadge'
import { getOwnerBadgeHtml, getOwnerBadgeUrl, getOwnerProfileUrl } from '~/utils/ownerBadge'

interface Contractor {
  id: string
  companyName: string
  slug: string
  description: string | null
  phone: string | null
  email: string | null
  rating: number | null
  reviewCount: number | null
  status: string
  claimedAt: string | null
  embedToken: string | null
  city: {
    name: string
    slug: string
    stateCode: string
  } | null
}

interface ContractorsResponse {
  contractors: Contractor[]
  total: number
}

const { data, pending, error, refresh } = await useFetch<ContractorsResponse>('/api/owner/contractors')
const { data: onboardingStatus } = await useFetch<OwnerOnboardingStatusResponse>('/api/owner/onboarding-status')

const contractors = computed(() => data.value?.contractors || [])
const showOnboardingBanner = computed(() => {
  return onboardingStatus.value?.completed === false && onboardingStatus.value.hasUnverifiedContractors
})

// Build the public profile URL with SEO-optimized structure
function getProfileUrl(contractor: Contractor, withUtm = false): string {
  const config = useRuntimeConfig()
  return getOwnerProfileUrl(contractor, config.public.siteUrl, withUtm)
}

// Badge embed functionality
const { copy } = useClipboard()
const copiedContractorId = ref<string | null>(null)
const copiedType = ref<'html' | 'svg' | 'png' | null>(null)

// Support both SVG and PNG formats, use runtime config for base URL
function getBadgeUrl(embedToken: string, format: 'svg' | 'png' = 'svg'): string {
  const config = useRuntimeConfig()
  return getOwnerBadgeUrl(embedToken, config.public.siteUrl, format)
}

/**
 * Generate responsive, SEO-friendly embed code with backlink and attribution.
 *
 * Includes:
 * - UTM parameters for traffic attribution
 * - referrerpolicy="origin" to improve verification success on strict sites
 * - loading="lazy" and decoding="async" for performance
 * - Inline responsive styles that work without external CSS
 */
function getBadgeHtml(embedToken: string, profileUrl: string, format: 'svg' | 'png' = 'svg'): string {
  const config = useRuntimeConfig()
  return getOwnerBadgeHtml(embedToken, profileUrl, config.public.siteUrl, format)
}

async function copyToClipboard(text: string, contractorId: string, type: 'html' | 'svg' | 'png') {
  await copy(text)
  copiedContractorId.value = contractorId
  copiedType.value = type
  setTimeout(() => {
    if (copiedContractorId.value === contractorId) {
      copiedContractorId.value = null
      copiedType.value = null
    }
  }, 2000)
}

// Track expanded badge sections
const expandedBadgeSections = ref<Set<string>>(new Set())

function toggleBadgeSection(contractorId: string) {
  if (expandedBadgeSections.value.has(contractorId)) {
    expandedBadgeSections.value.delete(contractorId)
  } else {
    expandedBadgeSections.value.add(contractorId)
  }
}
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
        My Businesses
      </h1>
      <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Manage your claimed business profiles
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="pending" class="flex items-center justify-center py-12">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
      <p class="text-red-600 dark:text-red-400">
        Failed to load your businesses. Please try again.
      </p>
      <Button text="Retry" variant="secondary-outline" size="sm" class="mt-4" @click="refresh()" />
    </div>

    <!-- Empty State -->
    <div v-else-if="contractors.length === 0" class="rounded-lg border border-neutral-200 bg-white p-8 text-center dark:border-neutral-700 dark:bg-neutral-800">
      <Icon name="heroicons:building-office-2" class="mx-auto h-12 w-12 text-neutral-400" />
      <h3 class="mt-4 text-lg font-medium text-neutral-900 dark:text-neutral-100">
        No businesses yet
      </h3>
      <p class="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        You haven't claimed any business profiles. Find your business in our directory and claim it.
      </p>
      <Button text="Find Your Business" location="/search" class="mt-6" />
    </div>

    <!-- Contractors List -->
    <div v-else class="space-y-4">
      <OnboardingBanner v-if="showOnboardingBanner" />

      <div
        v-for="contractor in contractors"
        :key="contractor.id"
        class="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800"
      >
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <!-- Business Info -->
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {{ contractor.companyName }}
            </h3>
            <p v-if="contractor.city" class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              {{ contractor.city.name }}, {{ contractor.city.stateCode }}
            </p>
            <div v-if="contractor.rating" class="mt-2 flex items-center gap-2">
              <Icon name="heroicons:star-solid" class="h-4 w-4 text-yellow-500" />
              <span class="text-sm text-neutral-600 dark:text-neutral-400">
                {{ contractor.rating.toFixed(1) }} ({{ contractor.reviewCount }} reviews)
              </span>
            </div>
            <p v-if="contractor.phone" class="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              {{ contractor.phone }}
            </p>
          </div>

          <!-- Actions -->
          <div class="flex flex-shrink-0 gap-2">
            <Button
              text="View"
              icon="heroicons:eye"
              variant="secondary-outline"
              size="sm"
              :location="getProfileUrl(contractor)"
              external
            />
            <Button
              text="Edit"
              icon="heroicons:pencil-square"
              size="sm"
              :location="`/owner/contractors/${contractor.id}/edit`"
            />
          </div>
        </div>

        <!-- Badge Embed Section -->
        <div class="mt-4 border-t border-neutral-200 pt-4 dark:border-neutral-700">
          <button
            type="button"
            class="flex w-full items-center justify-between text-left"
            @click="toggleBadgeSection(contractor.id)"
          >
            <div class="flex items-center gap-2">
              <Icon name="heroicons:code-bracket" class="h-5 w-5 text-orange-500" />
              <span class="text-sm font-medium text-neutral-700 dark:text-neutral-300">Badge Embed</span>
            </div>
            <Icon
              :name="expandedBadgeSections.has(contractor.id) ? 'heroicons:chevron-up' : 'heroicons:chevron-down'"
              class="h-4 w-4 text-neutral-400"
            />
          </button>

          <!-- Expanded Badge Section -->
          <div v-if="expandedBadgeSections.has(contractor.id)" class="mt-4 space-y-4">
            <!-- Show message if no embed token -->
            <div v-if="!contractor.embedToken" class="rounded-md bg-yellow-50 p-3 dark:bg-yellow-900/20">
              <p class="text-xs text-yellow-700 dark:text-yellow-400">
                Badge embed is not yet available for this business. Please contact support if you need assistance.
              </p>
            </div>

            <!-- Badge content when token is available -->
            <template v-else>
              <!-- Badge Preview -->
              <div class="flex items-center gap-4">
                <a :href="getProfileUrl(contractor, true)" target="_blank" rel="noopener" class="inline-block">
                  <img
                    :src="getBadgeUrl(contractor.embedToken, 'svg')"
                    alt="Verified on Cost of landscape"
                    class="h-[75px] w-[200px]"
                    loading="lazy"
                  />
                </a>
                <span class="text-xs text-neutral-500 dark:text-neutral-400">Badge preview (click to test link)</span>
              </div>

              <!-- HTML Embed Code (Recommended) -->
              <div>
                <label class="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                  HTML Embed Code (Recommended)
                </label>
                <div class="relative">
                  <pre class="rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-xs font-mono text-neutral-700 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-300 overflow-x-auto whitespace-pre-wrap break-all">{{ getBadgeHtml(contractor.embedToken, getProfileUrl(contractor), 'svg') }}</pre>
                  <button
                    type="button"
                    class="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md bg-orange-500 px-2 py-1 text-xs font-medium text-white hover:bg-orange-600 transition-colors"
                    @click="copyToClipboard(getBadgeHtml(contractor.embedToken!, getProfileUrl(contractor), 'svg'), contractor.id, 'html')"
                  >
                    <Icon
                      :name="copiedType === 'html' && copiedContractorId === contractor.id ? 'heroicons:check' : 'heroicons:clipboard'"
                      class="h-3 w-3"
                    />
                    {{ copiedType === 'html' && copiedContractorId === contractor.id ? 'Copied!' : 'Copy' }}
                  </button>
                </div>
              </div>

              <!-- Image URL Only (SVG) -->
              <div>
                <label class="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                  Image URL Only (SVG)
                </label>
                <div class="flex gap-2">
                  <input
                    type="text"
                    readonly
                    :value="getBadgeUrl(contractor.embedToken, 'svg')"
                    class="flex-1 rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-xs font-mono text-neutral-700 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-300"
                  />
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 rounded-md bg-neutral-200 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-300 transition-colors dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600"
                    @click="copyToClipboard(getBadgeUrl(contractor.embedToken!, 'svg'), contractor.id, 'svg')"
                  >
                    <Icon
                      :name="copiedType === 'svg' && copiedContractorId === contractor.id ? 'heroicons:check' : 'heroicons:clipboard'"
                      class="h-4 w-4"
                    />
                    {{ copiedType === 'svg' && copiedContractorId === contractor.id ? 'Copied!' : 'Copy' }}
                  </button>
                </div>
              </div>

              <!-- PNG URL (Alternative for platforms that block SVG) -->
              <div>
                <label class="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                  Image URL (PNG) - Use if SVG is blocked
                </label>
                <div class="flex gap-2">
                  <input
                    type="text"
                    readonly
                    :value="getBadgeUrl(contractor.embedToken, 'png')"
                    class="flex-1 rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-xs font-mono text-neutral-700 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-300"
                  />
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 rounded-md bg-neutral-200 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-300 transition-colors dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600"
                    @click="copyToClipboard(getBadgeUrl(contractor.embedToken!, 'png'), contractor.id, 'png')"
                  >
                    <Icon
                      :name="copiedType === 'png' && copiedContractorId === contractor.id ? 'heroicons:check' : 'heroicons:clipboard'"
                      class="h-4 w-4"
                    />
                    {{ copiedType === 'png' && copiedContractorId === contractor.id ? 'Copied!' : 'Copy' }}
                  </button>
                </div>
              </div>

              <!-- Instructions -->
              <div class="rounded-md bg-blue-50 p-3 dark:bg-blue-900/20">
                <h4 class="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-2">
                  Add this badge to your website
                </h4>
                <ol class="space-y-1 text-xs text-blue-700 dark:text-blue-400 list-decimal list-inside">
                  <li>Copy the HTML embed code above (recommended for SEO benefits)</li>
                  <li>Paste it into your website's HTML where you want the badge to appear</li>
                  <li>The badge will link back to your verified profile on Cost of landscape</li>
                  <li>Once we detect the badge on your site, your profile will be marked as verified</li>
                </ol>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

