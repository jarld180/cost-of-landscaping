<script setup lang="ts">
/**
 * BottomSheet Component (Front-end)
 * 
 * Mobile-friendly bottom sheet using Reka UI Dialog
 * Slides up from the bottom on mobile devices
 */
import { computed, useSlots } from 'vue'

interface Props {
  /** Whether the sheet is open */
  open?: boolean
  /** Title for the sheet header */
  title?: string
  /** Maximum height of the sheet content */
  maxHeight?: string
}

const props = withDefaults(defineProps<Props>(), {
  open: false,
  maxHeight: '70vh'
})

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const slots = useSlots()
const hasTitle = computed(() => !!props.title || !!slots.title)

const overlayClasses = [
  'fixed inset-0 z-40',
  'bg-black/50 dark:bg-black/70',
  'data-[state=open]:animate-in data-[state=open]:fade-in-0',
  'data-[state=closed]:animate-out data-[state=closed]:fade-out-0'
].join(' ')

const contentClasses = computed(() => [
  'fixed bottom-0 left-0 right-0 z-50',
  'bg-white dark:bg-neutral-900',
  'rounded-t-2xl shadow-2xl',
  'border-t border-x border-neutral-200 dark:border-neutral-700',
  'focus:outline-none',
  'data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom',
  'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom',
  'duration-300'
].join(' '))
</script>

<template>
  <DialogRoot
    :open="open"
    @update:open="(value) => emit('update:open', value)"
  >
    <!-- Trigger slot -->
    <DialogTrigger v-if="$slots.trigger" as-child>
      <slot name="trigger" />
    </DialogTrigger>

    <DialogPortal>
      <!-- Overlay -->
      <DialogOverlay :class="overlayClasses" />

      <!-- Bottom Sheet Content -->
      <DialogContent
        :class="contentClasses"
        @pointer-down-outside="emit('update:open', false)"
      >
        <!-- Drag Handle -->
        <div class="flex justify-center pt-3 pb-2">
          <div class="h-1.5 w-12 rounded-full bg-neutral-300 dark:bg-neutral-600" />
        </div>

        <!-- Header -->
        <div v-if="hasTitle" class="flex items-center justify-between px-4 pb-3 border-b border-neutral-200 dark:border-neutral-700">
          <DialogTitle class="text-lg font-heading font-bold text-neutral-900 dark:text-neutral-50">
            <slot name="title">{{ title }}</slot>
          </DialogTitle>
          <DialogClose class="p-2 -mr-2 rounded-lg text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-800 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </DialogClose>
        </div>

        <!-- Content -->
        <div 
          class="overflow-y-auto px-4 py-4"
          :style="{ maxHeight: maxHeight }"
        >
          <slot />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
/* Slide animations handled by Tailwind animate utilities */
</style>

