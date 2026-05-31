<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import {
  ownerContractorFormSchema,
  type OwnerContractorFormData,
  type BusinessHours,
} from '~/schemas/owner/contractor-form.schema'

interface ServiceType {
  id: string
  name: string
  slug: string
}

interface ContractorData {
  id: string
  companyName: string
  description: string | null
  phone: string | null
  email: string | null
  website: string | null
  streetAddress: string | null
  postalCode: string | null
  metadata: Record<string, any> | null
  city: { name: string; stateCode: string } | null
  serviceTypes?: Array<{ id: string; name: string; slug: string }>
}

interface Props {
  contractor: ContractorData
  isSubmitting?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isSubmitting: false,
})

const emit = defineEmits<{
  submit: [data: OwnerContractorFormData]
  cancel: []
}>()

// Fetch service types
const { data: serviceTypesData } = await useFetch<ServiceType[]>('/api/public/service-types')
const serviceTypes = computed(() => serviceTypesData.value || [])

// Parse existing business hours from metadata
function parseBusinessHours(metadata: Record<string, any> | null): BusinessHours | null {
  if (!metadata) return null
  // Check for new object format first
  if (metadata.business_hours && typeof metadata.business_hours === 'object') {
    return metadata.business_hours as BusinessHours
  }
  // Check for enrichment format
  if (metadata.enrichment?.business_hours) {
    return metadata.enrichment.business_hours as BusinessHours
  }
  // Legacy array format - convert to object
  if (metadata.opening_hours && Array.isArray(metadata.opening_hours)) {
    const result: BusinessHours = {}
    for (const entry of metadata.opening_hours) {
      const day = entry.day?.toLowerCase() as keyof BusinessHours
      if (day && entry.hours) {
        const [open, close] = entry.hours.split(' - ')
        if (open && close) {
          result[day] = { open: open.trim(), close: close.trim() }
        }
      }
    }
    return result
  }
  return null
}

// Parse social links from metadata
function parseSocialLinks(metadata: Record<string, any> | null) {
  const links = metadata?.social_links || {}
  return {
    facebook: links.facebook || '',
    instagram: links.instagram || '',
    youtube: links.youtube || '',
    linkedin: links.linkedin || '',
    twitter: links.twitter || '',
    yelp: links.yelp || '',
  }
}

// Build initial values from contractor data
const initialValues = computed<OwnerContractorFormData>(() => ({
  companyName: props.contractor.companyName || '',
  description: props.contractor.description || '',
  phone: props.contractor.phone || '',
  email: props.contractor.email || '',
  website: props.contractor.website || '',
  businessHours: parseBusinessHours(props.contractor.metadata),
  serviceTypeIds: props.contractor.serviceTypes?.map(st => st.id) || [],
  socialLinks: parseSocialLinks(props.contractor.metadata),
}))

// Form setup
const { values, errors, handleSubmit, setFieldValue } = useForm({
  validationSchema: toTypedSchema(ownerContractorFormSchema),
  initialValues: initialValues.value,
})

// Reactive form values for v-model binding
const formValues = reactive({
  companyName: values.companyName || '',
  description: values.description || '',
  phone: values.phone || '',
  email: values.email || '',
  website: values.website || '',
})

// Sync formValues changes to VeeValidate
watch(formValues, (newValues) => {
  Object.entries(newValues).forEach(([key, value]) => {
    setFieldValue(key as keyof typeof formValues, value)
  })
}, { deep: true })

// Handle business hours update
function updateBusinessHours(hours: BusinessHours) {
  setFieldValue('businessHours', hours)
}

// Toggle service type
function toggleServiceType(id: string) {
  const current = values.serviceTypeIds || []
  if (current.includes(id)) {
    setFieldValue('serviceTypeIds', current.filter(i => i !== id))
  } else {
    setFieldValue('serviceTypeIds', [...current, id])
  }
}

// Update social link
function updateSocialLink(platform: string, value: string) {
  setFieldValue('socialLinks', { ...values.socialLinks, [platform]: value })
}

// Submit handler
const onSubmit = handleSubmit((formData) => {
  emit('submit', formData)
})

// Address display
const addressDisplay = computed(() => {
  const parts = []
  if (props.contractor.streetAddress) parts.push(props.contractor.streetAddress)
  if (props.contractor.city) {
    parts.push(`${props.contractor.city.name}, ${props.contractor.city.stateCode}`)
  }
  if (props.contractor.postalCode) parts.push(props.contractor.postalCode)
  return parts.join(', ') || 'No address on file'
})

// Social platforms config
const socialPlatforms = [
  { key: 'facebook', label: 'Facebook', icon: 'mdi:facebook', placeholder: 'https://facebook.com/...' },
  { key: 'instagram', label: 'Instagram', icon: 'mdi:instagram', placeholder: 'https://instagram.com/...' },
  { key: 'youtube', label: 'YouTube', icon: 'mdi:youtube', placeholder: 'https://youtube.com/...' },
  { key: 'linkedin', label: 'LinkedIn', icon: 'mdi:linkedin', placeholder: 'https://linkedin.com/...' },
  { key: 'twitter', label: 'Twitter/X', icon: 'mdi:twitter', placeholder: 'https://twitter.com/...' },
  { key: 'yelp', label: 'Yelp', icon: 'simple-icons:yelp', placeholder: 'https://yelp.com/biz/...' },
]
</script>

