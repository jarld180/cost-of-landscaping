<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  /**
   * The visual variant of the card
   * @default 'primary'
   */
  variant?: 'primary' | 'secondary' | 'primary-outline' | 'secondary-outline' | 'secondary-light-outline'

  /**
   * The border width of the card
   * @default 'thin'
   */
  borderWidth?: 'thin' | 'thick'

  /**
   * The padding class for the card (Tailwind class)
   * @default 'p-6'
   */
  padding?: string

  /**
   * Whether to apply shadow and transition effects
   * @default false
   */
  shadow?: boolean

  /**
   * Optional icon name (uses Nuxt Icon)
   * Example: 'heroicons:shield-check'
   */
  icon?: string

  /**
   * Optional heading text (displays as H2)
   */
  heading?: string

  /**
   * Optional step number for step-based layout
   * When provided, displays in 2-column layout with step number in blue circle
   */
  step?: number | null

  /**
   * Whether to show borders
   * @default true
   */
  border?: boolean

  /**
   * Custom border colors [light mode, dark mode]
   * Overrides variant border colors when provided
   * Example: ['#FF0000', '#00FF00']
   */
  borderColor?: [string, string] | null

  /**
   * Custom background colors [light mode, dark mode]
   * Overrides variant background colors when provided
   * Example: ['#FFFFFF', '#000000']
   */
  backgroundColors?: [string, string] | null
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  borderWidth: 'thin',
  padding: 'p-6',
  shadow: false,
  step: null,
  border: true,
  borderColor: null,
  backgroundColors: null
})

// Check if we're using step-based layout
const isStepLayout = computed(() => props.step !== null && props.step !== undefined)

// Check if we have icon or heading to show the header section (non-step layout)
const hasHeader = computed(() => !isStepLayout.value && (!!props.icon || !!props.heading))

// Variant classes for different card styles with light and dark mode
const variantClasses = computed(() => {
  const variants = {
    primary: 'border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/30',
    secondary: 'border-neutral-500 bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-800',
    'primary-outline': 'border-blue-400 bg-transparent dark:border-blue-500 dark:bg-transparent',
    'secondary-outline': 'border-neutral-500 bg-transparent dark:border-neutral-600 dark:bg-transparent',
    'secondary-light-outline': 'border-neutral-250 bg-transparent dark:border-neutral-600 dark:bg-transparent'
  }
  return variants[props.variant]
})

// Border width classes
const borderWidthClasses = computed(() => {
  // If border is false, return empty string (no border)
  if (!props.border) return ''

  const widths = {
    thin: 'border',
    thick: 'border-2'
  }
  return widths[props.borderWidth]
})

// Shadow classes (conditional)
const shadowClasses = computed(() => {
  return props.shadow ? 'shadow-md transition-shadow duration-300' : ''
})

// Custom inline styles for border and background colors
const customStyles = computed(() => {
  const styles: Record<string, string> = {}

  // Apply custom border color if provided
  if (props.borderColor && props.border) {
    styles['--card-border-light'] = props.borderColor[0]
    styles['--card-border-dark'] = props.borderColor[1]
  }

  // Apply custom background colors if provided
  if (props.backgroundColors) {
    styles['--card-bg-light'] = props.backgroundColors[0]
    styles['--card-bg-dark'] = props.backgroundColors[1]
  }

  return styles
})

// Combined card classes
const cardClasses = computed(() => {
  const classes = [
    'rounded-lg',
    props.padding,
    borderWidthClasses.value,
    shadowClasses.value
  ]

  // Only apply variant classes if no custom colors are provided
  if (!props.borderColor && !props.backgroundColors) {
    classes.push(variantClasses.value)
  } else {
    // Apply custom color classes
    if (props.borderColor && props.border) {
      classes.push('border-[var(--card-border-light)] dark:border-[var(--card-border-dark)]')
    } else if (!props.borderColor && props.border) {
      // Use variant border color only
      const variantBorderClasses = variantClasses.value.split(' ').filter(c => c.includes('border-'))
      classes.push(...variantBorderClasses)
    }

    if (props.backgroundColors) {
      classes.push('bg-[var(--card-bg-light)] dark:bg-[var(--card-bg-dark)]')
    } else {
      // Use variant background color only
      const variantBgClasses = variantClasses.value.split(' ').filter(c => c.includes('bg-'))
      classes.push(...variantBgClasses)
    }
  }

  return classes.filter(Boolean).join(' ')
})
</script>

<template>
  <div :class="cardClasses" :style="customStyles">
    <!-- Step-based layout: 2 columns with icon on left, step+heading+content on right -->
    <!-- On mobile (@container < md), hide icon and show single column -->
    <div v-if="isStepLayout" class="grid grid-cols-1 gap-6 @md:grid-cols-[auto_1fr]">
      <!-- Left column: Icon (vertically centered) - Hidden on mobile -->
      <div v-if="icon" class="hidden items-center @md:flex">
        <Icon :name="icon" class="h-16 w-16 text-neutral-900 dark:text-neutral-100" />
      </div>

      <!-- Right column: Step number + Heading + Content -->
      <div>
        <!-- Step number + Heading (inline) -->
        <div class="mb-3 flex items-center gap-3">
          <!-- Step number in blue circle -->
          <div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-500">
            <span class="font-heading text-lg font-bold text-white">{{ step }}</span>
          </div>

          <!-- Heading -->
          <h2 v-if="heading" class="font-heading text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            {{ heading }}
          </h2>
        </div>

        <!-- Content -->
        <div class="text-neutral-600 dark:text-neutral-300">
          <slot />
        </div>
      </div>
    </div>

    <!-- Regular layout: Icon and/or heading at top, content below -->
    <template v-else>
      <!-- Header section with icon and/or heading -->
      <div v-if="hasHeader" class="mb-6 flex flex-col gap-4">
        <!-- Icon - Smaller on mobile, larger on tablet+ -->
        <div v-if="icon" class="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500 @md:h-16 @md:w-16">
          <Icon :name="icon" class="h-6 w-6 text-white @md:h-8 @md:w-8" />
        </div>

        <!-- Heading -->
        <h2 v-if="heading" class="font-heading text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          {{ heading }}
        </h2>
      </div>

      <!-- Content slot (description/body) -->
      <div class="text-neutral-600 dark:text-neutral-300">
        <slot />
      </div>
    </template>
  </div>
</template>

<style scoped>
</style>

