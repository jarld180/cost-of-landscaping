<script setup lang="ts">
import { ref } from 'vue'
import { consola } from 'consola'
import { toast } from 'vue-sonner'
import type { ContractorFormData } from '~/schemas/admin/contractor-form.schema'

// Page metadata
definePageMeta({
  layout: 'admin',
})

useHead({
  title: 'Add Contractor - Admin',
})

// State
const router = useRouter()
const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)

/**
 * Map form data to API input format
 */
function mapFormDataToApiInput(formData: ContractorFormData) {
  return {
    companyName: formData.companyName,
    slug: formData.slug || undefined,
    cityId: formData.cityId || undefined,
    streetAddress: formData.streetAddress || undefined,
    postalCode: formData.postalCode || undefined,
    phone: formData.phone || undefined,
    website: formData.website || undefined,
    email: formData.email || undefined,
    description: formData.description || undefined,
    status: formData.status,
    categories: formData.categories?.length ? formData.categories : undefined,
    socialLinks: formData.socialLinks || undefined,
    openingHours: formData.openingHours || undefined,
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
      consola.info('[NewContractor] Submitting:', formData)
    }

    const apiInput = mapFormDataToApiInput(formData)

    await $fetch('/api/contractors', {
      method: 'POST',
      body: apiInput,
    })

    if (import.meta.dev) {
      consola.success('[NewContractor] Contractor created successfully')
    }

    toast.success('Contractor created successfully!')
    router.push('/admin/contractors')
  } catch (error: any) {
    if (import.meta.dev) {
      consola.error('[NewContractor] Error:', error)
    }

    const errorMsg = error.data?.message || error.message || 'Failed to create contractor'
    errorMessage.value = errorMsg
    toast.error('Failed to create contractor', { description: errorMsg })
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
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-foreground">Add Contractor</h1>
      <p class="mt-2 text-sm text-muted-foreground">Create a new contractor profile manually</p>
    </div>

    <!-- Error Message -->
    <UiCard v-if="errorMessage" class="mb-6 border-destructive/50 bg-destructive/10">
      <UiCardContent class="pt-6">
        <div class="flex items-start gap-3">
          <Icon name="heroicons:exclamation-circle" class="mt-0.5 size-5 flex-shrink-0 text-destructive" />
          <div class="flex-1">
            <h3 class="text-sm font-medium text-destructive">Error Creating Contractor</h3>
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
        <ContractorForm :is-submitting="isSubmitting" @submit="handleSubmit" @cancel="handleCancel" />
      </UiCardContent>
    </UiCard>
  </div>
</template>

