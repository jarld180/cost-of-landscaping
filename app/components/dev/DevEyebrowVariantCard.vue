<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variantTitle: string
  variant: 'white-blue' | 'blue-blue' | 'white-white'
  sampleText: string
  background?: 'white' | 'light-blue' | 'dark'
}

const props = withDefaults(defineProps<Props>(), {
  background: 'white'
})

const backgroundClasses = computed(() => {
  const backgrounds = {
    white: 'bg-neutral-50 dark:bg-neutral-800',
    'light-blue': 'bg-blue-50 dark:bg-blue-900/30',
    'dark': 'bg-[#00174c] dark:bg-[#00174c]'
  }
  return backgrounds[props.background]
})

const textClasses = computed(() => {
  // Use white text for dark backgrounds
  if (props.background === 'dark') {
    return 'text-white dark:text-white'
  }
  // Default text colors for light backgrounds
  return 'text-neutral-700 dark:text-neutral-200'
})

const subheadingTextClasses = computed(() => {
  // Use lighter white text for dark backgrounds
  if (props.background === 'dark') {
    return 'text-neutral-300 dark:text-neutral-300'
  }
  // Default text colors for light backgrounds
  return 'text-neutral-600 dark:text-neutral-400'
})

const sizes = [
  { name: 'Small (sm)', value: 'sm' },
  { name: 'Medium (md) - Default', value: 'md' },
  { name: 'Large (lg)', value: 'lg' }
] as const
</script>

<template>
  <div :class="['rounded-xl border-2 p-8', backgroundClasses, background === 'dark' ? 'border-neutral-600 dark:border-neutral-600' : 'border-neutral-200 dark:border-neutral-700']">
    <h3 :class="['mb-6 font-heading text-xl font-bold', textClasses]">
      {{ variantTitle }}
    </h3>

    <div class="space-y-6">
      <div v-for="size in sizes" :key="size.value">
        <h4 :class="['mb-3 text-sm font-semibold uppercase tracking-wide', subheadingTextClasses]">
          {{ size.name }}
        </h4>
        <div class="flex flex-wrap gap-4">
          <Eyebrow :text="sampleText" :size="size.value" :variant="variant" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>

