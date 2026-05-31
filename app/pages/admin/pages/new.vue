<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import consola from 'consola'
import { toast } from 'vue-sonner'
import type { PageFormData } from '~/schemas/admin/page-form.schema'

// =====================================================
// PAGE METADATA
// =====================================================

definePageMeta({
  layout: 'admin'
})

useHead({
  title: 'Create New Page - Admin'
})

// =====================================================
// STATE
// =====================================================

const router = useRouter()
const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)
const fieldErrors = ref<Record<string, string>>({})

// Sheet open states
const showPageSettingsSheet = ref(false)
const showSeoTemplateSheet = ref(false)

// Form ref for triggering submit and accessing form state
const pageFormRef = ref<{
  submit: () => void
  formValues: Record<string, any>
  formErrors: Record<string, string | undefined>
  setFieldValue: (field: string, value: any) => void
  validate: () => Promise<{ valid: boolean; errors: Record<string, string> }>
  validateField: (field: string) => Promise<{ valid: boolean; errors: string[] }>
  clearFieldErrors: (fields: string[]) => void
  markSlugAsManuallyEdited: () => void
  hasSlugChanged: boolean
  hasParentChanged: boolean
  hasTemplateChanged: boolean
  parentPageOptions: Array<{ value: string | null; label: string }>
  isLoadingParentPages: boolean
  templateOptions: Array<{ value: string; label: string }>
  isLoadingTemplates: boolean
  templateLoadError: string | null
} | null>(null)

// =====================================================
// SHEET VALIDATION
// =====================================================

/**
 * Validate Page Settings sheet fields before allowing close
 */
async function validatePageSettingsFields(): Promise<boolean> {
  if (!pageFormRef.value) return true

  // Validate required fields in Page Settings sheet
  const fieldsToValidate = ['title', 'slug', 'template', 'status']

  for (const field of fieldsToValidate) {
    await pageFormRef.value.validateField(field)
  }

  // Check if any of these fields have errors
  const errors = pageFormRef.value.formErrors
  const hasErrors = fieldsToValidate.some(field => errors[field])

  return !hasErrors
}

/**
 * Validate SEO sheet fields before allowing close
 */
async function validateSeoFields(): Promise<boolean> {
  if (!pageFormRef.value) return true

  // SEO fields that need validation (URLs, lengths, etc.)
  const fieldsToValidate = [
    'metaTitle', 'metaDescription', 'canonicalUrl',
    'ogTitle', 'ogDescription', 'ogImage',
    'twitterTitle', 'twitterDescription', 'twitterImage'
  ]

  for (const field of fieldsToValidate) {
    await pageFormRef.value.validateField(field)
  }

  // Check if any SEO fields have errors
  const errors = pageFormRef.value.formErrors
  const hasErrors = fieldsToValidate.some(field => errors[field])

  return !hasErrors
}

// Page Settings sheet fields
const pageSettingsFields = ['title', 'slug', 'parentId', 'template', 'status', 'description']

// SEO sheet fields
const seoSheetFields = [
  'metaTitle', 'metaDescription', 'canonicalUrl',
  'ogTitle', 'ogDescription', 'ogImage',
  'twitterTitle', 'twitterDescription', 'twitterImage'
]

/**
 * Cancel Page Settings sheet - clear errors and close
 */
function cancelPageSettingsSheet() {
  if (pageFormRef.value) {
    pageFormRef.value.clearFieldErrors(pageSettingsFields)
  }
  showPageSettingsSheet.value = false
}

/**
 * Cancel SEO sheet - clear errors and close
 */
function cancelSeoSheet() {
  if (pageFormRef.value) {
    pageFormRef.value.clearFieldErrors(seoSheetFields)
  }
  showSeoTemplateSheet.value = false
}

// =====================================================
// FORM SUBMISSION
// =====================================================

/**
 * Map PageFormData to CreatePageInput for API
 * All SEO fields are now supported by the API
 */
