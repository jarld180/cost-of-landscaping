<script setup lang="ts">
/**
 * Email Verification Page
 *
 * Public page for verifying email address from claim submission.
 * URL: /claim/verify?token={uuid}
 *
 * States:
 * - Loading: Verifying token on mount
 * - Success: Email verified, claim pending review
 * - Expired: Token expired, show resend option
 * - Invalid: Invalid token, show error
 */

// Page metadata
definePageMeta({
  layout: 'default',
})

// Get token from URL query
const route = useRoute()
const token = computed(() => route.query.token as string | undefined)

// State management
const isLoading = ref(true)
const isResending = ref(false)
const verificationState = ref<'success' | 'expired' | 'invalid' | 'resent'>('success')
const contractorName = ref<string | null>(null)
const errorMessage = ref<string | null>(null)
const resendSuccess = ref(false)

// Data for resend flow (populated when token is expired)
const expiredClaimId = ref<string | null>(null)

// Verify token on mount
onMounted(async () => {
  if (!token.value) {
    verificationState.value = 'invalid'
    errorMessage.value = 'No verification token provided.'
    isLoading.value = false
    return
  }

  try {
    const response = await $fetch('/api/public/claims/verify', {
      method: 'POST',
      body: { token: token.value },
    })

    verificationState.value = 'success'
    contractorName.value = response.contractorName || null
  } catch (err: unknown) {
    // H3 errors from $fetch have structure: { statusCode, data: { message, data: {...} } }
    const error = err as { statusCode?: number; data?: { message?: string; data?: { code?: string; claimId?: string } } }
    const statusCode = error.statusCode || (error.data as { statusCode?: number })?.statusCode
    const errorCode = error.data?.data?.code

    if (import.meta.dev) {
      console.log('[verify] Error caught:', { statusCode, errorCode, error })
    }

    // Check for expired token (410 status or TOKEN_EXPIRED code)
    if (statusCode === 410 || errorCode === 'TOKEN_EXPIRED') {
      verificationState.value = 'expired'
      expiredClaimId.value = error.data?.data?.claimId || null
      errorMessage.value = error.data?.message || 'This verification link has expired.'
    } else {
      verificationState.value = 'invalid'
      errorMessage.value = error.data?.message || 'Invalid verification link.'
    }
  } finally {
    isLoading.value = false
  }
})

// Resend verification email
const resendVerification = async () => {
  if (!expiredClaimId.value) return

  isResending.value = true
  try {
    await $fetch('/api/public/claims/resend-verification', {
      method: 'POST',
      body: { claimId: expiredClaimId.value },
    })
    resendSuccess.value = true
    verificationState.value = 'resent'
  } catch (err: unknown) {
    const error = err as { data?: { message?: string } }
    errorMessage.value = error.data?.message || 'Failed to resend verification email.'
  } finally {
    isResending.value = false
  }
}

// SEO
useSeoMeta({
  title: 'Verify Your Email',
  description: 'Verify your email address to complete your business claim.',
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div class="min-h-[60vh] flex items-center justify-center px-4 py-16">
    <div class="w-full max-w-md text-center">
      <!-- Loading State -->
      <div v-if="isLoading" class="space-y-4">
        <div class="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        <p class="text-lg text-neutral-600 dark:text-neutral-400">Verifying your email...</p>
      </div>

      <!-- Success State -->
      <div v-else-if="verificationState === 'success'" class="space-y-6">
        <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <Icon name="lucide:check-circle" class="h-12 w-12 text-green-600 dark:text-green-400" />
        </div>
        <h1 class="text-3xl font-bold text-neutral-900 dark:text-white">Email Verified!</h1>
        <p class="text-lg text-neutral-600 dark:text-neutral-400">
          Your email has been verified<span v-if="contractorName"> for <strong>{{ contractorName }}</strong></span>.
          Our team will review your claim shortly.
        </p>
        <p class="text-sm text-neutral-500 dark:text-neutral-500">
          You'll receive an email once your claim has been reviewed.
        </p>
        <div class="pt-4">
          <Button text="Return to Homepage" location="/" variant="primary" />
        </div>
      </div>

      <!-- Resent State -->
      <div v-else-if="verificationState === 'resent'" class="space-y-6">
        <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
          <Icon name="lucide:mail-check" class="h-12 w-12 text-blue-600 dark:text-blue-400" />
        </div>
        <h1 class="text-3xl font-bold text-neutral-900 dark:text-white">Verification Email Sent!</h1>
        <p class="text-lg text-neutral-600 dark:text-neutral-400">
          A new verification link has been sent to your email. Please check your inbox.
        </p>
        <p class="text-sm text-neutral-500 dark:text-neutral-500">
          The link will expire in 24 hours.
        </p>
        <div class="pt-4">
          <Button text="Return to Homepage" location="/" variant="primary-outline" />
        </div>
      </div>

      <!-- Expired State -->
      <div v-else-if="verificationState === 'expired'" class="space-y-6">
        <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
          <Icon name="lucide:clock" class="h-12 w-12 text-amber-600 dark:text-amber-400" />
        </div>
        <h1 class="text-3xl font-bold text-neutral-900 dark:text-white">Link Expired</h1>
        <p class="text-lg text-neutral-600 dark:text-neutral-400">{{ errorMessage }}</p>
        <div class="pt-4 space-y-3">
          <Button
            text="Resend Verification Email"
            variant="primary"
            :disabled="isResending"
            @click="resendVerification"
          />
          <div>
            <Button text="Return to Homepage" location="/" variant="ghost" />
          </div>
        </div>
      </div>

      <!-- Invalid State -->
      <div v-else class="space-y-6">
        <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <Icon name="lucide:x-circle" class="h-12 w-12 text-red-600 dark:text-red-400" />
        </div>
        <h1 class="text-3xl font-bold text-neutral-900 dark:text-white">Invalid Link</h1>
        <p class="text-lg text-neutral-600 dark:text-neutral-400">{{ errorMessage }}</p>
        <p class="text-sm text-neutral-500 dark:text-neutral-500">
          Please submit a new claim if you'd like to claim this business.
        </p>
        <div class="pt-4">
          <Button text="Return to Homepage" location="/" variant="primary" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>

