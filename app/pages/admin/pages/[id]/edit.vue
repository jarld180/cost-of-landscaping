<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
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
  title: 'Edit Page - Admin'
})

// =====================================================
// STATE
// =====================================================

const router = useRouter()
const route = useRoute()
const pageId = computed(() => route.params.id as string)

const isLoading = ref(true)
const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)
const fieldErrors = ref<Record<string, string>>({})
const initialFormData = ref<Partial<PageFormData> | null>(null)
const currentPageStatus = ref<string>('draft')
const childrenCount = ref<number>(0)
const showArchiveDialog = ref(false)
const showDeleteDialog = ref(false)
const showUnarchiveDialog = ref(false)
const isArchiving = ref(false)
const isDeleting = ref(false)

// Sheet open states
const showPageSettingsSheet = ref(false)
const showSeoTemplateSheet = ref(false)

// Form ref for triggering submit and accessing form state
// Note: Exposed refs from child component are automatically unwrapped, no need for .value
const pageFormRef = ref<{
  submit: () => void
  formValues: Record<string, any>
  formErrors: Record<string, string | undefined>
  setFieldValue: (field: string, value: any) => void
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

// Save button state: 'idle' | 'saving' | 'saved'
const saveButtonState = ref<'idle' | 'saving' | 'saved'>('idle')

// Smart button logic
const hasChildren = computed(() => childrenCount.value > 0)
const isArchived = computed(() => currentPageStatus.value === 'archived')
const showArchiveButton = computed(() => !isArchived.value && hasChildren.value)
const showDeleteButton = computed(() => !isArchived.value && !hasChildren.value)
const showUnarchiveButton = computed(() => isArchived.value)

// =====================================================
// FETCH PAGE DATA
// =====================================================

/**
 * Fetch page data from API
 */
async function fetchPageData() {
  try {
    isLoading.value = true
    errorMessage.value = null

    if (import.meta.dev) {
      consola.info(`📥 Fetching page data for ID: ${pageId.value}`)
    }

    // Use $fetch on the client for a single-shot request instead of useFetch
    const response = await $fetch(`/api/pages/${pageId.value}`)

    if (!response) {
      throw new Error('Invalid response from server')
    }

    // Handle both wrapped { success, data } and direct page objects
    const page = (response as any).data ?? response

    if (!page) {
      throw new Error('Page not found')
    }

    if (import.meta.dev) {
      consola.success('📥 Page data fetched:', page.title)
    }

    // Store current page status for smart button logic
    currentPageStatus.value = page.status

    // Map API response to form data structure
    initialFormData.value = mapApiResponseToFormData(page)

    // Fetch children count for smart button logic
    await fetchChildrenCount()
  } catch (err) {
    if (import.meta.dev) {
      consola.error('❌ Error fetching page:', err)
    }
    errorMessage.value = err instanceof Error ? err.message : 'Failed to load page'
  } finally {
    isLoading.value = false
  }
}

/**
 * Fetch children count to determine which button to show
 */
async function fetchChildrenCount() {
  try {
    const response = await $fetch(`/api/pages/${pageId.value}/children`)
    const data = (response as any).data ?? response
    childrenCount.value = Array.isArray(data) ? data.length : (response as any).total ?? 0

    if (import.meta.dev) {
      consola.info(`📊 Children count: ${childrenCount.value}`)
    }
  } catch (err) {
    if (import.meta.dev) {
      consola.warn('Failed to fetch children count:', err)
    }
    childrenCount.value = 0
  }
}

/**
 * Map API response (Page) to PageFormData structure
 */
function mapApiResponseToFormData(page: any): Partial<PageFormData> {
  // Extract SEO data from metadata.seo if it exists
  const seoMetadata = page.metadata?.seo || {}

  // Extract nested OG, Twitter, and Schema data
  const ogData = seoMetadata.og || {}
  const twitterData = seoMetadata.twitter || {}
  const schemaData = seoMetadata.schema || {}

  return {
    // Core fields
    title: page.title,
    slug: page.slug,
    parentId: page.parent_id || null,
    template: page.template,
    status: page.status,
    description: page.description || null,
    content: page.content,

    // Basic SEO fields (from columns)
    metaTitle: page.meta_title || null,
    metaKeywords: page.meta_keywords || null,
    focusKeyword: page.focus_keyword || null,

    // Basic SEO fields (from metadata.seo)
    metaDescription: seoMetadata.metaDescription || null,

    // Open Graph fields (from metadata.seo.og)
    ogTitle: ogData.title || null,
    ogDescription: ogData.description || null,
    ogImage: page.og_image || null, // Still from column for backward compatibility
    ogType: ogData.type || null,

    // Twitter Card fields (from metadata.seo.twitter)
    twitterCard: twitterData.card || null,
    twitterTitle: twitterData.title || null,
    twitterDescription: twitterData.description || null,
    twitterImage: twitterData.image || null,

    // Schema.org fields (from metadata.seo.schema)
    schemaType: schemaData['@type'] || null,

    // Advanced SEO fields (from columns)
    metaRobots: page.meta_robots || null,
    sitemapPriority: page.sitemap_priority || null,
    sitemapChangefreq: page.sitemap_changefreq || null,
    canonicalUrl: page.canonical_url || null,
    redirectUrl: page.redirect_url || null,
    redirectType: page.redirect_type || null,

    // Template metadata (extract from metadata.template)
    metadata: page.metadata?.template || {}
  }
}

// Fetch page data on mount
onMounted(() => {
  fetchPageData()
})

// =====================================================
// FORM SUBMISSION
// =====================================================

/**
 * Map PageFormData to UpdatePageInput for API
 */
function mapFormDataToApiInput(formData: PageFormData) {
  return {
    // Core fields
    title: formData.title,
    content: formData.content,
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
    ogImage: formData.ogImage || undefined,
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
    // Use null (not undefined) for canonicalUrl so empty value is saved to DB
    canonicalUrl: formData.canonicalUrl || null,
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
    saveButtonState.value = 'saving'
    errorMessage.value = null
    fieldErrors.value = {}

    if (import.meta.dev) {
      consola.info('📝 Form submitted with data:', formData)
    }

    // Map form data to API input format
    const apiInput = mapFormDataToApiInput(formData)

    if (import.meta.dev) {
      consola.info('📤 Sending PATCH to API:', apiInput)
    }

    // Call PATCH endpoint using $fetch (not useFetch, which is for setup-time only)
    try {
      const data = await $fetch(`/api/pages/${pageId.value}`, {
        method: 'PATCH',
        body: apiInput
      })

      if (!data?.success) {
        const failMsg = 'Failed to update page. Please try again.'
        errorMessage.value = failMsg
        toast.error('Update failed', { description: failMsg })
        return
      }
    } catch (err: any) {
      if (import.meta.dev) {
        consola.error('❌ API Error:', err)
      }

      // Handle different error types
      const statusCode = err.statusCode || err.status || 500

      if (statusCode === 400) {
        // Validation errors
        const validationMsg = 'Please check the form for errors'
        errorMessage.value = validationMsg
        toast.error('Validation errors', { description: validationMsg })
      } else if (statusCode === 409) {
        // Conflict (slug already exists)
        const conflictMsg = err.data?.message || err.message || 'A page with this slug already exists'
        errorMessage.value = conflictMsg
        toast.error('Page already exists', { description: conflictMsg })
      } else if (statusCode === 401 || statusCode === 403) {
        // Auth errors
        const authMsg = 'You do not have permission to update this page'
        errorMessage.value = authMsg
        toast.error('Permission denied', { description: authMsg })
      } else {
        // Generic error
        const genericMsg = err.data?.message || err.message || 'Failed to update page. Please try again.'
        errorMessage.value = genericMsg
        toast.error('Failed to update page', { description: genericMsg })
      }

      return
    }

    if (import.meta.dev) {
      consola.success('✅ Page updated successfully!')
    }

    // Show success toast (stay on page, no redirect)
    toast.success('Page updated successfully!')

    // Show "Saved!" state for 1 second, then revert to idle
    saveButtonState.value = 'saved'
    setTimeout(() => {
      saveButtonState.value = 'idle'
    }, 1000)
  } catch (err) {
    if (import.meta.dev) {
      consola.error('❌ Unexpected error:', err)
    }
    errorMessage.value = 'An unexpected error occurred. Please try again.'
    saveButtonState.value = 'idle'
  } finally {
    isSubmitting.value = false
  }
}

// =====================================================
// ARCHIVE / DELETE / UNARCHIVE HANDLERS
// =====================================================

/**
 * Open archive confirmation dialog
 */
function openArchiveDialog() {
  showArchiveDialog.value = true
}

/**
 * Open delete confirmation dialog
 */
function openDeleteDialog() {
  showDeleteDialog.value = true
}

/**
 * Open unarchive confirmation dialog
 */
function openUnarchiveDialog() {
  showUnarchiveDialog.value = true
}

/**
 * Handle archive action (cascade to descendants)
 */
async function handleArchive() {
  try {
    isArchiving.value = true
    errorMessage.value = null

    if (import.meta.dev) {
      consola.info(`🗄️ Archiving page: ${pageId.value}`)
    }

    // Use PATCH endpoint to set status to 'archived'
    let archiveSuccess = false
    try {
      const data = await $fetch(`/api/pages/${pageId.value}`, {
        method: 'PATCH',
        body: { status: 'archived' }
      })
      archiveSuccess = !!data?.success
    } catch (err: any) {
      if (import.meta.dev) {
        consola.error('❌ Archive error:', err)
      }
      const archiveErrorMsg = err.data?.message || err.message || 'Failed to archive page'
      errorMessage.value = archiveErrorMsg
      toast.error('Archive failed', { description: archiveErrorMsg })
      showArchiveDialog.value = false
      return
    }

    if (!archiveSuccess) {
      const archiveFailMsg = 'Failed to archive page. Please try again.'
      errorMessage.value = archiveFailMsg
      toast.error('Archive failed', { description: archiveFailMsg })
      showArchiveDialog.value = false
      return
    }

    if (import.meta.dev) {
      consola.success('✅ Page archived successfully!')
    }

    // Show success toast and redirect
    const archiveMsg = childrenCount.value > 0
      ? `Page archived successfully! ${childrenCount.value} child page(s) also archived.`
      : 'Page archived successfully!'
    toast.success('Page archived', { description: archiveMsg })
    router.push('/admin/pages')
  } catch (err) {
    if (import.meta.dev) {
      consola.error('❌ Unexpected archive error:', err)
    }
    errorMessage.value = 'An unexpected error occurred while archiving.'
    showArchiveDialog.value = false
  } finally {
    isArchiving.value = false
  }
}

/**
 * Handle delete action (soft delete)
 */
async function handleDelete() {
  try {
    isDeleting.value = true
    errorMessage.value = null

    if (import.meta.dev) {
      consola.info(`🗑️ Deleting page: ${pageId.value}`)
    }

    // Use DELETE endpoint for soft delete
    let deleteSuccess = false
    try {
      const data = await $fetch(`/api/pages/${pageId.value}`, {
        method: 'DELETE'
      })
      deleteSuccess = !!data?.success
    } catch (err: any) {
      if (import.meta.dev) {
        consola.error('❌ Delete error:', err)
      }
      const deleteErrorMsg = err.data?.message || err.message || 'Failed to delete page'
      errorMessage.value = deleteErrorMsg
      toast.error('Delete failed', { description: deleteErrorMsg })
      showDeleteDialog.value = false
      return
    }

    if (!deleteSuccess) {
      const deleteFailMsg = 'Failed to delete page. Please try again.'
      errorMessage.value = deleteFailMsg
      toast.error('Delete failed', { description: deleteFailMsg })
      showDeleteDialog.value = false
      return
    }

    if (import.meta.dev) {
      consola.success('✅ Page deleted successfully!')
    }

    // Show success toast and redirect
    toast.success('Page deleted successfully!')
    router.push('/admin/pages')
  } catch (err) {
    if (import.meta.dev) {
      consola.error('❌ Unexpected delete error:', err)
    }
    errorMessage.value = 'An unexpected error occurred while deleting.'
    showDeleteDialog.value = false
  } finally {
    isDeleting.value = false
  }
}

/**
 * Handle unarchive action
 */
async function handleUnarchive() {
  try {
    isArchiving.value = true
    errorMessage.value = null

    if (import.meta.dev) {
      consola.info(`📂 Unarchiving page: ${pageId.value}`)
    }

    // Use PATCH endpoint to set status to 'draft'
    let unarchiveSuccess = false
    try {
      const data = await $fetch(`/api/pages/${pageId.value}`, {
        method: 'PATCH',
        body: { status: 'draft' }
      })
      unarchiveSuccess = !!data?.success
    } catch (err: any) {
      if (import.meta.dev) {
        consola.error('❌ Unarchive error:', err)
      }
      const unarchiveErrorMsg = err.data?.message || err.message || 'Failed to restore page'
      errorMessage.value = unarchiveErrorMsg
      toast.error('Restore failed', { description: unarchiveErrorMsg })
      showUnarchiveDialog.value = false
      return
    }

    if (!unarchiveSuccess) {
      const unarchiveFailMsg = 'Failed to restore page. Please try again.'
      errorMessage.value = unarchiveFailMsg
      toast.error('Restore failed', { description: unarchiveFailMsg })
      showUnarchiveDialog.value = false
      return
    }

    if (import.meta.dev) {
      consola.success('✅ Page unarchived successfully!')
    }

    // Show success toast and redirect
    toast.success('Page restored successfully!')
    router.push('/admin/pages')
  } catch (err) {
    if (import.meta.dev) {
      consola.error('❌ Unexpected unarchive error:', err)
    }
    errorMessage.value = 'An unexpected error occurred while unarchiving.'
    showUnarchiveDialog.value = false
  } finally {
    isArchiving.value = false
  }
}
</script>

<template>
  <div>
    <!-- Loading State -->
    <UiCard v-if="isLoading">
      <UiCardContent class="py-8 text-center">
        <p class="text-muted-foreground">Loading page data...</p>
      </UiCardContent>
    </UiCard>

    <!-- Error State (when loading fails) -->
    <UiCard v-else-if="errorMessage && !initialFormData" class="border-destructive bg-destructive/10">
      <UiCardContent class="pt-6">
        <h2 class="mb-2 text-lg font-semibold text-destructive">Error Loading Page</h2>
        <p class="text-destructive/80">{{ errorMessage }}</p>
        <UiButton @click="router.push('/admin/pages')" class="mt-4">
          Back to Pages
        </UiButton>
      </UiCardContent>
    </UiCard>

    <!-- Edit Form -->
    <div v-else-if="initialFormData">
      <!-- Sticky Header with Controls -->
      <div class="sticky top-0 z-10 -mx-4 mb-6 bg-background/95 pb-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div class="flex items-center justify-between gap-4 px-4">
          <div>
            <h1 class="text-2xl font-bold">Edit Page</h1>
            <p class="text-sm text-muted-foreground">Update page content, SEO settings, and metadata</p>
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

            <!-- Delete/Archive/Unarchive Dropdown -->
            <UiDropdownMenu>
              <UiDropdownMenuTrigger as-child>
                <UiButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  class="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Icon name="heroicons:trash" class="size-4 mr-1.5" />
                  <Icon name="heroicons:chevron-down" class="size-3" />
                </UiButton>
              </UiDropdownMenuTrigger>
              <UiDropdownMenuContent align="end">
                <!-- Archive (for pages with children) -->
                <UiDropdownMenuItem
                  v-if="showArchiveButton"
                  @click="openArchiveDialog"
                  class="text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <Icon name="heroicons:archive-box" class="size-4 mr-2" />
                  Archive Page
                </UiDropdownMenuItem>
                <!-- Delete (for pages without children) -->
                <UiDropdownMenuItem
                  v-if="showDeleteButton"
                  @click="openDeleteDialog"
                  class="text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <Icon name="heroicons:trash" class="size-4 mr-2" />
                  Delete Page
                </UiDropdownMenuItem>
                <!-- Unarchive (for archived pages) -->
                <UiDropdownMenuItem
                  v-if="showUnarchiveButton"
                  @click="openUnarchiveDialog"
                >
                  <Icon name="heroicons:arrow-uturn-left" class="size-4 mr-2" />
                  Restore Page
                </UiDropdownMenuItem>
              </UiDropdownMenuContent>
            </UiDropdownMenu>

            <!-- Divider -->
            <div class="w-px h-6 bg-border mx-1" />

            <!-- View Page Button -->
            <UiButton
              v-if="initialFormData?.slug"
              type="button"
              variant="outline"
              size="sm"
              as="a"
              :href="`/${initialFormData.slug}`"
              target="_blank"
            >
              <Icon name="heroicons:arrow-top-right-on-square" class="size-4 mr-1.5" />
              View
            </UiButton>

            <!-- Save Button -->
            <UiButton
              @click="pageFormRef?.submit()"
              :disabled="saveButtonState !== 'idle'"
              size="sm"
              class="min-w-[80px]"
            >
              <template v-if="saveButtonState === 'saving'">
                <Icon name="heroicons:arrow-path" class="size-4 animate-spin" />
              </template>
              <template v-else-if="saveButtonState === 'saved'">
                Saved!
              </template>
              <template v-else>
                Save
              </template>
            </UiButton>
          </div>
        </div>
      </div>

      <!-- Error Message (form errors) -->
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

      <PageForm
        ref="pageFormRef"
        :initial-data="initialFormData"
        :is-edit-mode="true"
        :is-submitting="isSubmitting"
        :current-page-id="pageId"
        @submit="handleSubmit"
      />

      <!-- Archive Confirmation Dialog -->
      <UiAlertDialog :open="showArchiveDialog" @update:open="showArchiveDialog = $event">
        <UiAlertDialogContent>
          <UiAlertDialogHeader>
            <UiAlertDialogTitle>Archive Page?</UiAlertDialogTitle>
            <UiAlertDialogDescription>
              Are you sure you want to archive this page? This will also archive {{ childrenCount }} child page(s).
            </UiAlertDialogDescription>
          </UiAlertDialogHeader>
          <UiAlertDialogFooter>
            <UiAlertDialogCancel :disabled="isArchiving" @click="showArchiveDialog = false">
              Cancel
            </UiAlertDialogCancel>
            <UiAlertDialogAction :disabled="isArchiving" @click="handleArchive">
              Archive
            </UiAlertDialogAction>
          </UiAlertDialogFooter>
        </UiAlertDialogContent>
      </UiAlertDialog>

      <!-- Delete Confirmation Dialog -->
      <UiAlertDialog :open="showDeleteDialog" @update:open="showDeleteDialog = $event">
        <UiAlertDialogContent>
          <UiAlertDialogHeader>
            <UiAlertDialogTitle>Delete Page?</UiAlertDialogTitle>
            <UiAlertDialogDescription>
              Are you sure you want to delete this page? This action cannot be undone.
            </UiAlertDialogDescription>
          </UiAlertDialogHeader>
          <UiAlertDialogFooter>
            <UiAlertDialogCancel :disabled="isDeleting" @click="showDeleteDialog = false">
              Cancel
            </UiAlertDialogCancel>
            <UiAlertDialogAction :disabled="isDeleting" @click="handleDelete">
              Delete
            </UiAlertDialogAction>
          </UiAlertDialogFooter>
        </UiAlertDialogContent>
      </UiAlertDialog>

      <!-- Unarchive Confirmation Dialog -->
      <UiAlertDialog :open="showUnarchiveDialog" @update:open="showUnarchiveDialog = $event">
        <UiAlertDialogContent>
          <UiAlertDialogHeader>
            <UiAlertDialogTitle>Unarchive Page?</UiAlertDialogTitle>
            <UiAlertDialogDescription>
              Are you sure you want to unarchive this page? It will be restored to draft status.
            </UiAlertDialogDescription>
          </UiAlertDialogHeader>
          <UiAlertDialogFooter>
            <UiAlertDialogCancel :disabled="isArchiving" @click="showUnarchiveDialog = false">
              Cancel
            </UiAlertDialogCancel>
            <UiAlertDialogAction :disabled="isArchiving" @click="handleUnarchive">
              Unarchive
            </UiAlertDialogAction>
          </UiAlertDialogFooter>
        </UiAlertDialogContent>
      </UiAlertDialog>

      <!-- Page Settings Sheet -->
      <PageSettingsSheet
        v-if="pageFormRef"
        :open="showPageSettingsSheet"
        @update:open="showPageSettingsSheet = $event"
        :title="pageFormRef.formValues.title ?? ''"
        :slug="pageFormRef.formValues.slug ?? ''"
        :parentId="pageFormRef.formValues.parentId ?? null"
        :template="pageFormRef.formValues.template ?? ''"
        :status="pageFormRef.formValues.status ?? 'draft'"
        :description="pageFormRef.formValues.description ?? null"
        :parentPageOptions="pageFormRef.parentPageOptions"
        :templateOptions="pageFormRef.templateOptions"
        :isLoadingParentPages="pageFormRef.isLoadingParentPages"
        :isLoadingTemplates="pageFormRef.isLoadingTemplates"
        :templateLoadError="pageFormRef.templateLoadError"
        :errors="pageFormRef.formErrors"
        :isEditMode="true"
        :hasSlugChanged="pageFormRef.hasSlugChanged"
        :hasParentChanged="pageFormRef.hasParentChanged"
        :hasTemplateChanged="pageFormRef.hasTemplateChanged"
        :disabled="isSubmitting"
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
        :onCancel="cancelSeoSheet"
        @update:metadata="pageFormRef.setFieldValue('metadata', $event)"
        @update:seoField="(name, value) => pageFormRef?.setFieldValue(name, value)"
      />
    </div>
  </div>
</template>

