<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  /**
   * The orientation of the divider
   * @default 'horizontal'
   */
  orientation?: 'horizontal' | 'vertical'

  /**
   * The spacing around the divider
   * @default 'none'
   */
  spacing?: 'none' | 'sm' | 'md' | 'lg'

  /**
   * The style of the divider line
   * @default 'solid'
   */
  variant?: 'solid' | 'dashed' | 'dotted'
}

const props = withDefaults(defineProps<Props>(), {
  orientation: 'horizontal',
  spacing: 'none',
  variant: 'solid'
})

// Orientation classes
const orientationClasses = computed(() => {
  if (props.orientation === 'vertical') {
    return 'border-l h-full'
  }
  return 'border-t w-full'
})

// Spacing classes
const spacingClasses = computed(() => {
  if (props.orientation === 'vertical') {
    const verticalSpacing = {
      none: '',
      sm: 'mx-2',
      md: 'mx-4',
      lg: 'mx-6'
    }
    return verticalSpacing[props.spacing]
  }
  
  const horizontalSpacing = {
    none: '',
    sm: 'my-2',
    md: 'my-4',
    lg: 'my-6'
  }
  return horizontalSpacing[props.spacing]
})

// Variant classes
const variantClasses = computed(() => {
  const variants = {
    solid: 'border-solid',
    dashed: 'border-dashed',
    dotted: 'border-dotted'
  }
  return variants[props.variant]
})

// Combined classes
const dividerClasses = computed(() => {
  return [
    orientationClasses.value,
    spacingClasses.value,
    variantClasses.value,
    'border-neutral-200 dark:border-neutral-700'
  ].join(' ')
})
</script>

<template>
  <div :class="dividerClasses" role="separator" />
</template>

