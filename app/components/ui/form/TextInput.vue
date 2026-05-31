<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  /**
   * The current value (use with v-model)
   */
  modelValue: string | null | undefined

  /**
   * Placeholder text for the input
   * @default ""
   */
  placeholder?: string

  /**
   * The size of the input
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg'

  /**
   * Whether the input is disabled
   * @default false
   */
  disabled?: boolean

  /**
   * Input type
   * @default 'text'
   */
  type?: 'text' | 'email' | 'password' | 'search' | 'url' | 'tel'

  /**
   * Optional icon name (uses Nuxt Icon)
   * When provided, displays on the left side of the input
   * Example: 'heroicons:magnifying-glass'
   */
  icon?: string | null

  /**
   * Whether to show a clear button when input has value
   * @default false
   */
  clearable?: boolean

  /**
   * Optional label text displayed above the input
   * @default undefined
   */
  label?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '',
  size: 'md',
  disabled: false,
  type: 'text',
  icon: null,
  clearable: false,
  label: undefined
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: string | null]
  'clear': []
}>()

// Local value for v-model
const internalValue = computed({
  get: () => props.modelValue ?? '',
  set: (value: string) => emit('update:modelValue', value || null)
})

// Size classes for the input container
const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'h-9 px-3 text-sm'
    case 'lg':
      return 'h-12 px-5 text-base'
    case 'md':
    default:
      return 'h-11 px-4 text-sm'
  }
})

// Icon size classes
const iconSizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'h-4 w-4'
    case 'lg':
      return 'h-6 w-6'
    case 'md':
    default:
      return 'h-5 w-5'
  }
})

// Handle clear button click
const handleClear = () => {
  emit('update:modelValue', null)
  emit('clear')
}

// Show clear button
const showClearButton = computed(() => {
  return props.clearable && (props.modelValue?.length ?? 0) > 0 && !props.disabled
})
</script>

<template>
  <div class="flex flex-col gap-2">
    <!-- Label (optional) -->
    <label
      v-if="label"
      class="text-sm font-medium text-neutral-700 dark:text-neutral-300"
    >
      {{ label }}
    </label>

    <!-- Input Container -->
    <div class="relative">
      <!-- Icon (left side) -->
      <div
        v-if="icon"
        class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center"
      >
        <Icon
          :name="icon"
          :class="[
            iconSizeClasses,
            'text-neutral-400 dark:text-neutral-500'
          ]"
        />
      </div>

      <!-- Input Field -->
      <input
        v-model="internalValue"
        :type="type"
        :placeholder="placeholder"
        :disabled="disabled"
        :class="[
          'w-full rounded-full border border-neutral-300 bg-white text-neutral-700 transition-all outline-none',
          'hover:border-neutral-400',
          'focus:border-blue-500 focus:ring-2 focus:ring-blue-200',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-neutral-100',
          'dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
          'dark:hover:border-neutral-500',
          'dark:focus:border-blue-400 dark:focus:ring-blue-900/30',
          'dark:disabled:bg-neutral-900',
          sizeClasses,
          icon ? 'pl-10' : '',
          showClearButton ? 'pr-10' : ''
        ]"
      />

      <!-- Clear Button (right side) -->
      <button
        v-if="showClearButton"
        type="button"
        class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-neutral-400 transition-colors hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
        @click="handleClear"
        aria-label="Clear input"
      >
        <Icon
          name="heroicons:x-mark"
          :class="iconSizeClasses"
        />
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Additional styles if needed */
</style>

