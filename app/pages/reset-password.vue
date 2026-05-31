<script setup lang="ts">
import consola from 'consola'

definePageMeta({
  layout: 'blank',
})

useHead({
  title: 'Reset Password - Cost of landscape'
})

const router = useRouter()
const supabase = useSupabaseClient()
const user = useSupabaseUser()

// State
const isReady = ref(false)
const isRecoveryMode = ref(false)
const newPassword = ref('')
const confirmPassword = ref('')
const isUpdatingPassword = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref(false)

// Watch for user state changes - if user becomes logged in on this page,
// they arrived via recovery link (this page is only for password recovery)
watch(user, (newUser) => {
  if (newUser && !isRecoveryMode.value) {
    if (import.meta.dev) {
      consola.info('User detected on reset-password page - enabling recovery mode')
    }
    isRecoveryMode.value = true
    isReady.value = true
  }
}, { immediate: true })

// Listen for PASSWORD_RECOVERY event and handle code exchange
onMounted(async () => {
  if (import.meta.client) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, _session) => {
      if (import.meta.dev) {
        consola.info('Reset password - Auth state change:', event)
      }

      if (event === 'PASSWORD_RECOVERY') {
        if (import.meta.dev) {
          consola.info('Password recovery event detected')
        }
        isRecoveryMode.value = true
        isReady.value = true
      }
    })

    // Check for code in URL - indicates recovery flow in progress
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')

    if (code) {
      if (import.meta.dev) {
        consola.info('Recovery code detected in URL, waiting for session...')
      }
      // The Supabase module will exchange this code automatically
      // Wait a moment for the session to be established
      await new Promise(resolve => setTimeout(resolve, 500))

      // Check again after waiting
      if (user.value) {
        isRecoveryMode.value = true
      }

      // Clear the code from URL
      window.history.replaceState(null, '', window.location.pathname)
    }

    // If no code and no user, show invalid state
    if (!code && !user.value) {
      isReady.value = true
    }

    // Safety timeout - if still not ready after 3 seconds, show invalid
    const timeout = setTimeout(() => {
      if (!isReady.value) {
        isReady.value = true
      }
    }, 3000)

    // Store subscription for cleanup
    subscriptionRef = subscription
    timeoutRef = timeout
  }
})

// Cleanup - must be at top level of setup
let subscriptionRef: { unsubscribe: () => void } | null = null
let timeoutRef: ReturnType<typeof setTimeout> | null = null

onUnmounted(() => {
  if (subscriptionRef) {
    subscriptionRef.unsubscribe()
  }
  if (timeoutRef) {
    clearTimeout(timeoutRef)
  }
})

// Password validation
const passwordsMatch = computed(() => newPassword.value === confirmPassword.value)
const passwordMinLength = computed(() => newPassword.value.length >= 8)
const canSubmit = computed(() =>
  passwordsMatch.value &&
  passwordMinLength.value &&
  !isUpdatingPassword.value
)

// Update password
async function handleUpdatePassword() {
  if (!canSubmit.value) return

  isUpdatingPassword.value = true
  errorMessage.value = null

  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword.value
    })

    if (error) {
      if (import.meta.dev) {
        consola.error('Password update failed:', error.message)
      }
      errorMessage.value = error.message
    } else {
      if (import.meta.dev) {
        consola.info('Password updated successfully')
      }
      successMessage.value = true

      // Sign out and redirect to login after short delay
      setTimeout(async () => {
        await supabase.auth.signOut()
        router.push('/login?message=password-updated')
      }, 2000)
    }
  } catch (err: any) {
    errorMessage.value = 'An unexpected error occurred. Please try again.'
  } finally {
    isUpdatingPassword.value = false
  }
}

// Redirect invalid access
function goToLogin() {
  router.push('/login')
}
</script>

<template>
  <LayoutAuth>
    <div class="grid mx-auto max-w-sm gap-6">
      <!-- Loading state -->
      <div v-if="!isReady" class="text-center py-8">
        <div class="animate-spin w-8 h-8 border-4 border-site-blue border-t-transparent rounded-full mx-auto" />
        <p class="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
      </div>

      <!-- Recovery Mode: Show password reset form -->
      <div v-else-if="isRecoveryMode && !successMessage" class="space-y-6">
        <div class="text-center">
          <h1 class="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
            Set New Password
          </h1>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Enter your new password below
          </p>
        </div>

        <!-- Error Message -->
        <div v-if="errorMessage" class="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
          {{ errorMessage }}
        </div>

        <form class="grid gap-4" @submit.prevent="handleUpdatePassword">
          <!-- New Password -->
          <div class="grid gap-1">
            <PasswordInput
              v-model="newPassword"
              label="New Password"
              size="md"
              placeholder="Enter new password"
              icon="heroicons:lock-closed"
              autocomplete="new-password"
              :disabled="isUpdatingPassword"
            />
            <p v-if="newPassword && !passwordMinLength" class="text-xs text-red-500">
              Password must be at least 8 characters
            </p>
          </div>

          <!-- Confirm Password -->
          <div class="grid gap-1">
            <PasswordInput
              v-model="confirmPassword"
              label="Confirm Password"
              size="md"
              placeholder="Confirm new password"
              icon="heroicons:lock-closed"
              autocomplete="new-password"
              :disabled="isUpdatingPassword"
            />
            <p v-if="confirmPassword && !passwordsMatch" class="text-xs text-red-500">
              Passwords do not match
            </p>
          </div>

          <!-- Submit Button -->
          <Button
            type="submit"
            :disabled="!canSubmit"
            :loading="isUpdatingPassword"
            :text="isUpdatingPassword ? 'Updating...' : 'Update Password'"
            class="w-full"
          />
        </form>
      </div>

      <!-- Success Message -->
      <div v-else-if="successMessage" class="text-center py-8 space-y-4">
        <div class="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
          <svg class="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
          Password Updated!
        </h2>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Redirecting you to login...
        </p>
      </div>

      <!-- Invalid Access: No recovery session -->
      <div v-else class="text-center py-8 space-y-4">
        <div class="w-16 h-16 mx-auto bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
          <svg class="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
          Invalid or Expired Link
        </h2>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          This password reset link is invalid or has expired.
        </p>
        <Button text="Back to Login" @click="goToLogin" />
      </div>
    </div>
  </LayoutAuth>
</template>

