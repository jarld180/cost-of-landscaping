<script setup lang="ts">
import { computed, useSlots } from 'vue'

// Reka UI components are auto-imported by the reka-ui/nuxt module

interface Props {
  /**
   * The trigger text for the default button
   */
  triggerText?: string

  /**
   * The dialog title (can also use #title slot)
   */
  title?: string

  /**
   * The dialog description (can also use #description slot)
   */
  description?: string

  /**
   * Whether the dialog is open (controlled mode)
   */
  open?: boolean

  /**
   * Whether to show the overlay backdrop
   * @default true
   */
  showOverlay?: boolean

  /**
   * Whether clicking the overlay closes the dialog
   * @default true
   */
  closeOnOverlayClick?: boolean

  /**
   * Whether to show the close button (X)
   * @default true
   */
  showCloseButton?: boolean

  /**
   * The size of the dialog
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

const props = withDefaults(defineProps<Props>(), {
  showOverlay: true,
  closeOnOverlayClick: true,
  showCloseButton: true,
  size: 'md'
})

interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'close'): void
}

const emit = defineEmits<Emits>()

const slots = useSlots()

// Check if custom slots are provided
const hasCustomTrigger = computed(() => !!slots.trigger)
const hasCustomTitle = computed(() => !!slots.title)
const hasCustomDescription = computed(() => !!slots.description)
const hasCustomClose = computed(() => !!slots.close)
const hasFooter = computed(() => !!slots.footer || !!slots.actions)



// Computed classes for the dialog content based on size
const contentClasses = computed(() => {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full mx-4'
  }

  return [
    'fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%]',
    'w-[90vw]',
    sizeClasses[props.size],
    'max-h-[85vh] overflow-y-auto',
    'bg-white dark:bg-neutral-900',
    'rounded-2xl shadow-2xl',
    'border-2 border-neutral-200 dark:border-neutral-700',
    'p-6',
    'focus:outline-none',
    'z-50',
    // Animations
    'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
    'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95'
  ].join(' ')
})

// Computed classes for the overlay
const overlayClasses = computed(() => {
  return [
    'fixed inset-0 z-40',
    'bg-black/50 dark:bg-black/70',
    'data-[state=open]:animate-in data-[state=open]:fade-in-0',
    'data-[state=closed]:animate-out data-[state=closed]:fade-out-0'
  ].join(' ')
})

// Computed classes for the trigger button
const triggerClasses = computed(() => {
  return [
    'inline-flex items-center justify-center',
    'px-4 py-2 rounded-lg',
    'bg-blue-500 text-white font-semibold',
    'hover:bg-blue-600 active:bg-blue-700',
    'dark:bg-blue-600 dark:hover:bg-blue-700',
    'focus:outline-none focus:ring-4 focus:ring-blue-300',
    'transition-all duration-200'
  ].join(' ')
})

// Computed classes for the close button
const closeButtonClasses = computed(() => {
  return [
    'absolute top-4 right-4',
    'inline-flex items-center justify-center',
    'w-8 h-8 rounded-lg',
    'text-neutral-500 hover:text-neutral-700',
    'dark:text-neutral-400 dark:hover:text-neutral-200',
    'hover:bg-neutral-100 dark:hover:bg-neutral-800',
    'focus:outline-none focus:ring-2 focus:ring-blue-500',
    'transition-all duration-200'
  ].join(' ')
})

// Computed classes for title
const titleClasses = computed(() => {
  return [
    'text-xl font-heading font-bold',
    'text-neutral-900 dark:text-neutral-50',
    'mb-2'
  ].join(' ')
})

// Computed classes for description
const descriptionClasses = computed(() => {
  return [
    'text-sm text-neutral-600 dark:text-neutral-400',
    'mb-4'
  ].join(' ')
})

// Computed classes for footer
const footerClasses = computed(() => {
  return [
    'flex items-center justify-end gap-3',
    'mt-6 pt-4',
    'border-t border-neutral-200 dark:border-neutral-700'
  ].join(' ')
})
</script>

<template>
  <DialogRoot
    :open="open"
    @update:open="(value) => {
      emit('update:open', value)
      if (!value) emit('close')
    }"
  >
    <!-- Custom trigger slot with as-child -->
    <DialogTrigger
      v-if="hasCustomTrigger"
      as-child
    >
      <slot name="trigger" />
    </DialogTrigger>

    <!-- Default trigger button -->
    <DialogTrigger
      v-else-if="triggerText"
      :class="triggerClasses"
    >
      {{ triggerText }}
    </DialogTrigger>

    <DialogPortal>
      <!-- Overlay -->
      <DialogOverlay
        v-if="showOverlay"
        :class="overlayClasses"
      />

      <!-- Dialog Content -->
      <DialogContent
        :class="contentClasses"
        @pointer-down-outside="(e) => {
          if (!closeOnOverlayClick) {
            e.preventDefault()
          }
        }"
      >
        <!-- Close Button -->
        <DialogClose
          v-if="showCloseButton && !hasCustomClose"
          :class="closeButtonClasses"
          aria-label="Close dialog"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </DialogClose>

        <!-- Custom Close Button Slot -->
        <DialogClose
          v-else-if="hasCustomClose"
          as-child
        >
          <slot name="close" />
        </DialogClose>

        <!-- Title -->
        <DialogTitle
          v-if="title || hasCustomTitle"
          :class="titleClasses"
        >
          <slot
            v-if="hasCustomTitle"
            name="title"
          />
          <template v-else>
            {{ title }}
          </template>
        </DialogTitle>

        <!-- Description -->
        <DialogDescription
          v-if="description || hasCustomDescription"
          :class="descriptionClasses"
        >
          <slot
            v-if="hasCustomDescription"
            name="description"
          />
          <template v-else>
            {{ description }}
          </template>
        </DialogDescription>

        <!-- Main Content -->
        <div class="text-neutral-700 dark:text-neutral-300">
          <slot />
        </div>

        <!-- Footer / Actions -->
        <div
          v-if="hasFooter"
          :class="footerClasses"
        >
          <slot name="footer" />
          <slot name="actions" />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
/* Animation keyframes are handled by Tailwind's animate-in/out utilities */
</style>

