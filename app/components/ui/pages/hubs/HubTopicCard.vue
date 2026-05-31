<script setup lang="ts">
// Hub Topic Card Component
// Displays a topic card with image, title, and description in a vertical layout
// Used in the 3-column grid on hub pages

import { computed } from 'vue'

interface Props {
  /**
   * The image URL to display at the top of the card
   */
  image: string

  /**
   * The main heading/title of the topic
   */
  title: string

  /**
   * Short description text (2-3 lines)
   */
  description: string

  /**
   * URL or route to navigate to when card is clicked
   */
  to: string

  /**
   * The visual variant of the card
   * @default 'secondary-light-outline'
   */
  variant?: 'primary' | 'secondary' | 'primary-outline' | 'secondary-outline' | 'secondary-light-outline'

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
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'secondary-light-outline',
  border: true,
  borderWidth: 'thin'
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

// Variant classes for different card styles
const variantClasses = computed(() => {
  const variants = {
    'primary': 'bg-blue-50 border-blue-400 dark:bg-blue-900/30 dark:border-blue-500',
    'secondary': 'bg-neutral-100 border-neutral-500 dark:bg-neutral-800 dark:border-neutral-600',
    'primary-outline': 'bg-white border-blue-400 dark:bg-neutral-900 dark:border-blue-500',
    'secondary-outline': 'bg-white border-neutral-400 dark:bg-neutral-900 dark:border-neutral-500',
    'secondary-light-outline': 'bg-white border-neutral-200 dark:bg-neutral-900 dark:border-neutral-700'
  }
  return variants[props.variant]
})

// Combined card classes
const cardClasses = computed(() => {
  return [
    'flex flex-col overflow-hidden rounded-lg transition-all duration-300',
    'hover:shadow-lg hover:-translate-y-1 cursor-pointer',
    borderWidthClasses.value,
    variantClasses.value
  ].filter(Boolean).join(' ')
})
</script>

<template>
  <Primitive as-child>
    <NuxtLink :to="to" :class="cardClasses">
      <!-- Image Section -->
      <div class="aspect-[16/9] w-full overflow-hidden">
        <img
          :src="image"
          :alt="title"
          class="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
          loading="lazy"
        />
      </div>

      <!-- Content Section -->
      <div class="flex flex-col gap-3 p-6">
        <!-- Title -->
        <h3 class="font-heading text-lg font-bold text-neutral-900 dark:text-neutral-100 md:text-xl">
          {{ title }}
        </h3>

        <!-- Description -->
        <p class="text-sm text-neutral-600 dark:text-neutral-300 md:text-base">
          {{ description }}
        </p>
      </div>
    </NuxtLink>
  </Primitive>
</template>

<style scoped>
</style>

