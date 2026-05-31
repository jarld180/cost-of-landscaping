<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from 'reka-ui'

interface Props {
  /**
   * The controlled checked state of the switch
   * Can be used with v-model
   */
  modelValue?: boolean

  /**
   * When true, prevents the user from interacting with the switch
   */
  disabled?: boolean

  /**
   * The name of the switch (useful for forms)
   */
  name?: string

  /**
   * The value of the switch when checked (useful for forms)
   */
  value?: string

  /**
   * Whether to show a label
   */
  label?: string

  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  disabled: false,
  size: 'md'
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

// Computed property for v-model binding
const checked = computed({
  get: () => props.modelValue,
  set: (value: boolean) => {
    emit('update:modelValue', value)
  }
})

// Size classes
const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return {
        root: 'h-5 w-9',
        thumb: 'h-4 w-4',
        translate: 'translate-x-4'
      }
    case 'lg':
      return {
        root: 'h-7 w-12',
        thumb: 'h-6 w-6',
        translate: 'translate-x-5'
      }
    default: // md
      return {
        root: 'h-6 w-11',
        thumb: 'h-5 w-5',
        translate: 'translate-x-5'
      }
  }
})
</script>

<template>
  <div class="flex items-center gap-2">
    <SwitchRoot
      v-model="checked"
      :disabled="disabled"
      :name="name"
      :value="value"
      class="relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-neutral-800"
      :class="[
        sizeClasses.root,
        checked ? 'bg-blue-600 dark:bg-blue-500' : 'bg-neutral-200 dark:bg-neutral-600'
      ]"
    >
      <SwitchThumb
        class="pointer-events-none inline-block transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out"
        :class="[
          sizeClasses.thumb,
          checked ? sizeClasses.translate : 'translate-x-0'
        ]"
      />
    </SwitchRoot>

    <!-- Optional Label -->
    <label
      v-if="label"
      class="text-sm font-medium text-neutral-700 dark:text-neutral-300"
      :class="{ 'cursor-pointer': !disabled, 'opacity-50': disabled }"
    >
      {{ label }}
    </label>
  </div>
</template>

