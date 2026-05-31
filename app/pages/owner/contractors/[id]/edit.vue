<script setup lang="ts">
import { toast } from 'vue-sonner'
import ContractorEditForm from '~/components/owner/ContractorEditForm.vue'
import type { OwnerContractorFormData } from '~/schemas/owner/contractor-form.schema'

/**
 * Owner Contractor Edit Page
 *
 * Allows business owners to edit their claimed contractor profile.
 */

definePageMeta({
  layout: 'owner'
})

const route = useRoute()
const router = useRouter()
const contractorId = computed(() => route.params.id as string)

interface ServiceType {
  id: string
  name: string
  slug: string
}

interface ContractorData {
  id: string
  companyName: string
  slug: string
  description: string | null
  phone: string | null
  email: string | null
  website: string | null
  streetAddress: string | null
  postalCode: string | null
  phoneVerified: boolean
  phoneVerifiedAt: string | null
  metadata: Record<string, any> | null
  city: {
    name: string
    slug: string
    stateCode: string
  } | null
  serviceTypes?: ServiceType[]
}

// Fetch contractor data
const { data, pending, error } = await useFetch<{ contractor: ContractorData }>(`/api/owner/contractors/${contractorId.value}`)

const contractor = computed(() => data.value?.contractor)

useSeoMeta({
  title: () => contractor.value ? `Edit ${contractor.value.companyName}` : 'Edit Business',
  robots: 'noindex, nofollow'
})

// Submission
const isSubmitting = ref(false)

async function handleSubmit(formData: OwnerContractorFormData) {
  isSubmitting.value = true

  try {
    await $fetch(`/api/owner/contractors/${contractorId.value}`, {
      method: 'PATCH',
      body: {
        companyName: formData.companyName || undefined,
        description: formData.description || null,
        phone: formData.phone || null,
        email: formData.email || null,
        website: formData.website || null,
        businessHours: formData.businessHours || null,
        socialLinks: formData.socialLinks || null,
        serviceTypeIds: formData.serviceTypeIds || [],
      }
    })

    toast.success('Profile Updated', {
      description: 'Your business profile has been saved successfully.'
    })

    await router.push('/owner')
  } catch (err: any) {
    const errorMessage = err.data?.message || err.message || 'Failed to save changes'
    toast.error('Update Failed', {
      description: errorMessage
    })
  } finally {
    isSubmitting.value = false
  }
}

function handleCancel() {
  router.push('/owner')
}

// ---- COI Upload ----
const { data: verificationsData, refresh: refreshVerifications } = await useFetch<{
  success: boolean
  data: Array<{
    id: string
    status: string
    additional_insured_name: string | null
    policy_expires_at: string | null
    submitted_at: string
    rejection_reason: string | null
  }>
}>(`/api/owner/contractors/${contractorId.value}/verifications`)

const verifications = computed(() => verificationsData.value?.data || [])
const latestVerification = computed(() => verifications.value[0] || null)

const coiForm = ref({
  additionalInsuredName: 'Cost of Landscaping',
  coverageAmount: '',
  policyExpiresAt: '',
  file: null as File | null,
})
const coiSubmitting = ref(false)
const coiError = ref<string | null>(null)

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  coiForm.value.file = input.files?.[0] || null
}

async function submitCoi() {
  if (!coiForm.value.file || !coiForm.value.policyExpiresAt) return
  coiSubmitting.value = true
  coiError.value = null
  try {
    const fd = new FormData()
    fd.append('file', coiForm.value.file)
    fd.append('additionalInsuredName', coiForm.value.additionalInsuredName)
    fd.append('policyExpiresAt', coiForm.value.policyExpiresAt)
    if (coiForm.value.coverageAmount) fd.append('coverageAmount', coiForm.value.coverageAmount)

    await $fetch(`/api/owner/contractors/${contractorId.value}/verifications`, {
      method: 'POST',
      body: fd,
    })

    toast.success('COI Submitted', { description: 'Under review — you\'ll be notified once approved.' })
    await refreshVerifications()
    coiForm.value.file = null
    coiForm.value.policyExpiresAt = ''
  } catch (err: any) {
    coiError.value = err.data?.message || 'Failed to submit'
  } finally {
    coiSubmitting.value = false
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'pending': return 'Under Review'
    case 'approved': return 'Approved ✓'
    case 'rejected': return 'Rejected'
    case 'expired': return 'Expired'
    default: return status
  }
}

