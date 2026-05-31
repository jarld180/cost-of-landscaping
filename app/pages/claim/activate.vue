<script setup lang="ts">
/**
 * Account Activation Page
 *
 * Allows users to set their password and activate their account
 * after their claim has been approved by admin.
 *
 * Security:
 * - Token validated on mount
 * - Password requirements enforced client-side and server-side
 * - Success redirects to /owner dashboard
 */

definePageMeta({
  layout: 'default',
})

useSeoMeta({
  title: 'Activate Your Account',
  robots: 'noindex, nofollow',
})

const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()

// State
type ActivationState = 'loading' | 'valid' | 'expired' | 'invalid' | 'success' | 'already_activated'
const activationState = ref<ActivationState>('loading')
const contractorName = ref<string>('')
const claimantEmail = ref<string>('')
const errorMessage = ref<string>('')

// Form state
const password = ref('')
const confirmPassword = ref('')
const isSubmitting = ref(false)
const formError = ref<string | null>(null)

// Password validation
const passwordMinLength = 8
const passwordValid = computed(() => {
  if (password.value.length < passwordMinLength) return false
  if (!/[a-zA-Z]/.test(password.value)) return false
  if (!/[0-9]/.test(password.value)) return false
  return true
})

const passwordsMatch = computed(() => {
  return password.value === confirmPassword.value && password.value.length > 0
})

const canSubmit = computed(() => {
  return passwordValid.value && passwordsMatch.value && !isSubmitting.value
})

// Get token from URL
const token = computed(() => route.query.token as string | undefined)

// Validate token on mount
onMounted(async () => {
  if (!token.value) {
    activationState.value = 'invalid'
    errorMessage.value = 'No activation token provided.'
    return
  }

  try {
    const response = await $fetch('/api/public/claims/validate-activation', {
      method: 'POST',
      body: { token: token.value },
    })

    if (response.success) {
      activationState.value = 'valid'
      contractorName.value = response.contractorName || 'Your Business'
      claimantEmail.value = response.claimantEmail || ''
    }
  } catch (error: any) {
    const errorCode = error.data?.data?.code || error.data?.code
    const statusCode = error.statusCode || error.data?.statusCode

    if (import.meta.dev) {
      console.log('[activate] Validation error:', { statusCode, errorCode, error })
    }

    if (errorCode === 'ALREADY_ACTIVATED') {
      activationState.value = 'already_activated'
      errorMessage.value = 'This account has already been activated.'
    } else if (errorCode === 'TOKEN_EXPIRED' || statusCode === 410) {
      activationState.value = 'expired'
      errorMessage.value = error.data?.message || 'This activation link has expired.'
    } else {
      activationState.value = 'invalid'
      errorMessage.value = error.data?.message || 'Invalid activation link.'
    }
  }
})

// Handle form submission
async function handleSubmit() {
  if (!canSubmit.value || !token.value) return

  formError.value = null
  isSubmitting.value = true

  try {
    const response = await $fetch('/api/public/claims/activate', {
      method: 'POST',
      body: {
        token: token.value,
        password: password.value,
      },
    })

    if (response.success) {
      activationState.value = 'success'

      // Auto-login the user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: claimantEmail.value,
        password: password.value,
      })

      if (signInError) {
        if (import.meta.dev) {
          console.warn('[activate] Auto-login failed:', signInError.message)
        }
        // Still show success, user can login manually
      }

      // Redirect to owner onboarding after short delay
      setTimeout(() => {
        router.push(response.redirectUrl || '/owner/onboarding')
      }, 2000)
    }
  } catch (error: any) {
    const errorCode = error.data?.data?.code || error.data?.code

    if (errorCode === 'ALREADY_ACTIVATED') {
      activationState.value = 'already_activated'
      errorMessage.value = 'This account has already been activated.'
    } else if (errorCode === 'EMAIL_EXISTS') {
      formError.value = error.data?.message || 'An account with this email already exists.'
    } else if (errorCode === 'INVALID_PASSWORD') {
      formError.value = error.data?.message || 'Password does not meet requirements.'
    } else {
      formError.value = error.data?.message || 'Failed to activate account. Please try again.'
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-12">
    <div class="max-w-md w-full">
      <!-- Loading State -->
      <div v-if="activationState === 'loading'" class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
        <p class="text-gray-600 dark:text-gray-400">Validating activation link...</p>
      </div>

      <!-- Valid Token - Show Password Form -->
      <div v-else-if="activationState === 'valid'" class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <div class="text-center mb-6">
          <div class="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Create Your Account
          </h1>
          <p class="text-gray-600 dark:text-gray-400">
            Set a password to manage <strong>{{ contractorName }}</strong>
          </p>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Email Display -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              :value="claimantEmail"
              disabled
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
            >
          </div>

          <!-- Password -->
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <input
              id="password"
              v-model="password"
              type="password"
              required
              minlength="8"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Enter your password"
            >
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Min 8 characters, must include letter and number
            </p>
          </div>

          <!-- Confirm Password -->
          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              v-model="confirmPassword"
              type="password"
              required
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Confirm your password"
            >
            <p v-if="confirmPassword && !passwordsMatch" class="mt-1 text-xs text-red-500">
              Passwords do not match
            </p>
          </div>

          <!-- Form Error -->
          <div v-if="formError" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
            <p class="text-sm text-red-600 dark:text-red-400">{{ formError }}</p>
          </div>

          <!-- Submit Button -->
          <Button
            type="submit"
            :text="isSubmitting ? 'Activating...' : 'Activate Account'"
            :disabled="!canSubmit"
            class="w-full"
          />
        </form>
      </div>

      <!-- Success State -->
      <div v-else-if="activationState === 'success'" class="text-center bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <div class="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Account Created!
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mb-4">
          You can now manage <strong>{{ contractorName }}</strong> from your dashboard.
        </p>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Redirecting to your dashboard...
        </p>
      </div>

      <!-- Already Activated -->
      <div v-else-if="activationState === 'already_activated'" class="text-center bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <div class="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Already Activated
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          {{ errorMessage }}
        </p>
        <NuxtLink to="/login">
          <Button variant="primary" text="Log In to Your Account" />
        </NuxtLink>
      </div>

      <!-- Expired State -->
      <div v-else-if="activationState === 'expired'" class="text-center bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <div class="w-16 h-16 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Link Expired
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          {{ errorMessage }}
        </p>
        <NuxtLink to="/">
          <Button variant="secondary" text="Return to Homepage" />
        </NuxtLink>
      </div>

      <!-- Invalid State -->
      <div v-else-if="activationState === 'invalid'" class="text-center bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <div class="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Invalid Link
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          {{ errorMessage }}
        </p>
        <NuxtLink to="/">
          <Button variant="secondary" text="Return to Homepage" />
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

