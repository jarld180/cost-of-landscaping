<script setup lang="ts">
interface Props {
  /**
   * The text to display in the badge
   */
  text: string

  /**
   * The visual variant of the badge
   * @default 'primary-outline'
   */
  variant?: 'primary-outline' | 'secondary-outline' | 'ghost'

  /**
   * Optional custom colors as [lightModeColor, darkModeColor] hex values
   * When provided, overrides variant colors for border and text
   * Example: ['#FF0000', '#FF6666']
   */
  color?: [string, string] | null
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary-outline',
  color: null
})

// Variant classes for different badge styles
const variantClasses = computed(() => {
  if (props.color) {
    return 'border bg-transparent text-[var(--badge-color-light)] border-[var(--badge-color-light)] dark:text-[var(--badge-color-dark)] dark:border-[var(--badge-color-dark)]'
  }

  const variants = {
    'primary-outline': 'border border-blue-400 bg-transparent text-blue-500 dark:border-blue-500 dark:text-blue-400',
    'secondary-outline': 'border border-neutral-400 bg-transparent text-neutral-600 dark:border-neutral-500 dark:text-neutral-400',
    'ghost': 'border border-neutral-300 bg-transparent text-neutral-700 dark:border-neutral-600 dark:text-neutral-300'
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
</script>

<template>
  <span
    :class="['inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', variantClasses]"
    :style="customStyles"
  >
    {{ text }}
  </span>
</template>

<style scoped>
</style>

