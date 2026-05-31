<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  /**
   * The text to display in the badge
   */
  text: string

  /**
   * The visual variant of the badge
   * @default 'primary-outline'
   */
  variant?: 'primary-outline' | 'secondary-outline' | 'ghost' | 'blue-blue'

  /**
   * The size of the badge
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg'

  /**
   * Optional icon name (uses Nuxt Icon)
   * When provided, displays on the left side of the badge text
   * Example: 'heroicons:check-circle'
   */
  icon?: string | null

  /**
   * Optional custom colors as [lightModeColor, darkModeColor] hex values
   * When provided, overrides all variant colors for border and text
   * Example: ['#FF0000', '#FF6666']
   * @default null
   */
  color?: [string, string] | null

  /**
   * The border thickness of the badge
   * @default 'thick'
   */
  borderWidth?: 'thin' | 'thick'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary-outline',
  size: 'md',
  icon: null,
  color: null,
  borderWidth: 'thick'
})

// Size classes for different badge sizes
const sizeClasses = computed(() => {
  // Reduce left padding when icon is present
  if (props.icon) {
    const sizes = {
      sm: 'pl-0.5 pr-2.5 py-1 text-sm',
      md: 'pl-0.5 pr-3.5 py-1 text-base',
      lg: 'pl-0.5 pr-4 py-1 text-lg'
    }
    return sizes[props.size]
  }

  const sizes = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-1 text-base',
    lg: 'px-6 py-1 text-lg'
  }
  return sizes[props.size]
})

// Icon size classes based on badge size
const iconSizeClasses = computed(() => {
  const sizes = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-7 w-7'
  }
  return sizes[props.size]
})

// Border width classes
const borderClasses = computed(() => {
  return props.borderWidth === 'thin' ? 'border' : 'border-2'
})

// Variant classes for different badge styles with light and dark mode
const variantClasses = computed(() => {
  // If custom colors are provided, use CSS custom properties
  if (props.color) {
    return `${borderClasses.value} bg-transparent text-[var(--badge-color-light)] border-[var(--badge-color-light)] dark:text-[var(--badge-color-dark)] dark:border-[var(--badge-color-dark)]`
  }

  const variants = {
    'primary-outline': `${borderClasses.value} border-blue-400 bg-transparent text-blue-500 dark:border-blue-500 dark:text-blue-400`,
    'secondary-outline': `${borderClasses.value} border-neutral-500 bg-transparent text-neutral-700 dark:border-neutral-600 dark:text-neutral-300`,
    'ghost': `${borderClasses.value} border-black bg-transparent text-black dark:border-white dark:text-white`,
    'blue-blue': 'border-0 bg-[#edf2fc] text-blue-500 dark:bg-blue-900/30 dark:text-blue-400'
  }
  return variants[props.variant]
})

// Custom styles for color overrides
const customStyles = computed(() => {
  if (!props.color) return {}

  return {
    '--badge-color-light': props.color[0],
    '--badge-color-dark': props.color[1]
  }
})

// Combined badge classes
const badgeClasses = computed(() => {
  return [
    'inline-flex items-center gap-2 rounded-full font-bold',
    sizeClasses.value,
    variantClasses.value
  ].join(' ')
})
</script>

<template>
  <span :class="badgeClasses" :style="customStyles">
    <Icon v-if="icon" :name="icon" :class="iconSizeClasses" />
    {{ text }}
  </span>
</template>

<style scoped>
</style>

