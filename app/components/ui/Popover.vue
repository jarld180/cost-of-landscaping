<script setup lang="ts">
import { computed, useSlots } from 'vue'

// Reka UI components are auto-imported by the reka-ui/nuxt module

interface Props {
  /**
   * The trigger text or content
   */
  triggerText?: string

  /**
   * The side where the popover should appear
   * @default 'bottom'
   */
  side?: 'top' | 'right' | 'bottom' | 'left'

  /**
   * The alignment of the popover relative to the trigger
   * @default 'center'
   */
  align?: 'start' | 'center' | 'end'

  /**
   * The distance in pixels from the trigger
   * @default 5
   */
  sideOffset?: number

  /**
   * Whether to show the arrow
   * @default true
   */
  showArrow?: boolean

  /**
   * Custom width for the popover content
   */
  width?: string
}

const props = withDefaults(defineProps<Props>(), {
  triggerText: 'Open',
  side: 'bottom',
  align: 'center',
  sideOffset: 5,
  showArrow: true,
  width: '260px'
})

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const slots = useSlots()

// Check if custom trigger slot is provided
const hasCustomTrigger = computed(() => !!slots.trigger)



// Computed classes for the popover content
const contentClasses = computed(() => {
  return [
    'rounded-xl bg-neutral-50 p-6 shadow-lg',
    'dark:bg-neutral-800 dark:border-neutral-700',
    'border-2 border-neutral-200',
    'animate-in fade-in-0 zoom-in-95',
    'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
    'data-[side=bottom]:slide-in-from-top-2',
    'data-[side=left]:slide-in-from-right-2',
    'data-[side=right]:slide-in-from-left-2',
    'data-[side=top]:slide-in-from-bottom-2'
  ].join(' ')
})

// Computed classes for the trigger button
const triggerClasses = computed(() => {
  return [
    'inline-flex items-center justify-center',
    'px-4 py-2 rounded-lg',
    'bg-blue-500 text-neutral-50 font-semibold',
    'hover:bg-blue-600 active:bg-blue-700',
    'dark:bg-blue-600 dark:hover:bg-blue-700',
    'focus:outline-none focus:ring-4 focus:ring-blue-300',
    'transition-all duration-200'
  ].join(' ')
})

// Computed style for content width
const contentStyle = computed(() => ({
  width: props.width
}))
</script>

<template>
  <PopoverRoot
    @update:open="(value) => emit('update:open', value)"
  >
    <!-- Custom trigger slot with as-child -->
    <PopoverTrigger
      v-if="hasCustomTrigger"
      as-child
    >
      <slot name="trigger" />
    </PopoverTrigger>

    <!-- Default trigger button -->
    <PopoverTrigger
      v-else
      :class="triggerClasses"
    >
      {{ triggerText }}
    </PopoverTrigger>

    <PopoverPortal>
      <PopoverContent
        :class="contentClasses"
        :style="contentStyle"
        :side="side"
        :align="align"
        :side-offset="sideOffset"
      >
        <slot />

        <PopoverArrow
          v-if="showArrow"
          class="fill-neutral-200 dark:fill-neutral-700"
          :width="12"
          :height="6"
        />
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>

<style scoped>
/* Animation keyframes are handled by Tailwind's animate-in/out utilities */
</style>

