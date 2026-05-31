<script setup lang="ts">
import { ref, watch } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { consola } from 'consola'
import { menuFormSchema, menuFormDefaultValues, type MenuFormData } from '~/schemas/admin/menu-form.schema'

interface Props {
  /**
   * Initial form data (for edit mode)
   */
  initialData?: Partial<MenuFormData>

  /**
   * Whether the form is in edit mode
   * @default false
   */
  isEditMode?: boolean

  /**
   * Whether the form is submitting
   * @default false
   */
  isSubmitting?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  initialData: undefined,
  isEditMode: false,
  isSubmitting: false
})

const emit = defineEmits<{
  'submit': [data: MenuFormData]
  'cancel': []
}>()

// =====================================================
// FORM SETUP
// =====================================================

const { values, errors, defineField, handleSubmit, setFieldValue } = useForm({
  validationSchema: toTypedSchema(menuFormSchema),
  initialValues: props.initialData || menuFormDefaultValues
})

// Define form fields with VeeValidate
const [name, nameAttrs] = defineField('name')
const [slug, slugAttrs] = defineField('slug')
const [description, descriptionAttrs] = defineField('description')
const [showInHeader, showInHeaderAttrs] = defineField('show_in_header')
const [showInFooter, showInFooterAttrs] = defineField('show_in_footer')
const [isEnabled, isEnabledAttrs] = defineField('is_enabled')

// =====================================================
// AUTO-GENERATE SLUG FROM NAME
// =====================================================

const isSlugManuallyEdited = ref(false)

/**
 * Generate URL-friendly slug from name
 */
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

/**
 * Auto-generate slug when name changes (only if slug hasn't been manually edited and NOT in edit mode)
 */
watch(name, (newName) => {
  if (!props.isEditMode && !isSlugManuallyEdited.value && newName) {
    setFieldValue('slug', generateSlug(newName))
  }
})

/**
 * Mark slug as manually edited when user types in slug field
 */
watch(slug, () => {
  if (!props.isEditMode) {
    isSlugManuallyEdited.value = true
  }
})

// =====================================================
// FORM SUBMISSION
// =====================================================

const onSubmit = handleSubmit((formData) => {
  if (import.meta.client && import.meta.dev) {
    consola.info('[MenuForm] Form submitted:', formData)
  }
  emit('submit', formData)
})

const onCancel = () => {
  emit('cancel')
}

// =====================================================
// LOCATION CHANGE HANDLER
// =====================================================

/**
 * Handle location radio button change
 */
const handleLocationChange = (location: 'none' | 'header' | 'footer') => {
  if (location === 'none') {
    setFieldValue('show_in_header', false)
    setFieldValue('show_in_footer', false)
  } else if (location === 'header') {
    setFieldValue('show_in_header', true)
    setFieldValue('show_in_footer', false)
  } else if (location === 'footer') {
    setFieldValue('show_in_header', false)
    setFieldValue('show_in_footer', true)
  }
}
</script>

<template>
  <form
    @submit.prevent="onSubmit"
    class="space-y-6"
  >
    <!-- Name Field -->
    <div>
      <label
        for="name"
        class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
      >
        Name <span class="text-red-500">*</span>
      </label>
      <input
        id="name"
        v-model="name"
        v-bind="nameAttrs"
        type="text"
        placeholder="Main Navigation"
        class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-100"
        :class="{ 'border-red-500': errors.name }"
      />
      <p
        v-if="errors.name"
        class="mt-1 text-sm text-red-600 dark:text-red-400"
      >
        {{ errors.name }}
      </p>
    </div>

    <!-- Slug Field -->
    <div>
      <label
        for="slug"
        class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
      >
        Slug <span class="text-red-500">*</span>
      </label>
      <input
        id="slug"
        v-model="slug"
        v-bind="slugAttrs"
        type="text"
        placeholder="main-nav"
        class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-100"
        :class="{ 'border-red-500': errors.slug }"
      />
      <p
        v-if="errors.slug"
        class="mt-1 text-sm text-red-600 dark:text-red-400"
      >
        {{ errors.slug }}
      </p>
      <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        Used in URLs. Lowercase letters, numbers, and hyphens only.
      </p>
    </div>

    <!-- Description Field -->
    <div>
      <label
        for="description"
        class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
      >
        Description
      </label>
      <textarea
        id="description"
        v-model="description"
        v-bind="descriptionAttrs"
        rows="3"
        placeholder="Optional description for this menu"
        class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-100"
        :class="{ 'border-red-500': errors.description }"
      />
      <p
        v-if="errors.description"
        class="mt-1 text-sm text-red-600 dark:text-red-400"
      >
        {{ errors.description }}
      </p>
    </div>

    <!-- Location Radio Buttons -->
    <div>
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
        Location <span class="text-red-500">*</span>
      </label>
      <div class="space-y-2">
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="location"
            :checked="!showInHeader && !showInFooter"
            @change="handleLocationChange('none')"
            class="h-4 w-4 border-neutral-300 text-blue-600 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800"
          />
          <span class="text-sm text-neutral-700 dark:text-neutral-300">None</span>
          <span class="text-xs text-neutral-500 dark:text-neutral-400">(Menu not displayed)</span>
        </label>

        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="location"
            :checked="showInHeader"
            @change="handleLocationChange('header')"
            class="h-4 w-4 border-neutral-300 text-blue-600 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800"
          />
          <span class="text-sm text-neutral-700 dark:text-neutral-300">Header</span>
          <span class="text-xs text-neutral-500 dark:text-neutral-400">(Top navigation)</span>
        </label>

        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="location"
            :checked="showInFooter"
            @change="handleLocationChange('footer')"
            class="h-4 w-4 border-neutral-300 text-blue-600 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800"
          />
          <span class="text-sm text-neutral-700 dark:text-neutral-300">Footer</span>
          <span class="text-xs text-neutral-500 dark:text-neutral-400">(Bottom navigation, flat links only)</span>
        </label>
      </div>
      <p v-if="errors.show_in_header" class="mt-2 text-sm text-red-600 dark:text-red-400">
        {{ errors.show_in_header }}
      </p>
    </div>

    <!-- Enabled Checkbox -->
    <Checkbox
      id="is_enabled"
      v-model="isEnabled"
      v-bind="isEnabledAttrs"
      label="Enable this menu"
      name="is_enabled"
    />

    <!-- Form Actions -->
    <div class="flex items-center justify-end gap-3 pt-6 border-t border-neutral-200 dark:border-neutral-700">
      <Button
        text="Cancel"
        variant="ghost"
        type="button"
        @click="onCancel"
        :disabled="isSubmitting"
      />
      <Button
        :text="isEditMode ? 'Update Menu' : 'Create Menu'"
        variant="primary"
        type="submit"
        :disabled="isSubmitting"
      />
    </div>
  </form>
</template>

