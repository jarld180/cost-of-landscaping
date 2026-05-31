<script setup lang="ts">
// ContractorCard component for displaying contractor listings
// Features clickable card with image, company info, rating, and CTA button
// Supports intelligent image rendering (standard img for webp/png, NuxtImage for other formats)

import { getStateSlugFromCode } from '~/utils/usStates'

interface Props {
  /**
   * The image URL or path to the contractor's image
   * @default null
   */
  image?: string | null

  /**
   * The contractor's company name
   */
  companyName: string

  /**
   * The contractor's location (e.g., "Houston, TX")
   */
  location: string

  /**
   * The contractor's rating (0-5)
   */
  rating: number

  /**
   * The number of reviews
   */
  reviewCount: number

  /**
   * The contractor's unique identifier (UUID)
   */
  contractorId: string

  /**
   * The contractor's SEO-friendly slug
   */
  contractorSlug: string

  /**
   * The city slug for building profile URL
   */
  citySlug: string

  /**
   * The state code for building profile URL (lowercase, e.g., 'nc')
   */
  stateCode?: string

  /**
   * Distance from search location in miles (optional)
   */
  distanceMiles?: number | null

  /**
   * Whether to display a border around the card
   * @default true
   */
  border?: boolean

  /**
   * The width of the border (thin = 1px, thick = 2px)
   * @default 'thin'
   */
  borderWidth?: 'thin' | 'thick'

  /**
   * The visual variant of the card
   * @default 'secondary-light-outline'
   */
  variant?: 'primary' | 'secondary' | 'primary-outline' | 'secondary-outline' | 'secondary-light-outline'

  /**
   * Verification tier — controls badge display and card highlight
   */
  verificationTier?: 'trusted_partner' | 'fully_verified' | 'basic_verified' | 'unverified' | null
}

const props = withDefaults(defineProps<Props>(), {
  image: null,
  border: true,
  borderWidth: 'thin',
  variant: 'secondary-light-outline',
  verificationTier: null
})

const isTrustedPartner = computed(() => props.verificationTier === 'trusted_partner')

const badgeTier = computed(() => {
  if (props.verificationTier === 'trusted_partner') return 'trusted_partner' as const
  if (props.verificationTier === 'fully_verified') return 'fully_verified' as const
  if (props.verificationTier === 'basic_verified') return 'basic_verified' as const
  return null
})

// Check if image should use standard img tag (webp or png)
// Use standard img for webp and png to avoid IPX processing issues
const useStandardImg = computed(() => {
  if (!props.image) return false
  const lowerImage = props.image.toLowerCase()
  return lowerImage.endsWith('.webp') || lowerImage.endsWith('.png')
})

// Build contractor profile URL with SEO-optimized structure
// Converts state code (e.g., 'SC') to state slug (e.g., 'south-carolina')
const contractorUrl = computed(() => {
  if (props.stateCode) {
    const stateSlug = getStateSlugFromCode(props.stateCode)
    return `/${stateSlug}/${props.citySlug}/landscapers/${props.contractorSlug}`
  }
  return `/${props.citySlug}/landscapers/${props.contractorSlug}`
})

// Border width classes
const borderWidthClasses = computed(() => {
  if (!props.border) return ''

  const widths = {
    thin: 'border',
    thick: 'border-2'
  }
  return widths[props.borderWidth]
})

// Variant classes for card background and border colors
const variantClasses = computed(() => {
  const variants = {
    'primary': 'bg-white dark:bg-neutral-800 border-blue-500 dark:border-blue-400',
    'secondary': 'bg-neutral-100 dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600',
    'primary-outline': 'bg-white dark:bg-neutral-800 border-blue-500 dark:border-blue-400',
    'secondary-outline': 'bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600',
    'secondary-light-outline': 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'
  }
  return variants[props.variant]
})

