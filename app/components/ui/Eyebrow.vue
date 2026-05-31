<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  /**
   * The text to display in the eyebrow
   */
  text: string

  /**
   * The visual variant of the eyebrow
   * @default 'white-blue'
   */
  variant?: 'white-blue' | 'blue-blue' | 'white-white'

  /**
   * The size of the eyebrow
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'white-blue',
  size: 'md'
})

// Size classes for different eyebrow sizes
const sizeClasses = computed(() => {
  const sizes = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-1 text-base',
    lg: 'px-6 py-1 text-lg'
  }
  return sizes[props.size]
})

// Variant classes for different eyebrow styles
const variantClasses = computed(() => {
  const variants = {
    'white-blue': 'bg-neutral-50 text-blue-500 dark:bg-white dark:text-blue-500',
    'blue-blue': 'bg-[#edf2fc] text-blue-500 dark:bg-blue-900/30 dark:text-blue-400',
    'white-white': 'bg-[#334570] text-white dark:bg-[#334570] dark:text-white'
  }
  return variants[props.variant]
})

// Combined eyebrow classes
const eyebrowClasses = computed(() => {
  return [
    'inline-block rounded-full font-bold',
    sizeClasses.value,
    variantClasses.value
  ].join(' ')
})
</script>

<template>
  <span :class="eyebrowClasses">
    {{ text }}
  </span>
</template>

<style scoped>
</style>

