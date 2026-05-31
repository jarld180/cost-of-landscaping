<script setup lang="ts">
import { computed } from 'vue'
import { consola } from 'consola'
import {
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectViewport,
  SelectItem,
  SelectItemText
} from 'reka-ui'

/**
 * FilterOption interface for select options
 */
export interface FilterOption {
  /**
   * The value of the option (used for filtering logic)
   */
  value: string | number

  /**
   * The display label for the option
   */
  label: string

  /**
   * Whether the option is disabled
   * @default false
   */
  disabled?: boolean
}

interface Props {
  /**
   * The label text displayed above the select
   * @default undefined
   */
  label?: string

  /**
   * The current selected value (use with v-model)
   */
  modelValue: string | number | null | undefined

  /**
   * Array of options to display in the dropdown
   */
  options: FilterOption[]

  /**
   * Placeholder text when no option is selected
   * @default "Select..."
   */
  placeholder?: string

  /**
   * The size of the select
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg'

  /**
   * Whether the select is disabled
   * @default false
   */
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  label: undefined,
  placeholder: 'Select...',
  size: 'md',
  disabled: false
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: string | number | null]
}>()

// Local state for open/closed
const isOpen = ref(false)

// Convert modelValue to string for Reka UI Select
const internalValue = computed({
  get: () => props.modelValue !== null ? String(props.modelValue) : '',
  set: (value: string) => {
    // Find the original option to get the correct type
    const option = props.options.find(opt => String(opt.value) === value)

    // Consola log for demo (only in dev mode)
    if (import.meta.dev && option) {
      consola.info('FilterSelect: Option selected', {
        value: option.value,
        label: option.label,
        disabled: option.disabled || false
      })
    }

    emit('update:modelValue', option ? option.value : null)
  }
})

// Size classes for the trigger button
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

// Get display value (label of selected option)
const displayValue = computed(() => {
  if (!props.modelValue) return props.placeholder
  const option = props.options.find(opt => opt.value === props.modelValue)
  return option ? option.label : props.placeholder
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

    <!-- Reka UI Select -->
    <SelectRoot v-model="internalValue" v-model:open="isOpen" :disabled="disabled">
      <SelectTrigger
        :class="[
          'flex w-full items-center justify-between gap-2 rounded-full border border-neutral-300 bg-white text-neutral-700 transition-all outline-none',
          'hover:border-neutral-400',
          'focus:border-blue-500 focus:ring-2 focus:ring-blue-200',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
          'dark:hover:border-neutral-500',
          'dark:focus:border-blue-400 dark:focus:ring-blue-900/30',
          sizeClasses
        ]"
      >
        <span :class="[
          'flex-1 text-left truncate',
          !modelValue ? 'text-neutral-400 dark:text-neutral-500' : ''
        ]">
          {{ displayValue }}
        </span>
        <Icon
          name="heroicons:chevron-down"
          :class="[
            'h-4 w-4 flex-shrink-0 text-neutral-500 transition-transform duration-200 dark:text-neutral-400',
            isOpen ? 'rotate-180' : ''
          ]"
        />
      </SelectTrigger>

      <SelectContent
        position="popper"
        :side-offset="8"
        :align="'start'"
        class="z-50 min-w-[var(--reka-select-trigger-width)] rounded-2xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-800 overflow-hidden"
      >
        <SelectViewport class="p-1">
          <SelectItem
            v-for="option in options"
            :key="String(option.value)"
            :value="String(option.value)"
            :disabled="option.disabled"
            :class="[
              'relative flex items-center px-4 py-3 text-sm font-medium text-neutral-900 dark:text-neutral-100',
              'rounded-lg cursor-pointer outline-none select-none',
              'transition-colors',
              'data-[highlighted]:bg-neutral-50 dark:data-[highlighted]:bg-neutral-700',
              'data-[state=checked]:bg-blue-50 dark:data-[state=checked]:bg-blue-900/20',
              'data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed'
            ]"
          >
            <SelectItemText>
              {{ option.label }}
            </SelectItemText>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectRoot>
  </div>
</template>

<style scoped>
/* Additional styles if needed */
</style>

