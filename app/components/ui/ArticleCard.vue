<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  /**
   * The image URL to display on the left side
   */
  image?: string | null

  /**
   * The visual variant of the article card
   * @default 'secondary-light-outline'
   */
  variant?: 'primary' | 'secondary' | 'primary-outline' | 'secondary-outline' | 'secondary-light-outline'

  /**
   * Optional eyebrow text displayed above the heading
   */
  eyebrow?: string | null

  /**
   * The main heading text
   */
  heading?: string | null

  /**
   * Whether to display a border around the card
   * @default false
   */
  border?: boolean

  /**
   * The width of the border (thin = 1px, thick = 2px)
   * @default 'thin'
   */
  borderWidth?: 'thin' | 'thick'

  /**
   * URL or route to the article. When provided, the entire card becomes a clickable link
   */
  to?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  image: null,
  variant: 'secondary-light-outline',
  eyebrow: null,
  heading: null,
  border: false,
  borderWidth: 'thin',
  to: null
})

// Check if card should be a link
const isLink = computed(() => props.to !== null && props.to !== undefined && props.to !== '')

// Border width classes
const borderWidthClasses = computed(() => {
  if (!props.border) return ''

  const widths = {
    thin: 'border',
    thick: 'border-2'
  }
  return widths[props.borderWidth]
})

// Variant classes for different card styles
const variantClasses = computed(() => {
  const variants = {
    'primary': 'bg-blue-500 text-white',
    'secondary': 'bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-neutral-100',
    'primary-outline': 'bg-transparent text-neutral-900 border-blue-500 dark:text-neutral-100',
    'secondary-outline': 'bg-transparent text-neutral-900 border-neutral-400 dark:text-neutral-100 dark:border-neutral-500',
    'secondary-light-outline': 'bg-transparent text-neutral-900 border-neutral-300 dark:text-neutral-100 dark:border-neutral-600'
  }
  return variants[props.variant]
})

// Eyebrow text classes
const eyebrowClasses = computed(() => {
  // For primary variant with colored background, use lighter text
  if (props.variant === 'primary') {
    return 'text-xs font-semibold uppercase tracking-wide text-blue-100'
  }
  // For all other variants, use muted text
  return 'text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400'
})

// Heading text classes
const headingClasses = computed(() => {
  // For primary variant with colored background, use white text
  if (props.variant === 'primary') {
    return 'font-heading text-xl font-bold text-white md:text-2xl'
  }
  // For all other variants, use dark text
  return 'font-heading text-lg font-bold text-neutral-900 dark:text-neutral-100 md:text-xl'
})

// Body text classes
const bodyClasses = computed(() => {
  // For primary variant with colored background, use lighter text
  if (props.variant === 'primary') {
    return 'text-base text-blue-50'
  }
  // For all other variants, use muted text
  return 'text-base text-neutral-600 dark:text-neutral-300'
})

// Combined card classes
const cardClasses = computed(() => {
  const baseClasses = [
    'flex flex-col gap-4 rounded-lg p-4 md:grid md:grid-cols-[auto_1fr] md:gap-6 md:p-6',
    borderWidthClasses.value,
    variantClasses.value
  ]

  // Add hover effect if card is a link
  if (isLink.value) {
    baseClasses.push('transition-transform duration-200 hover:scale-[1.02] cursor-pointer')
  }

  return baseClasses.filter(Boolean).join(' ')
})
</script>

<template>
  <!-- Clickable Link Card -->
  <Primitive v-if="isLink" as-child>
    <NuxtLink :to="to!" :class="cardClasses">
      <!-- Eyebrow (shown first on mobile) -->
      <p v-if="eyebrow" :class="eyebrowClasses" class="md:hidden">
        {{ eyebrow }}
      </p>

      <!-- Image Column -->
      <div v-if="image" class="flex-shrink-0">
        <img
          :src="image"
          :alt="heading || 'Article image'"
          class="h-48 w-full rounded-lg object-cover md:h-40 md:w-56"
        />
      </div>

      <!-- Content Column -->
      <div class="flex min-w-0 flex-col justify-center gap-2">
        <!-- Eyebrow (shown on desktop) -->
        <p v-if="eyebrow" :class="eyebrowClasses" class="hidden md:block">
          {{ eyebrow }}
        </p>

        <!-- Heading -->
        <h3 v-if="heading" :class="headingClasses">
          {{ heading }}
        </h3>

        <!-- Body Content (Slot) -->
        <div :class="bodyClasses">
          <slot />
        </div>
      </div>
    </NuxtLink>
  </Primitive>

  <!-- Non-clickable Card -->
  <div v-else :class="cardClasses">
    <!-- Eyebrow (shown first on mobile) -->
    <p v-if="eyebrow" :class="eyebrowClasses" class="md:hidden">
      {{ eyebrow }}
    </p>

    <!-- Image Column -->
    <div v-if="image" class="flex-shrink-0">
      <img
        :src="image"
        :alt="heading || 'Article image'"
        class="h-48 w-full rounded-lg object-cover md:h-40 md:w-56"
      />
    </div>

    <!-- Content Column -->
    <div class="flex min-w-0 flex-col justify-center gap-2">
      <!-- Eyebrow (shown on desktop) -->
      <p v-if="eyebrow" :class="eyebrowClasses" class="hidden md:block">
        {{ eyebrow }}
      </p>

      <!-- Heading -->
      <h3 v-if="heading" :class="headingClasses">
        {{ heading }}
      </h3>

      <!-- Body Content (Slot) -->
      <div :class="bodyClasses">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>