function mapFormDataToApiInput(formData: PageFormData) {
  return {
    // Required fields
    title: formData.title,
    content: formData.content,

    // Optional core fields
    parentId: formData.parentId || undefined,
    slug: formData.slug || undefined,
    template: formData.template,
    description: formData.description || undefined,
    status: formData.status,

    // Basic SEO fields
    metaTitle: formData.metaTitle || undefined,
    metaDescription: formData.metaDescription || undefined,
    metaKeywords: formData.metaKeywords || undefined,
    focusKeyword: formData.focusKeyword || undefined,

    // Open Graph fields
    ogTitle: formData.ogTitle || undefined,
    ogDescription: formData.ogDescription || undefined,
    ogImage: formData.ogImage || undefined, // API only accepts ogImage, not other OG fields
    ogType: formData.ogType || undefined,

    // Twitter Card fields
    twitterCard: formData.twitterCard || undefined,
    twitterTitle: formData.twitterTitle || undefined,
    twitterDescription: formData.twitterDescription || undefined,
    twitterImage: formData.twitterImage || undefined,

    // Schema.org fields
    schemaType: formData.schemaType || undefined,

    // Advanced SEO fields
    metaRobots: formData.metaRobots || undefined,
    sitemapPriority: formData.sitemapPriority || undefined,
    sitemapChangefreq: formData.sitemapChangefreq || undefined,
    canonicalUrl: formData.canonicalUrl || undefined,
    redirectUrl: formData.redirectUrl || undefined,
    redirectType: formData.redirectType || undefined,

    // Template metadata
    metadata: formData.metadata || undefined
  }
}

/**
 * Handle form submission
 */
async function handleSubmit(formData: PageFormData) {
  try {
    isSubmitting.value = true
    errorMessage.value = null
    fieldErrors.value = {}

    if (import.meta.dev) {
      consola.info('📝 Form submitted with data:', formData)
    }

    // Map form data to API input format
    const apiInput = mapFormDataToApiInput(formData)

    if (import.meta.dev) {
      consola.info('📤 Sending to API:', apiInput)
    }

    // Call API to create page
    const response = await $fetch('/api/pages', {
      method: 'POST',
      body: apiInput
    })

    if (import.meta.dev) {
      consola.success('✅ Page created successfully:', response)
    }

    // Show success toast and redirect
    toast.success('Page created successfully!')
    router.push('/admin/pages')
  } catch (error: any) {
    if (import.meta.dev) {
      consola.error('❌ Error creating page:', error)
    }

    // Extract error message from various possible locations
    const errorMsg = error.data?.message || error.message || error.statusMessage
    const statusCode = error.statusCode || error.status

    // Handle different error types
    if (statusCode === 400 && error.data?.issues) {
      // Zod validation errors from server
      const issues = error.data.issues as Array<{ path: string[]; message: string }>
      fieldErrors.value = issues.reduce((acc, issue) => {
        const fieldName = issue.path.join('.')
        acc[fieldName] = issue.message
        return acc
      }, {} as Record<string, string>)

      errorMessage.value = 'Please fix the validation errors below.'
      toast.error('Validation errors', {
        description: 'Please fix the errors in the form below.'
      })

      if (import.meta.dev) {
        consola.warn('Validation errors:', fieldErrors.value)
      }
    } else if (statusCode === 409) {
      // Conflict error (e.g., slug already exists)
      const conflictMsg = errorMsg || 'A page with this slug already exists under the selected parent.'
      errorMessage.value = conflictMsg
      toast.error('Page already exists', { description: conflictMsg })
    } else if (statusCode === 401 || statusCode === 403) {
      // Authentication/authorization error
      const authMsg = 'You do not have permission to create pages. Please log in.'
      errorMessage.value = authMsg
      toast.error('Permission denied', { description: authMsg })
    } else {
      // Generic error
      const genericMsg = errorMsg || 'Failed to create page. Please try again.'
      errorMessage.value = genericMsg
      toast.error('Failed to create page', { description: genericMsg })
    }
  } finally {
    isSubmitting.value = false
  }
}

/**
 * Handle form cancellation
 */
function handleCancel() {
  router.push('/admin/pages')
}
</script>