// Combined card classes — trusted_partner gets gold border override
const cardClasses = computed(() => {
  if (isTrustedPartner.value) {
    return 'flex flex-col rounded-2xl transition-all duration-300 hover:shadow-lg border-2 border-amber-400 bg-amber-50/30 dark:bg-amber-900/10'
  }
  return [
    'flex flex-col rounded-2xl transition-all duration-300',
    'hover:shadow-lg',
    borderWidthClasses.value,
    variantClasses.value
  ].filter(Boolean).join(' ')
})

// Calculate star rating display
const starRating = computed(() => {
  const fullStars = Math.floor(props.rating)
  const emptyStars = 5 - Math.ceil(props.rating)
  const hasHalfStar = props.rating % 1 >= 0.5

  return {
    full: fullStars,
    half: hasHalfStar ? 1 : 0,
    empty: emptyStars
  }
})
</script>

<template>
  <NuxtLink :to="contractorUrl" :class="cardClasses">
    <!-- Card Inner Container with Padding -->
    <div class="flex flex-col gap-4 p-5">
      <!-- Image Section -->
      <div v-if="image" class="aspect-[16/9] w-full overflow-hidden rounded-2xl">
        <!-- Use standard img tag for webp and png to avoid IPX issues -->
        <img
          v-if="useStandardImg"
          :src="image"
          :alt="`${companyName} - ${location}`"
          class="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
          loading="lazy"
        />
        <!-- Use NuxtImage for other formats (jpg, jpeg, etc.) -->
        <NuxtImg
          v-else
          :src="image"
          :alt="`${companyName} - ${location}`"
          class="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
          loading="lazy"
        />
      </div>

      <!-- Content Section -->
      <div class="flex flex-col gap-3">
        <!-- Verification Badge -->
        <ContractorVerifiedBadge v-if="badgeTier" :tier="badgeTier" />

        <!-- Company Name -->
        <h3 class="font-heading text-xl font-bold text-neutral-900 dark:text-neutral-50">
          {{ companyName }}
        </h3>

        <!-- Location and Distance -->
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-600 dark:text-neutral-400">
          <span class="flex items-center gap-1.5">
            <Icon name="heroicons:map-pin" class="h-4 w-4" />
            {{ location }}
          </span>
          <span v-if="distanceMiles !== null && distanceMiles !== undefined" class="flex items-center gap-1">
            <Icon name="heroicons:arrow-right-circle" class="h-4 w-4" />
            {{ distanceMiles.toFixed(1) }} mi
          </span>
        </div>

        <!-- Description Slot -->
        <div class="text-sm text-neutral-600 dark:text-neutral-300">
          <slot />
        </div>

        <!-- Rating Section -->
        <div class="flex items-center gap-2">
          <!-- Stars -->
          <div class="flex items-center gap-0.5">
            <!-- Full Stars -->
            <Icon
              v-for="i in starRating.full"
              :key="`full-${i}`"
              name="heroicons:star-solid"
              class="h-4 w-4 text-yellow-400"
            />
            <!-- Half Star -->
            <Icon
              v-if="starRating.half"
              name="heroicons:star-solid"
              class="h-4 w-4 text-yellow-400 opacity-50"
            />
            <!-- Empty Stars -->
            <Icon
              v-for="i in starRating.empty"
              :key="`empty-${i}`"
              name="heroicons:star"
              class="h-4 w-4 text-neutral-300 dark:text-neutral-600"
            />
          </div>

          <!-- Rating Number and Review Count -->
          <span class="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            {{ rating.toFixed(1) }}
          </span>
          <span class="text-sm text-neutral-500 dark:text-neutral-400">
            ({{ reviewCount }})
          </span>
        </div>

        <!-- View Profile Button -->
        <div class="mt-2">
          <Button
            text="View Profile"
            variant="primary-outline"
            size="sm"
            icon="heroicons:arrow-right"
          />
        </div>
      </div>
    </div>
  </NuxtLink>
</template>

<style scoped>
</style>