// ---- Phone Verification ----
const phoneOtpSent = ref(false)
const phoneCode = ref('')
const phoneSending = ref(false)
const phoneConfirming = ref(false)
const phoneError = ref<string | null>(null)
const phoneSuccess = ref(false)

async function sendPhoneOtp() {
  phoneSending.value = true
  phoneError.value = null
  try {
    await $fetch('/api/owner/phone-verify/send', {
      method: 'POST',
      body: { contractorId: contractorId.value },
    })
    phoneOtpSent.value = true
  } catch (err: any) {
    phoneError.value = err.data?.message || 'Failed to send code'
  } finally {
    phoneSending.value = false
  }
}

async function confirmPhoneOtp() {
  if (!phoneCode.value.trim()) return
  phoneConfirming.value = true
  phoneError.value = null
  try {
    await $fetch('/api/owner/phone-verify/confirm', {
      method: 'POST',
      body: { contractorId: contractorId.value, code: phoneCode.value.trim() },
    })
    phoneSuccess.value = true
    toast.success('Phone Verified', { description: 'Your phone number has been verified.' })
    await navigateTo('/owner')
  } catch (err: any) {
    phoneError.value = err.data?.message || 'Invalid code'
  } finally {
    phoneConfirming.value = false
  }
}
</script>

