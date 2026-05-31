<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { consola } from 'consola'
import { pageFormSchema, pageFormDefaultValues, type PageFormData } from '~/schemas/admin/page-form.schema'
import type { PageTemplate, TemplateSlug } from '~/types/templates'

interface Props {
  /**
   * Initial form data (for edit mode)
   */
  initialData?: Partial<PageFormData>

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

  /**
   * Current page ID (for edit mode) - used to exclude current page from parent options
   */
  currentPageId?: string
}

const props = withDefaults(defineProps<Props>(), {
  initialData: undefined,
  isEditMode: false,
  isSubmitting: false,
  currentPageId: undefined
})

const emit = defineEmits<{
  'submit': [data: PageFormData]
  'cancel': []
}>()

// =====================================================
// FORM SETUP
// =====================================================

const { values, errors, defineField, handleSubmit, setFieldValue, validate, validateField, setFieldError } = useForm({
  validationSchema: toTypedSchema(pageFormSchema),
  initialValues: props.initialData || pageFormDefaultValues
})

/**
 * Clear validation errors for specific fields
 */
function clearFieldErrors(fields: string[]) {
  for (const field of fields) {
    setFieldError(field as keyof PageFormData, undefined)
  }
}

// Define form fields with VeeValidate
const [title, titleAttrs] = defineField('title')
const [slug, slugAttrs] = defineField('slug')
const [parentId, parentIdAttrs] = defineField('parentId')
const [template, templateAttrs] = defineField('template')
const [status, statusAttrs] = defineField('status')
const [description, descriptionAttrs] = defineField('description')
const [content, contentAttrs] = defineField('content')
const [metadata, metadataAttrs] = defineField('metadata')

// =====================================================
// METADATA UPDATE HANDLER
// =====================================================

function handleMetadataUpdate(val: Record<string, any>) {
  if (import.meta.client && import.meta.dev) {
    consola.info('[PageForm] Received metadata update:', {
      val,
      valType: typeof val,
      isPlainObject: Object.prototype.toString.call(val) === '[object Object]',
      currentMetadata: values.metadata
    })
  }
  setFieldValue('metadata', val)
}

// =====================================================
// AUTO-GENERATE SLUG FROM TITLE
// =====================================================

const isSlugManuallyEdited = ref(false)

/**
 * Generate URL-friendly slug from title
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
 * Auto-generate slug when title changes (only if slug hasn't been manually edited and NOT in edit mode)
 */
watch(title, (newTitle) => {
  if (!props.isEditMode && !isSlugManuallyEdited.value && newTitle) {
    setFieldValue('slug', generateSlug(newTitle))
  }
})

/**
 * Mark slug as manually edited when user types in slug field
 */
function onSlugInput() {
  isSlugManuallyEdited.value = true
}

// =====================================================
// CHANGE DETECTION FOR EDIT MODE
// =====================================================

// Store initial values for change detection
const initialValues = ref<Partial<PageFormData> | null>(null)

// Initialize on mount
onMounted(() => {
  if (props.isEditMode && props.initialData) {
    initialValues.value = { ...props.initialData }
  }
})

/**
 * Check if a field has changed from its initial value
 */
function hasFieldChanged(fieldName: keyof PageFormData): boolean {
  if (!props.isEditMode || !initialValues.value) return false
  return values[fieldName] !== initialValues.value[fieldName]
}

/**
 * Check if slug has changed
 */
const hasSlugChanged = computed(() => hasFieldChanged('slug'))

/**
 * Check if parent has changed
 */
const hasParentChanged = computed(() => hasFieldChanged('parentId'))

/**
 * Check if template has changed
 */
const hasTemplateChanged = computed(() => hasFieldChanged('template'))

// =====================================================
// PARENT PAGE OPTIONS
// =====================================================

// Use existing composable for data fetching (DRY principle)
const { pages: availablePages, pending: isLoadingParentPages, fetchPages } = useAdminPages()

// Transform pages into dropdown options with hierarchical indentation
// Exclude current page in edit mode to prevent circular parent reference
const parentPageOptions = computed(() => {
  // Filter out current page if in edit mode
  const filteredPages = props.isEditMode && props.currentPageId
    ? availablePages.value.filter(page => page.id !== props.currentPageId)
    : availablePages.value

  const pageOptions = filteredPages.map((page) => ({
    value: page.id,
    label: `${'  '.repeat(page.depth)}${page.title}` // Indent based on depth
  }))

  return [
    { value: null, label: 'None (Top-level page)' },
    ...pageOptions
  ]
})