<template>
  <form @submit.prevent="onSubmit" class="space-y-6">
    <OwnerTabs default-value="info">
      <OwnerTabsList>
        <OwnerTabsTrigger value="info">Business Info</OwnerTabsTrigger>
        <OwnerTabsTrigger value="hours">Hours & Services</OwnerTabsTrigger>
        <OwnerTabsTrigger value="social">Social Media</OwnerTabsTrigger>
      </OwnerTabsList>

      <!-- Tab 1: Business Info -->
      <OwnerTabsContent value="info" class="space-y-5">
        <div class="grid gap-2 md:grid-cols-2">
          <!-- Company Name -->
          <div class="md:col-span-2">
            <TextInput
              v-model="formValues.companyName"
              label="Company Name"
              placeholder="Your business name"
            />
            <p v-if="errors.companyName" class="mt-1 text-sm text-red-500">{{ errors.companyName }}</p>
          </div>

          <!-- Phone -->
          <div>
            <TextInput
              v-model="formValues.phone"
              label="Phone"
              type="tel"
              placeholder="(555) 123-4567"
            />
          </div>

          <!-- Email -->
          <div>
            <TextInput
              v-model="formValues.email"
              label="Email"
              type="email"
              placeholder="contact@example.com"
            />
            <p v-if="errors.email" class="mt-1 text-sm text-red-500">{{ errors.email }}</p>
          </div>

          <!-- Website -->
          <div class="md:col-span-2">
            <TextInput
              v-model="formValues.website"
              label="Website"
              type="url"
              placeholder="https://yourwebsite.com"
            />
            <p v-if="errors.website" class="mt-1 text-sm text-red-500">{{ errors.website }}</p>
          </div>

          <!-- Description -->
          <div class="md:col-span-2">
            <label class="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Description
            </label>
            <textarea
              v-model="formValues.description"
              rows="3"
              placeholder="Tell customers about your business..."
              class="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-700 outline-none transition-all hover:border-neutral-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
            />
          </div>
        </div>

        <!-- Read-only Address -->
        <UiCard variant="secondary" padding="p-4">
          <div class="flex items-start gap-3">
            <Icon name="heroicons:map-pin" class="mt-0.5 h-5 w-5 text-neutral-500" />
            <div>
              <p class="text-sm font-medium text-neutral-700 dark:text-neutral-300">{{ addressDisplay }}</p>
              <p class="mt-1 text-xs text-neutral-500">Contact support to update your address</p>
            </div>
          </div>
        </UiCard>
      </OwnerTabsContent>

      <!-- Tab 2: Hours & Services -->
      <OwnerTabsContent value="hours" class="space-y-6">
        <!-- Business Hours -->
        <div>
          <h3 class="mb-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">Business Hours</h3>
          <BusinessHoursEditor
            :model-value="values.businessHours"
            @update:model-value="updateBusinessHours"
          />
        </div>

        <!-- Service Categories -->
        <div>
          <h3 class="mb-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">Service Categories</h3>
          <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <label
              v-for="st in serviceTypes"
              :key="st.id"
              class="flex cursor-pointer items-center gap-3 rounded-xl border border-neutral-300 p-3 transition-colors hover:border-blue-400 hover:bg-blue-50 dark:border-neutral-600 dark:hover:border-blue-500 dark:hover:bg-blue-900/20"
              :class="{ 'border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/30': values.serviceTypeIds?.includes(st.id) }"
            >
              <Checkbox
                :model-value="values.serviceTypeIds?.includes(st.id) ?? false"
                @update:model-value="toggleServiceType(st.id)"
              />
              <span class="text-sm text-neutral-700 dark:text-neutral-300">{{ st.name }}</span>
            </label>
          </div>
          <p v-if="serviceTypes.length === 0" class="text-sm text-neutral-500">
            No service categories available
          </p>
        </div>
      </OwnerTabsContent>

      <!-- Tab 3: Social Media -->
      <OwnerTabsContent value="social" class="space-y-5">
        <p class="text-sm text-neutral-500">Add your social media profiles to help customers find you online.</p>
        <div class="grid gap-4">
          <div v-for="platform in socialPlatforms" :key="platform.key">
            <label class="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              <Icon :name="platform.icon" class="h-4 w-4" />
              {{ platform.label }}
            </label>
            <TextInput
              :model-value="(values.socialLinks as any)?.[platform.key] || ''"
              @update:model-value="(v: string | null) => updateSocialLink(platform.key, v || '')"
              type="url"
              :placeholder="platform.placeholder"
            />
          </div>
        </div>
      </OwnerTabsContent>
    </OwnerTabs>

    <!-- Form Actions -->
    <div class="flex items-center justify-end gap-3 border-t border-neutral-200 pt-6 dark:border-neutral-700">
      <Button
        text="Cancel"
        variant="secondary-outline"
        type="button"
        @click="emit('cancel')"
      />
      <Button
        :text="isSubmitting ? 'Saving...' : 'Save Changes'"
        variant="primary"
        type="submit"
        :disabled="isSubmitting"
        :loading="isSubmitting"
      />
    </div>
  </form>
</template>