<template>
  <div>
    <!-- Sticky Header with Controls -->
    <div class="sticky top-0 z-10 -mx-4 mb-6 bg-background/95 pb-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div class="flex items-center justify-between gap-4 px-4">
        <div>
          <h1 class="text-2xl font-bold">Create New Page</h1>
          <p class="text-sm text-muted-foreground">Add a new page to your website</p>
        </div>
        <div class="flex items-center gap-2">
          <!-- Settings Sheet Buttons -->
          <UiButton
            type="button"
            variant="ghost"
            size="sm"
            @click="showPageSettingsSheet = true"
          >
            <Icon name="heroicons:cog-6-tooth" class="size-4 mr-1.5" />
            Page Settings
          </UiButton>
          <UiButton
            type="button"
            variant="ghost"
            size="sm"
            @click="showSeoTemplateSheet = true"
          >
            <Icon name="heroicons:magnifying-glass-circle" class="size-4 mr-1.5" />
            SEO & Template
          </UiButton>

          <!-- Divider -->
          <div class="w-px h-6 bg-border mx-1" />

          <!-- Cancel Button -->
          <UiButton
            type="button"
            variant="outline"
            size="sm"
            @click="handleCancel"
            :disabled="isSubmitting"
          >
            Cancel
          </UiButton>

          <!-- Create Page Button -->
          <UiButton
            @click="pageFormRef?.submit()"
            :disabled="isSubmitting"
            size="sm"
            class="min-w-[100px]"
          >
            <Icon v-if="isSubmitting" name="heroicons:arrow-path" class="size-4 animate-spin mr-2" />
            Create Page
          </UiButton>
        </div>
      </div>
    </div>

    <!-- Error Message -->
    <UiCard v-if="errorMessage" class="mb-6 border-destructive bg-destructive/10">
      <UiCardContent class="pt-6">
        <div class="flex items-start justify-between">
          <div class="flex items-start gap-3">
            <Icon name="heroicons:exclamation-circle" class="size-5 mt-0.5 text-destructive" />
            <p class="text-sm text-destructive">{{ errorMessage }}</p>
          </div>
          <UiButton
            variant="ghost"
            size="icon-sm"
            @click="errorMessage = null"
          >
            <Icon name="heroicons:x-mark" class="size-5 text-destructive" />
          </UiButton>
        </div>
      </UiCardContent>
    </UiCard>

    <!-- Page Form (TipTap Editor Only) -->
    <PageForm
      ref="pageFormRef"
      :is-submitting="isSubmitting"
      @submit="handleSubmit"
      @cancel="handleCancel"
    />

    <!-- Page Settings Sheet -->
    <PageSettingsSheet
      v-if="pageFormRef"
      :open="showPageSettingsSheet"
      @update:open="showPageSettingsSheet = $event"
      :title="pageFormRef.formValues.title ?? ''"
      :slug="pageFormRef.formValues.slug ?? ''"
      :parentId="pageFormRef.formValues.parentId ?? null"
      :template="pageFormRef.formValues.template ?? 'default'"
      :status="pageFormRef.formValues.status ?? 'draft'"
      :description="pageFormRef.formValues.description ?? null"
      :parentPageOptions="pageFormRef.parentPageOptions"
      :templateOptions="pageFormRef.templateOptions"
      :isLoadingParentPages="pageFormRef.isLoadingParentPages"
      :isLoadingTemplates="pageFormRef.isLoadingTemplates"
      :templateLoadError="pageFormRef.templateLoadError"
      :errors="pageFormRef.formErrors"
      :isEditMode="false"
      :disabled="isSubmitting"
      :onBeforeClose="validatePageSettingsFields"
      :onCancel="cancelPageSettingsSheet"
      @update:title="pageFormRef.setFieldValue('title', $event)"
      @update:slug="pageFormRef.setFieldValue('slug', $event)"
      @update:parentId="pageFormRef.setFieldValue('parentId', $event)"
      @update:template="pageFormRef.setFieldValue('template', $event)"
      @update:status="pageFormRef.setFieldValue('status', $event)"
      @update:description="pageFormRef.setFieldValue('description', $event)"
      @slug-manual-edit="pageFormRef.markSlugAsManuallyEdited()"
    />

    <!-- SEO & Template Settings Sheet -->
    <SeoTemplateSheet
      v-if="pageFormRef"
      :open="showSeoTemplateSheet"
      @update:open="showSeoTemplateSheet = $event"
      :template="pageFormRef.formValues.template ?? 'default'"
      :metadata="pageFormRef.formValues.metadata ?? {}"
      :seoValues="pageFormRef.formValues"
      :seoErrors="pageFormRef.formErrors"
      :disabled="isSubmitting"
      :onBeforeClose="validateSeoFields"
      :onCancel="cancelSeoSheet"
      @update:metadata="pageFormRef.setFieldValue('metadata', $event)"
      @update:seoField="(name, value) => pageFormRef?.setFieldValue(name, value)"
    />
  </div>
</template>