// =====================================================
// TEMPLATE OPTIONS (Database-Driven)
// =====================================================

const templates = ref<PageTemplate[]>([])
const isLoadingTemplates = ref(false)
const templateLoadError = ref<string | null>(null)

// Transform templates into dropdown options
const templateOptions = computed(() => {
  return templates.value.map((template) => ({
    value: template.slug,
    label: `${template.name} - ${template.description || 'No description'}`
  }))
})

// Fetch templates from API
async function fetchTemplates() {
  isLoadingTemplates.value = true
  templateLoadError.value = null

  try {
    if (import.meta.dev) {
      consola.info('[PageForm] Fetching templates from API')
    }

    const response = await $fetch<{ success: boolean; data: PageTemplate[]; total: number }>('/api/templates')

    if (response.success && response.data) {
      templates.value = response.data

      if (import.meta.dev) {
        consola.success(`[PageForm] Loaded ${response.data.length} templates`)
      }
    } else {
      throw new Error('Invalid response from API')
    }
  } catch (err: any) {
    templateLoadError.value = err.message || 'Failed to load templates'

    if (import.meta.dev) {
      consola.error('[PageForm] Failed to fetch templates:', err)
    }
  } finally {
    isLoadingTemplates.value = false
  }
}

// Fetch parent pages and templates on component mount
onMounted(async () => {
  await Promise.all([
    fetchPages({
      limit: 100,
      orderBy: 'full_path',
      orderDirection: 'asc'
    }),
    fetchTemplates()
  ])
})

// =====================================================
// TEMPLATE/DEPTH WARNINGS
// =====================================================

// Calculate the depth of the page being created/edited
const calculatedDepth = computed(() => {
  if (!parentId.value) return 0

  const parent = availablePages.value.find(p => p.id === parentId.value)
  return parent ? parent.depth + 1 : 0
})

// Check for unusual template/depth combinations
// Note: Legacy hub/spoke/sub-spoke templates are disabled - no warnings needed for article/default
const templateWarning = computed(() => {
  // Article and Default templates work at any depth - no warnings needed
  return null
})

// =====================================================
// STATUS OPTIONS
// =====================================================

const statusOptions = [
  { value: 'draft', label: 'Draft - Not visible to public' },
  { value: 'published', label: 'Published - Visible to public' },
  { value: 'archived', label: 'Archived - Hidden from public and admin lists' }
]

// =====================================================
// FORM SUBMISSION
// =====================================================

const onSubmit = handleSubmit(
  (formData) => {
    // Success callback - validation passed
    if (import.meta.dev) {
      consola.success('Form validation passed, submitting...')
    }
    emit('submit', formData)
  },
  ({ errors: validationErrors }) => {
    // Error callback - validation failed
    if (import.meta.dev) {
      consola.error('Form validation failed:', validationErrors)
    }
  }
)

function onCancel() {
  emit('cancel')
}

// =====================================================
// EXPOSE FORM STATE FOR SHEET INTEGRATION
// =====================================================

/**
 * Expose form state, options, and methods for external sheet components.
 * This enables the parent (edit.vue) to pass form data to sheets
 * and receive updates back.
 */
defineExpose({
  // Form submission
  submit: onSubmit,

  // Form values (reactive)
  formValues: values,
  formErrors: errors,

  // Field setters
  setFieldValue,

  // Validation methods (for sheet validation)
  validate,
  validateField,
  clearFieldErrors,

  // Slug manual edit tracking
  markSlugAsManuallyEdited: () => { isSlugManuallyEdited.value = true },

  // Change detection (computed)
  hasSlugChanged,
  hasParentChanged,
  hasTemplateChanged,

  // Parent page options
  parentPageOptions,
  isLoadingParentPages,

  // Template options
  templateOptions,
  isLoadingTemplates,
  templateLoadError
})
</script>

<template>
  <form @submit.prevent="onSubmit">
    <!-- Content Field (TipTap Editor) - Full Width -->
    <div class="space-y-2">
      <TipTapEditor
        v-model="content"
        v-bind="contentAttrs"
        placeholder="Start writing your page content..."
        :disabled="isSubmitting"
        :stickyToolbar="true"
        stickyOffset="60px"
      />
      <p v-if="errors.content" class="text-sm text-destructive">
        {{ errors.content }}
      </p>
    </div>
  </form>
</template>

