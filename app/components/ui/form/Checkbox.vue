<script setup lang="ts">
import { CheckboxRoot, CheckboxIndicator } from 'reka-ui'
import { computed } from 'vue'

interface Props {
  /**
   * The controlled checked state of the checkbox
   * Can be used with v-model
   * Supports boolean or 'indeterminate' state
   */
  modelValue?: boolean | 'indeterminate'

  /**
   * Label text for the checkbox
   */
  label?: string

  /**
   * Position of the label relative to the checkbox
   * @default 'right'
   */
  labelPosition?: 'left' | 'right'

  /**
   * Helper text displayed below the checkbox
   */
  description?: string

  /**
   * When true, prevents the user from interacting with the checkbox
   */
  disabled?: boolean

  /**
   * The name of the checkbox (useful for forms)
   */
  name?: string

  /**
   * The id of the checkbox
   */
  id?: string

  /**
   * The value of the checkbox when checked (useful for forms)
   * @default 'on'
   */
  value?: string

  /**
   * When true, shows a required indicator (*)
   */
  required?: boolean

  /**
   * Size variant
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg'

  /**
   * Error message or error state
   * When string: displays the error message
   * When true: shows error styling without message
   */
  error?: string | boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  labelPosition: 'right',
  disabled: false,
  required: false,
  size: 'md',
  error: false
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean | 'indeterminate']
}>()

// Computed property for v-model binding
const checked = computed({
  get: () => props.modelValue,
  set: (value: boolean | 'indeterminate') => {
    emit('update:modelValue', value)
  }
})

// Generate unique ID for accessibility
const checkboxId = computed(() => props.id || `checkbox-${Math.random().toString(36).substr(2, 9)}`)
const descriptionId = computed(() => `${checkboxId.value}-description`)
const errorId = computed(() => `${checkboxId.value}-error`)

// Size classes for the checkbox
const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return {
        box: 'h-4 w-4',
        icon: 'h-3 w-3'
      }
    case 'lg':
      return {
        box: 'h-6 w-6',
        icon: 'h-5 w-5'
      }
    default: // md
      return {
        box: 'h-5 w-5',
        icon: 'h-4 w-4'
      }
  }
})

// Error state
const hasError = computed(() => !!props.error)
const errorMessage = computed(() => typeof props.error === 'string' ? props.error : '')

// ARIA attributes
const ariaDescribedby = computed(() => {
  const ids: string[] = []
  if (props.description) ids.push(descriptionId.value)
  if (hasError.value) ids.push(errorId.value)
  return ids.length > 0 ? ids.join(' ') : undefined
})
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <!-- Checkbox with Label -->
    <div class="flex items-start gap-2" :class="labelPosition === 'left' ? 'flex-row-reverse justify-end' : ''">
      <!-- Checkbox -->
      <CheckboxRoot
        :id="checkboxId"
        v-model="checked"
        :disabled="disabled"
        :name="name"
        :value="value"
        :required="required"
        :aria-invalid="hasError"
        :aria-describedby="ariaDescribedby"
        class="flex shrink-0 items-center justify-center rounded border-2 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        :class="[
          sizeClasses.box,
          hasError
            ? 'border-red-500 dark:border-red-400 focus:ring-red-500 dark:focus:ring-red-400'
            : 'border-neutral-300 dark:border-neutral-600 focus:ring-blue-500 dark:focus:ring-blue-400',
          checked && !hasError
            ? 'bg-blue-600 border-blue-600 dark:bg-blue-500 dark:border-blue-500'
            : checked && hasError
            ? 'bg-red-500 border-red-500 dark:bg-red-400 dark:border-red-400'
            : 'bg-white dark:bg-neutral-800',
          'hover:border-neutral-400 dark:hover:border-neutral-500',
          'dark:focus:ring-offset-neutral-800'
        ]"
      >
        <CheckboxIndicator class="flex items-center justify-center text-white">
          <!-- Indeterminate icon -->
          <Icon
            v-if="checked === 'indeterminate'"
            name="heroicons:minus-20-solid"
            :class="sizeClasses.icon"
          />
          <!-- Checked icon -->
          <Icon
            v-else-if="checked"
            name="heroicons:check-20-solid"
            :class="sizeClasses.icon"
          />
        </CheckboxIndicator>
      </CheckboxRoot>

      <!-- Label -->
      <label
        v-if="label"
        :for="checkboxId"
        class="text-sm font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer select-none"
        :class="{ 'opacity-50': disabled }"
      >
        {{ label }}
        <span v-if="required" class="text-red-500 ml-0.5">*</span>
      </label>
    </div>

    <!-- Description -->
    <p
      v-if="description"
      :id="descriptionId"
      class="text-xs text-neutral-500 dark:text-neutral-400"
      :class="labelPosition === 'left' ? 'text-right' : 'ml-7'"
    >
      {{ description }}
    </p>

    <!-- Error Message -->
    <p
      v-if="errorMessage"
      :id="errorId"
      class="text-xs text-red-600 dark:text-red-400"
      :class="labelPosition === 'left' ? 'text-right' : 'ml-7'"
    >
      {{ errorMessage }}
    </p>
  </div>
</template>

