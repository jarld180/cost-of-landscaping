<script setup lang="ts">
import { computed } from 'vue'

/**
 * PageSettingsSheet - Sheet component for page metadata settings
 *
 * Contains: Title, Slug, Parent Page, Template, Status, Description
 * Used in edit.vue to declutter the main form and focus on content editing.
 */

interface PageOption {
  value: string | null
  label: string
}

interface TemplateOption {
  value: string
  label: string
}

interface Props {
  open: boolean
  // Form values
  title: string
  slug: string
  parentId: string | null
  template: string
  status: string
  description: string | null
  // Options
  parentPageOptions: PageOption[]
  templateOptions: TemplateOption[]
  // Loading states
  isLoadingParentPages?: boolean
  isLoadingTemplates?: boolean
  templateLoadError?: string | null
  // Validation errors
  errors?: Record<string, string | undefined>
  // Edit mode flags
  isEditMode?: boolean
  hasSlugChanged?: boolean
  hasParentChanged?: boolean
  hasTemplateChanged?: boolean
  // Disabled state
  disabled?: boolean
  // Validation callback for Create mode
  onBeforeClose?: () => Promise<boolean>
  // Cancel callback - clears errors and closes
  onCancel?: () => void
}

const props = withDefaults(defineProps<Props>(), {
  isLoadingParentPages: false,
  isLoadingTemplates: false,
  templateLoadError: null,
  errors: () => ({}),
  isEditMode: false,
  hasSlugChanged: false,
  hasParentChanged: false,
  hasTemplateChanged: false,
  disabled: false,
  onBeforeClose: undefined,
  onCancel: undefined
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  'update:title': [value: string]
  'update:slug': [value: string]
  'update:parentId': [value: string | null]
  'update:template': [value: string]
  'update:status': [value: string]
  'update:description': [value: string | null]
  'slug-manual-edit': []
}>()

// Fields that belong to this sheet
const sheetFields = ['title', 'slug', 'parentId', 'template', 'status', 'description'] as const

// Check if this sheet has any validation errors
const hasErrors = computed(() => {
  return sheetFields.some(field => props.errors[field])
})

// Status options
const statusOptions = [
  { value: 'draft', label: 'Draft - Not visible to public' },
  { value: 'published', label: 'Published - Visible to public' },
  { value: 'archived', label: 'Archived - Hidden from public and admin lists' }
]

// Handle slug input to track manual edits
function onSlugInput(value: string) {
  emit('update:slug', value)
  emit('slug-manual-edit')
}

// Handle close attempt - validate first if callback provided, then check for errors
async function handleClose() {
  // If onBeforeClose is provided (Create mode), trigger validation first
  if (props.onBeforeClose) {
    await props.onBeforeClose()
  }

  // Only close if no errors
  if (!hasErrors.value) {
    emit('update:open', false)
  }
}

// Handle overlay/escape close attempts (with validation)
async function handleOpenChange(value: boolean) {
  if (!value) {
    // Trying to close - validate first if needed
    if (props.onBeforeClose) {
      await props.onBeforeClose()
    }
    if (!hasErrors.value) {
      emit('update:open', false)
    }
  } else {
    emit('update:open', value)
  }
}

// Force close without validation (for X button and Cancel button)
// Calls onCancel to clear errors if provided
function forceClose() {
  if (props.onCancel) {
    props.onCancel()
  } else {
    emit('update:open', false)
  }
}
</script>

<template>
  <UiSheet :open="open" @update:open="handleOpenChange">
    <UiSheetContent side="right" class="w-full sm:max-w-lg overflow-hidden flex flex-col p-6" hide-close-button>
      <!-- Custom X button that bypasses validation -->
      <button
        type="button"
        class="ring-offset-background focus:ring-ring absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden z-10"
        @click="forceClose"
      >
        <Icon name="lucide:x" class="size-4" />
        <span class="sr-only">Close</span>
      </button>

      <UiSheetHeader class="flex-shrink-0 pb-4">
        <UiSheetTitle>Page Settings</UiSheetTitle>
        <UiSheetDescription>
          Configure page metadata, hierarchy, and visibility
        </UiSheetDescription>
      </UiSheetHeader>

      <div class="flex-1 overflow-y-auto min-h-0">
        <div class="space-y-6 py-4">
          <!-- Title Field -->
          <div class="space-y-2">
            <UiLabel for="sheet-title">
              Title <span class="text-destructive">*</span>
            </UiLabel>
            <UiInput
              id="sheet-title"
              :model-value="title"
              @update:model-value="emit('update:title', $event)"
              placeholder="Enter page title"
              :disabled="disabled"
            />
            <p v-if="errors.title" class="text-sm text-destructive">
              {{ errors.title }}
            </p>
            <p class="text-xs text-muted-foreground">
              The main heading for this page (max 200 characters)
            </p>
          </div>

          <!-- Slug Field -->
          <div class="space-y-2">
            <UiLabel for="sheet-slug">
              Slug <span class="text-destructive">*</span>
            </UiLabel>
            <UiInput
              id="sheet-slug"
              :model-value="slug"
              @update:model-value="onSlugInput"
              placeholder="page-url-slug"
              :disabled="disabled"
            />
            <p v-if="errors.slug" class="text-sm text-destructive">
              {{ errors.slug }}
            </p>
            <!-- Warning for slug change in edit mode -->
            <div
              v-if="isEditMode && hasSlugChanged"
              class="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md"
            >
              <div class="flex items-start gap-2">
                <Icon name="heroicons:exclamation-triangle" class="size-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <div class="flex-1">
                  <p class="text-sm font-medium text-yellow-800 dark:text-yellow-200">SEO Impact Warning</p>
                  <p class="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    Changing the slug will update the URL for this page and all its child pages.
                  </p>
                </div>
              </div>
            </div>
            <p v-else class="text-xs text-muted-foreground">
              URL-friendly identifier (auto-generated from title, or customize manually)
            </p>
          </div>

          <!-- Parent Page Field -->
          <div class="space-y-2">
            <UiLabel for="sheet-parentId">Parent Page</UiLabel>
            <UiSelect
              :model-value="parentId"
              @update:model-value="emit('update:parentId', $event)"
              :disabled="disabled || isLoadingParentPages"
            >
              <UiSelectTrigger class="w-full">
                <UiSelectValue placeholder="Select parent page" />
              </UiSelectTrigger>
              <UiSelectContent>
                <UiSelectItem
                  v-for="option in parentPageOptions"
                  :key="option.value ?? 'null'"
                  :value="option.value"
                >
                  {{ option.label }}
                </UiSelectItem>
              </UiSelectContent>
            </UiSelect>
            <p v-if="errors.parentId" class="text-sm text-destructive">
              {{ errors.parentId }}
            </p>
            <!-- Warning for parent change in edit mode -->
            <div
              v-if="isEditMode && hasParentChanged"
              class="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md"
            >
              <div class="flex items-start gap-2">
                <Icon name="heroicons:exclamation-triangle" class="size-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <div class="flex-1">
                  <p class="text-sm font-medium text-yellow-800 dark:text-yellow-200">Hierarchy Change Warning</p>
                  <p class="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    Changing the parent will update the URL path and depth for this page and all its children.
                  </p>
                </div>
              </div>
            </div>
            <p v-else class="text-xs text-muted-foreground">
              Optional: Select a parent page to create a hierarchical structure
            </p>
          </div>

          <!-- Template Field -->
          <div class="space-y-2">
            <UiLabel for="sheet-template">
              Template <span class="text-destructive">*</span>
            </UiLabel>
            <UiSelect
              :model-value="template"
              @update:model-value="emit('update:template', $event)"
              :disabled="disabled || isLoadingTemplates"
            >
              <UiSelectTrigger class="w-full">
                <UiSelectValue placeholder="Select template" />
              </UiSelectTrigger>
              <UiSelectContent>
                <UiSelectItem
                  v-for="option in templateOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </UiSelectItem>
              </UiSelectContent>
            </UiSelect>
            <p v-if="isLoadingTemplates" class="text-sm text-primary">
              Loading templates...
            </p>
            <p v-else-if="templateLoadError" class="text-sm text-destructive">
              {{ templateLoadError }}
            </p>
            <p v-else-if="errors.template" class="text-sm text-destructive">
              {{ errors.template }}
            </p>
            <!-- Warning for template change in edit mode -->
            <div
              v-else-if="isEditMode && hasTemplateChanged"
              class="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md"
            >
              <div class="flex items-start gap-2">
                <Icon name="heroicons:exclamation-triangle" class="size-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <div class="flex-1">
                  <p class="text-sm font-medium text-yellow-800 dark:text-yellow-200">Template Change Warning</p>
                  <p class="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    Changing the template may clear incompatible metadata fields.
                  </p>
                </div>
              </div>
            </div>
            <p v-else class="text-xs text-muted-foreground">
              Choose the template that best fits your content type
            </p>
          </div>

          <!-- Status Field -->
          <div class="space-y-2">
            <UiLabel for="sheet-status">
              Status <span class="text-destructive">*</span>
            </UiLabel>
            <UiSelect
              :model-value="status"
              @update:model-value="emit('update:status', $event)"
              :disabled="disabled"
            >
              <UiSelectTrigger class="w-full">
                <UiSelectValue placeholder="Select status" />
              </UiSelectTrigger>
              <UiSelectContent>
                <UiSelectItem
                  v-for="option in statusOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </UiSelectItem>
              </UiSelectContent>
            </UiSelect>
            <p v-if="errors.status" class="text-sm text-destructive">
              {{ errors.status }}
            </p>
            <p class="text-xs text-muted-foreground">
              Control the visibility of this page
            </p>
          </div>

          <!-- Description Field -->
          <div class="space-y-2">
            <UiLabel for="sheet-description">Description</UiLabel>
            <UiTextarea
              id="sheet-description"
              :model-value="description ?? ''"
              @update:model-value="emit('update:description', $event || null)"
              placeholder="Enter a brief description of this page"
              :disabled="disabled"
              rows="4"
            />
            <p v-if="errors.description" class="text-sm text-destructive">
              {{ errors.description }}
            </p>
            <p class="text-xs text-muted-foreground">
              Optional: A short summary of the page content (max 500 characters)
            </p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex-shrink-0 pt-4 border-t border-border space-y-3">
        <!-- Error Message -->
        <div
          v-if="hasErrors"
          class="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md"
        >
          <Icon name="heroicons:exclamation-circle" class="size-4 text-destructive flex-shrink-0" />
          <p class="text-sm text-destructive">Please fix the validation errors above before closing.</p>
        </div>

        <div class="flex items-center justify-end gap-2">
          <UiButton
            type="button"
            variant="outline"
            @click="forceClose"
          >
            Cancel
          </UiButton>
          <UiButton
            type="button"
            @click="handleClose"
            :disabled="hasErrors"
          >
            Save & Close
          </UiButton>
        </div>
      </div>
    </UiSheetContent>
  </UiSheet>
</template>

