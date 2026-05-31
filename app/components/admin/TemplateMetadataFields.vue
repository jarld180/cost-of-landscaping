<script setup lang="ts">
/**
 * Template Metadata Fields Component
 *
 * Dynamically generates form fields based on the selected template's JSON schema.
 * Uses prop-based architecture for VeeValidate integration.
 */

import { consola } from 'consola'
import type { TemplateSlug } from '~/types/templates'

interface Props {
  template: TemplateSlug
  metadata?: Record<string, any> | null
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  metadata: null,
  disabled: false
})

const emit = defineEmits<{
  'update:metadata': [value: Record<string, any>]
}>()

const { templateSchema, loading, error, fetchTemplateSchema, generateFormFields } = useTemplateSchema()

// Generate form fields based on template schema
const formFields = ref<ReturnType<typeof generateFormFields>>([])

// Watch for template changes
watch(() => props.template, async (newTemplate) => {
  if (newTemplate) {
    const schema = await fetchTemplateSchema(newTemplate)
    if (schema) {
      formFields.value = generateFormFields(schema.schema)
    }
  }
}, { immediate: true })

// Update parent when any field changes
function updateField(fieldName: string, value: any) {
  const updated = { ...(props.metadata || {}), [fieldName]: value }

  // Debug logging
  if (import.meta.client && import.meta.dev) {
    consola.info('[TemplateMetadataFields] Updating field:', {
      fieldName,
      value,
      updated,
      metadataType: typeof updated,
      isPlainObject: Object.prototype.toString.call(updated) === '[object Object]'
    })
  }

  emit('update:metadata', updated)
}

// Get field value - return null instead of undefined for proper type compatibility
function getFieldValue(fieldName: string) {
  const value = props.metadata?.[fieldName]
  return value !== undefined ? value : null
}
</script>

<template>
  <div class="space-y-6">
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
      <span class="ml-3 text-sm text-gray-600 dark:text-gray-400">Loading template fields...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800 dark:text-red-200">Error loading template fields</h3>
          <p class="mt-1 text-sm text-red-700 dark:text-red-300">{{ error }}</p>
        </div>
      </div>
    </div>

    <!-- Form Fields -->
    <div v-else-if="formFields.length > 0" class="space-y-4">
      <div v-for="field in formFields" :key="field.name" class="space-y-2">
        <!-- Boolean Field (Checkbox) -->
        <Checkbox
          v-if="field.type === 'boolean'"
          :id="`metadata-${field.name}`"
          :model-value="getFieldValue(field.name)"
          @update:model-value="updateField(field.name, $event)"
          :label="field.label"
          :description="field.helpText"
          :disabled="disabled"
          :required="field.required"
        />

        <!-- Select Field (Dropdown) -->
        <FilterSelect
          v-else-if="field.type === 'select'"
          :label="field.label"
          :model-value="getFieldValue(field.name) || ''"
          :options="field.options || []"
          :placeholder="`Select ${field.label.toLowerCase()}`"
          :required="field.required"
          :disabled="disabled"
          :help-text="field.helpText"
          @update:model-value="updateField(field.name, $event)"
        />

        <!-- Number Field -->
        <TextInput
          v-else-if="field.type === 'number'"
          :label="field.label"
          :model-value="getFieldValue(field.name)"
          type="number"
          :placeholder="field.placeholder"
          :required="field.required"
          :disabled="disabled"
          :help-text="field.helpText"
          @update:model-value="updateField(field.name, Number($event))"
        />

        <!-- Text Field -->
        <TextInput
          v-else-if="field.type === 'text'"
          :label="field.label"
          :model-value="getFieldValue(field.name)"
          :placeholder="field.placeholder"
          :required="field.required"
          :disabled="disabled"
          :help-text="field.helpText"
          @update:model-value="updateField(field.name, $event)"
        />

        <!-- Array/Object Fields - Show as JSON textarea for now -->
        <div v-else-if="field.type === 'array' || field.type === 'object'" class="space-y-2">
          <label :for="`metadata-${field.name}`" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {{ field.label }}
            <span v-if="field.required" class="text-red-500">*</span>
          </label>
          <textarea
            :id="`metadata-${field.name}`"
            :value="JSON.stringify(getFieldValue(field.name) || (field.type === 'array' ? [] : {}), null, 2)"
            :placeholder="`Enter valid JSON format`"
            :disabled="disabled"
            rows="4"
            @input="updateField(field.name, JSON.parse(($event.target as HTMLTextAreaElement).value || (field.type === 'array' ? '[]' : '{}')))"
            class="w-full rounded-lg border border-neutral-300 bg-white text-neutral-700 transition-all outline-none px-4 py-3 text-sm font-mono hover:border-neutral-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-500 dark:focus:border-blue-400 dark:focus:ring-blue-900/30 dark:disabled:bg-neutral-900"
          ></textarea>
          <p v-if="field.helpText" class="text-sm text-neutral-500 dark:text-neutral-400">
            {{ field.helpText }}
          </p>
          <p class="text-xs text-neutral-500 dark:text-neutral-400">Enter valid JSON format</p>
        </div>
      </div>
    </div>

    <!-- No Fields State -->
    <div v-else class="text-center py-8">
      <p class="text-sm text-gray-500 dark:text-gray-400">No metadata fields available for this template.</p>
    </div>
  </div>
</template>

