<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { consola } from 'consola'
import { toast } from 'vue-sonner'
import type { ContractorFormData } from '~/schemas/admin/contractor-form.schema'
import type { ContractorWithCity } from '~/composables/useAdminContractors'

// Page metadata
definePageMeta({
  layout: 'admin',
})

useHead({
  title: 'Edit Contractor - Admin',
})

// State
const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()

const contractorId = computed(() => route.params.id as string)
const contractor = ref<ContractorWithCity | null>(null)
const loading = ref(true)
const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)

// Fetch contractor data
async function fetchContractor() {
  try {
    loading.value = true
    const response = await $fetch<{ success: boolean; data: ContractorWithCity }>(`/api/contractors/${contractorId.value}`)

    if (response.success && response.data) {
      contractor.value = response.data
    } else {
      throw new Error('Contractor not found')
    }
  } catch (error: any) {
    if (import.meta.dev) {
      consola.error('[EditContractor] Error fetching:', error)
    }
    toast.error('Contractor not found')
    router.push('/admin/contractors')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchContractor()
})

// Map contractor data to form initial values
const initialFormData = computed<Partial<ContractorFormData> | undefined>(() => {
  if (!contractor.value) return undefined

  const metadata = contractor.value.metadata as Record<string, any> || {}

  return {
    companyName: contractor.value.company_name,
    slug: contractor.value.slug,
    cityId: contractor.value.city_id,
    streetAddress: contractor.value.street_address || '',
    postalCode: contractor.value.postal_code || '',
    phone: contractor.value.phone || '',
    website: contractor.value.website || '',
    email: contractor.value.email || '',
    description: contractor.value.description || '',
    status: contractor.value.status as 'pending' | 'active' | 'suspended',
    verificationTier: ((contractor.value as any).verification_tier || 'unverified') as 'trusted_partner' | 'fully_verified' | 'basic_verified' | 'unverified',
    categories: metadata.categories || [],
    socialLinks: metadata.social_links || { facebook: '', instagram: '', youtube: '', linkedin: '' },
    openingHours: metadata.opening_hours || null,
    googlePlaceId: contractor.value.google_place_id,
    googleCid: contractor.value.google_cid,
  }
})

// Image data from metadata
const contractorImages = computed<string[]>(() => {
  if (!contractor.value) return []
  const metadata = contractor.value.metadata as Record<string, any> || {}
  return metadata.images || []
})

const primaryImage = computed<string | null>(() => {
  if (!contractor.value) return null
  const metadata = contractor.value.metadata as Record<string, any> || {}
  return metadata.primary_image || (metadata.images?.[0] || null)
})

const googlePlaceId = computed<string | null>(() => {
  return contractor.value?.google_place_id || null
})

/**
 * Map form data to API input format
 */
function mapFormDataToApiInput(formData: ContractorFormData) {
  return {
    companyName: formData.companyName,
    slug: formData.slug || undefined,
    cityId: formData.cityId || null,
    streetAddress: formData.streetAddress || null,
    postalCode: formData.postalCode || null,
    phone: formData.phone || null,
    website: formData.website || null,
    email: formData.email || null,
    description: formData.description || null,
    status: formData.status,
    verificationTier: formData.verificationTier,
    categories: formData.categories?.length ? formData.categories : [],
    socialLinks: formData.socialLinks || null,
    openingHours: formData.openingHours || null,
  }
}

/**
 * Handle form submission
 */
async function handleSubmit(formData: ContractorFormData) {
  try {
    isSubmitting.value = true
    errorMessage.value = null

    if (import.meta.dev) {
      consola.info('[EditContractor] Submitting:', formData)
    }

    const apiInput = mapFormDataToApiInput(formData)

    await $fetch(`/api/contractors/${contractorId.value}`, {
      method: 'PATCH',
      body: apiInput,
    })

    if (import.meta.dev) {
      consola.success('[EditContractor] Contractor updated successfully')
    }

    toast.success('Contractor updated successfully!')
    router.push('/admin/contractors')
  } catch (error: any) {
    if (import.meta.dev) {
      consola.error('[EditContractor] Error:', error)
    }

    const errorMsg = error.data?.message || error.message || 'Failed to update contractor'
    errorMessage.value = errorMsg
    toast.error('Failed to update contractor', { description: errorMsg })
  } finally {
    isSubmitting.value = false
  }
}