<template>
  <div>
    <!-- Loading -->
    <div v-if="pending" class="flex items-center justify-center py-12">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
      <p class="text-destructive">
        {{ error.data?.message || 'Failed to load contractor. You may not have permission to edit this profile.' }}
      </p>
      <NuxtLink to="/owner" class="mt-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <Icon name="heroicons:arrow-left" class="h-4 w-4" />
        Back to Dashboard
      </NuxtLink>
    </div>

    <!-- Edit Form -->
    <div v-else-if="contractor">
      <!-- Header -->
      <div class="mb-6">
        <NuxtLink to="/owner" class="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <Icon name="heroicons:arrow-left" class="h-4 w-4" />
          Back to My Businesses
        </NuxtLink>
        <h1 class="text-2xl font-bold">
          Edit {{ contractor.companyName }}
        </h1>
        <p v-if="contractor.city" class="mt-1 text-sm text-muted-foreground">
          {{ contractor.city.name }}, {{ contractor.city.stateCode }}
        </p>
      </div>

      <!-- Form Component -->
      <div class="rounded-lg border border-border bg-card p-6">
        <ContractorEditForm
          :contractor="contractor"
          :is-submitting="isSubmitting"
          @submit="handleSubmit"
          @cancel="handleCancel"
        />
      </div>

      <!-- Phone Verification Section -->
      <div class="mt-6 rounded-xl border-2 border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-900/10">
        <div class="mb-4 flex items-start justify-between">
          <div>
            <h2 class="text-lg font-semibold text-blue-900 dark:text-blue-100">Verify Your Phone Number</h2>
            <p class="mt-1 text-sm text-blue-700 dark:text-blue-300">
              Phone verification unlocks the <strong>Basic Verified</strong> badge and builds trust with homeowners.
            </p>
          </div>
          <span
            v-if="contractor.phoneVerified"
            class="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white"
          >
            Verified ✓
          </span>
        </div>

        <div v-if="contractor.phoneVerified" class="rounded-lg border border-blue-200 bg-white p-4 dark:border-blue-700 dark:bg-neutral-900">
          <p class="text-sm text-blue-700 dark:text-blue-300">
            Your phone number <strong>{{ contractor.phone }}</strong> is verified.
          </p>
        </div>

        <div v-else-if="!contractor.phone" class="rounded-lg border border-blue-200 bg-white p-4 dark:border-blue-700 dark:bg-neutral-900">
          <p class="text-sm text-blue-700 dark:text-blue-300">
            Add a phone number to your profile above before verifying.
          </p>
        </div>

        <div v-else>
          <p class="mb-4 text-sm text-blue-800 dark:text-blue-200">
            We'll send a 6-digit code to <strong>{{ contractor.phone }}</strong>.
          </p>

          <div v-if="!phoneOtpSent" class="flex gap-3">
            <button
              :disabled="phoneSending"
              class="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              @click="sendPhoneOtp"
            >
              {{ phoneSending ? 'Sending...' : 'Send Verification Code' }}
            </button>
          </div>

          <div v-else class="space-y-3">
            <p class="text-sm text-blue-700 dark:text-blue-300">Code sent! Enter it below:</p>
            <div class="flex gap-3">
              <input
                v-model="phoneCode"
                type="text"
                inputmode="numeric"
                maxlength="6"
                placeholder="6-digit code"
                class="w-40 rounded-lg border border-blue-300 bg-white px-3 py-2 text-center text-lg font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-blue-600 dark:bg-neutral-900"
              />
              <button
                :disabled="phoneConfirming || !phoneCode.trim()"
                class="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                @click="confirmPhoneOtp"
              >
                {{ phoneConfirming ? 'Verifying...' : 'Verify' }}
              </button>
              <button
                class="rounded-lg border border-blue-300 px-4 py-2 text-sm text-blue-700 hover:bg-blue-100 dark:border-blue-600 dark:text-blue-300"
                @click="phoneOtpSent = false; phoneCode = ''"
              >
                Resend
              </button>
            </div>
          </div>

          <p v-if="phoneError" class="mt-2 text-sm text-red-600">{{ phoneError }}</p>
        </div>
      </div>

      <!-- COI Verification Section -->
      <div class="mt-6 rounded-xl border-2 border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-800 dark:bg-emerald-900/10">
        <div class="mb-4 flex items-start justify-between">
          <div>
            <h2 class="text-lg font-semibold text-emerald-900 dark:text-emerald-100">Get Fully Verified</h2>
            <p class="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
              Upload a Certificate of Insurance (COI) naming <strong>Cost of landscape</strong> as Additional Insured to earn the Fully Verified badge.
            </p>
          </div>
          <ContractorVerifiedBadge v-if="latestVerification?.status === 'approved'" tier="fully_verified" />
        </div>

        <!-- Current status -->
        <div v-if="latestVerification" class="mb-4 rounded-lg border border-emerald-200 bg-white p-4 dark:border-emerald-700 dark:bg-neutral-900">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-neutral-700 dark:text-neutral-300">Latest submission:</span>
            <span
              :class="[
                'rounded-full px-3 py-0.5 text-xs font-semibold',
                latestVerification.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                latestVerification.status === 'rejected' ? 'bg-red-100 text-red-800' :
                latestVerification.status === 'expired' ? 'bg-neutral-100 text-neutral-600' :
                'bg-yellow-100 text-yellow-800'
              ]"
            >
              {{ statusLabel(latestVerification.status) }}
            </span>
          </div>
          <p v-if="latestVerification.rejection_reason" class="mt-2 text-sm text-red-600">
            Reason: {{ latestVerification.rejection_reason }}
          </p>
        </div>

        <!-- Upload form (show if no approved verification, or if rejected/expired) -->
        <div v-if="!latestVerification || ['rejected', 'expired'].includes(latestVerification.status)">
          <div class="mb-4 rounded-lg bg-white p-4 text-sm dark:bg-neutral-900">
            <p class="font-medium text-neutral-800 dark:text-neutral-200 mb-2">How to get verified:</p>
            <ol class="list-decimal list-inside space-y-1 text-neutral-600 dark:text-neutral-400">
              <li>Contact your insurance provider</li>
              <li>Request a COI naming <strong class="text-neutral-800 dark:text-neutral-200">Cost of landscape</strong> as Additional Insured</li>
              <li>Upload the COI below</li>
              <li>We'll review within 24-48 hours</li>
            </ol>
          </div>

          <div class="space-y-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Additional Insured Name on COI</label>
              <input
                v-model="coiForm.additionalInsuredName"
                type="text"
                class="w-full rounded-lg border px-4 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                placeholder="Cost of Landscaping"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Policy Expiry Date</label>
                <input
                  v-model="coiForm.policyExpiresAt"
                  type="date"
                  class="w-full rounded-lg border px-4 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Coverage Amount ($)</label>
                <input
                  v-model="coiForm.coverageAmount"
                  type="number"
                  placeholder="e.g. 1000000"
                  class="w-full rounded-lg border px-4 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </div>
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">COI Document (PDF or image)</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                class="w-full text-sm text-neutral-600 dark:text-neutral-400"
                @change="handleFileSelect"
              />
            </div>

            <p v-if="coiError" class="text-sm text-red-600">{{ coiError }}</p>

            <button
              :disabled="coiSubmitting || !coiForm.file || !coiForm.policyExpiresAt"
              class="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              @click="submitCoi"
            >
              {{ coiSubmitting ? 'Submitting...' : 'Submit for Verification' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