/**
 * Handle form cancellation
 */
function handleCancel() {
  router.push('/admin/contractors')
}

/**
 * Handle setting primary image
 */
async function handleSetPrimaryImage(path: string) {
  if (!contractor.value) return

  try {
    const metadata = (contractor.value.metadata as Record<string, any>) || {}
    await $fetch(`/api/contractors/${contractorId.value}`, {
      method: 'PATCH',
      body: {
        metadata: {
          ...metadata,
          primary_image: path,
        },
      },
    })
    toast.success('Primary image updated')
  } catch (error) {
    if (import.meta.dev) {
      consola.error('[EditContractor] Failed to set primary image:', error)
    }
    toast.error('Failed to update primary image')
  }
}

/**
 * Handle deleting an image
 */
async function handleDeleteImage(path: string) {
  if (!contractor.value) return

  try {
    // Delete from Supabase storage first
    const { error: storageError } = await supabase.storage
      .from('contractors')
      .remove([path])

    if (storageError) {
      if (import.meta.dev) {
        consola.warn('[EditContractor] Storage delete warning:', storageError)
      }
      // Continue anyway - file may already be deleted or not exist
    }

    const metadata = (contractor.value.metadata as Record<string, any>) || {}
    const currentImages = metadata.images || []
    const updatedImages = currentImages.filter((img: string) => img !== path)

    // If deleting the primary image, set new primary to first remaining image
    let updatedPrimaryImage = metadata.primary_image
    if (metadata.primary_image === path) {
      updatedPrimaryImage = updatedImages[0] || null
    }

    await $fetch(`/api/contractors/${contractorId.value}`, {
      method: 'PATCH',
      body: {
        metadata: {
          ...metadata,
          images: updatedImages,
          primary_image: updatedPrimaryImage,
        },
      },
    })

    // Update local state
    if (contractor.value) {
      contractor.value = {
        ...contractor.value,
        metadata: {
          ...metadata,
          images: updatedImages,
          primary_image: updatedPrimaryImage,
        },
      }
    }

    toast.success('Image deleted')
  } catch (error) {
    if (import.meta.dev) {
      consola.error('[EditContractor] Failed to delete image:', error)
    }
    toast.error('Failed to delete image')
  }
}
</script>

<template>
  <div class="p-6">
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="flex flex-col items-center gap-3">
        <UiSpinner class="size-8" />
        <p class="text-sm text-muted-foreground">Loading contractor...</p>
      </div>
    </div>

    <template v-else-if="contractor">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-foreground">Edit Contractor</h1>
        <p class="mt-2 text-sm text-muted-foreground">Update contractor profile details</p>
      </div>

      <!-- Error Message -->
      <UiCard v-if="errorMessage" class="mb-6 border-destructive/50 bg-destructive/10">
        <UiCardContent class="pt-6">
          <div class="flex items-start gap-3">
            <Icon name="heroicons:exclamation-circle" class="mt-0.5 size-5 flex-shrink-0 text-destructive" />
            <div class="flex-1">
              <h3 class="text-sm font-medium text-destructive">Error Updating Contractor</h3>
              <p class="mt-1 text-sm text-destructive/80">{{ errorMessage }}</p>
            </div>
            <UiButton variant="ghost" size="sm" class="text-destructive hover:text-destructive" @click="errorMessage = null">
              <Icon name="heroicons:x-mark" class="size-5" />
            </UiButton>
          </div>
        </UiCardContent>
      </UiCard>

      <!-- Form Card -->
      <UiCard>
        <UiCardContent class="pt-6">
          <ContractorForm
            :initial-data="initialFormData"
            :is-edit-mode="true"
            :is-submitting="isSubmitting"
            :images="contractorImages"
            :primary-image="primaryImage"
            :google-place-id="googlePlaceId"
            @submit="handleSubmit"
            @cancel="handleCancel"
            @set-primary-image="handleSetPrimaryImage"
            @delete-image="handleDeleteImage"
          />
        </UiCardContent>
      </UiCard>
    </template>
  </div>
</template>

