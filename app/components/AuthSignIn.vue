<script setup lang="ts">
import consola from 'consola'

const router = useRouter()
const supabase = useSupabaseClient()
const user = useSupabaseUser()

// Redirect path stored via useState (set by auth middlewares)
const redirectAfterLogin = useState<string | null>('auth:redirectAfterLogin', () => null)

const email = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
const isRedirecting = ref(false)

// Forgot Password State (inline form swap)
const showForgotPassword = ref(false)
const forgotPasswordEmail = ref('')
const isSendingResetEmail = ref(false)
const resetEmailSent = ref(false)
const resetEmailError = ref<string | null>(null)

// Access global isAdmin state set by admin-auth middleware
const isAdminState = useState<boolean | undefined>('admin-auth:isAdmin', () => undefined)

// Determine redirect destination after successful login
// Uses stored redirect if available, otherwise routes based on account type
// Returns null if account type is not yet known (caller must wait)
function getRedirectDestination(isAdmin: boolean | undefined): string | null {
  // If we don't know the account type yet, don't redirect
  if (isAdmin === undefined) {
    return null
  }
  const storedRedirect = redirectAfterLogin.value
  if (storedRedirect && storedRedirect.startsWith('/')) {
    return storedRedirect
  }
  // Admins go to /admin, business users go to /owner
  return isAdmin ? '/admin' : '/owner'
}

// If already logged in, fetch account type and redirect appropriately
watch(user, async (newUser) => {
  // Ensure we have a valid user with an id before proceeding
  if (!newUser?.id || isRedirecting.value) {
    return
  }

  isRedirecting.value = true

  // Always fetch account type to ensure we have fresh data for the current user
  const { data: profile } = await supabase
    .from('account_profiles')
    .select('is_admin, status')
    .eq('id', newUser.id)
    .maybeSingle()

  const userIsAdmin = !!profile?.is_admin
  isAdminState.value = userIsAdmin

  // Also update other auth state
  const authUserState = useState<any | null | undefined>('admin-auth:user', () => undefined)
  const accountStatusState = useState<string | null | undefined>('admin-auth:status', () => undefined)
  authUserState.value = newUser
  accountStatusState.value = profile?.status ?? null

  const destination = getRedirectDestination(userIsAdmin)

  if (import.meta.dev) {
    consola.info('Login page: user already authenticated, redirecting to:', destination)
  }

  redirectAfterLogin.value = null
  router.replace(destination!)
}, { immediate: true })

// Handle forgot password email submission
async function onSendResetEmail() {
  resetEmailError.value = null

  const emailValue = forgotPasswordEmail.value?.trim()
  if (!emailValue) {
    resetEmailError.value = 'Please enter your email address.'
    return
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(emailValue)) {
    resetEmailError.value = 'Please enter a valid email address.'
    return
  }

  try {
    isSendingResetEmail.value = true

    // Redirect to dedicated reset-password page
    const redirectUrl = `${window.location.origin}/reset-password`

    const { error } = await supabase.auth.resetPasswordForEmail(emailValue, {
      redirectTo: redirectUrl,
    })

    if (error) {
      if (import.meta.dev) {
        consola.error('Reset email failed:', error.message)
      }
      resetEmailError.value = error.message || 'Failed to send reset email. Please try again.'
      return
    }

    if (import.meta.dev) {
      consola.success('Password reset email sent to:', emailValue)
    }

    resetEmailSent.value = true
  } catch (err: any) {
    if (import.meta.dev) {
      consola.error('Unexpected reset email error:', err)
    }
    resetEmailError.value = 'An unexpected error occurred. Please try again.'
  } finally {
    isSendingResetEmail.value = false
  }
}

// Reset forgot password state and go back to login
function backToLogin() {
  showForgotPassword.value = false
  forgotPasswordEmail.value = ''
  resetEmailSent.value = false
  resetEmailError.value = null
}

async function onSubmit(event: Event) {
  event.preventDefault()

  try {
    isLoading.value = true
    errorMessage.value = null

    const emailValue = email.value?.trim() || ''
    const passwordValue = password.value || ''

    if (!emailValue || !passwordValue) {
      errorMessage.value = 'Please enter both email and password.'
      return
    }

    if (import.meta.dev) {
      consola.info('Attempting login with email:', emailValue)
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: emailValue,
      password: passwordValue
    })

    if (error) {
      if (import.meta.dev) {
        consola.warn('Login failed:', error.message)
      }
      errorMessage.value = 'Invalid email or password. Please try again.'
      return
    }

    // Fetch the logged-in user to get their ID
    const { data: { user: loggedInUser } } = await supabase.auth.getUser()

    if (!loggedInUser) {
      errorMessage.value = 'Login failed. Please try again.'
      return
    }

    // Fetch account type to determine redirect destination
    const { data: profile } = await supabase
      .from('account_profiles')
      .select('is_admin, status')
      .eq('id', loggedInUser.id)
      .maybeSingle()

    const userIsAdmin = !!profile?.is_admin

    // Update the global auth state with fetched values
    const authUserState = useState<any | null | undefined>('admin-auth:user', () => undefined)
    const accountStatusState = useState<string | null | undefined>('admin-auth:status', () => undefined)
    authUserState.value = loggedInUser
    isAdminState.value = userIsAdmin
    accountStatusState.value = profile?.status ?? null

    // userIsAdmin is always a boolean here, so destination will never be null
    const destination = getRedirectDestination(userIsAdmin)!

    if (import.meta.dev) {
      consola.success('Login successful, redirecting to:', destination, { isAdmin: userIsAdmin })
    }

    redirectAfterLogin.value = null
    isRedirecting.value = true

    await router.replace(destination)
  } catch (err: any) {
    if (import.meta.dev) {
      consola.error('Unexpected login error:', err)
    }
    errorMessage.value = 'An unexpected error occurred. Please try again.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="grid gap-6">
    <!-- FORGOT PASSWORD MODE (inline form swap) -->
    <template v-if="showForgotPassword">
      <!-- Success State -->
      <template v-if="resetEmailSent">
        <div class="space-y-4 text-center">
          <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <Icon name="heroicons:envelope-open" class="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <h3 class="text-lg font-semibold text-neutral-900 dark:text-white">
            Check your email
          </h3>
          <p class="text-sm text-neutral-600 dark:text-neutral-400">
            We've sent a password reset link to <strong>{{ forgotPasswordEmail }}</strong>
          </p>
        </div>
        <Button
          text="Back to Sign In"
          type="button"
          size="md"
          variant="primary"
          @click="backToLogin"
        />
      </template>

      <!-- Forgot Password Form -->
      <template v-else>
        <div class="space-y-2 text-center">
          <h3 class="text-lg font-semibold text-neutral-900 dark:text-white">
            Reset Password
          </h3>
          <p class="text-sm text-neutral-600 dark:text-neutral-400">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        <!-- Error Message -->
        <div
          v-if="resetEmailError"
          class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200"
        >
          {{ resetEmailError }}
        </div>

        <form class="grid gap-4" @submit.prevent="onSendResetEmail">
          <TextInput
            v-model="forgotPasswordEmail"
            type="email"
            size="md"
            label="Email"
            placeholder="you@example.com"
            :disabled="isSendingResetEmail"
            icon="heroicons:envelope"
          />

          <Button
            :text="isSendingResetEmail ? 'Sending...' : 'Send Reset Link'"
            type="submit"
            size="md"
            variant="primary"
            :disabled="isSendingResetEmail"
            :loading="isSendingResetEmail"
          />
        </form>

        <!-- Back to Login Link -->
        <div class="text-center text-sm text-neutral-600 dark:text-neutral-400">
          <button
            type="button"
            class="font-medium text-blue-600 underline dark:text-blue-400"
            @click="backToLogin"
          >
            Back to Sign In
          </button>
        </div>
      </template>
    </template>

    <!-- NORMAL LOGIN MODE -->
    <template v-else>
      <!-- Header -->
      <div class="grid gap-2 text-center">
        <h1 class="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
          Welcome back
        </h1>
        <p class="text-balance text-sm text-neutral-600 dark:text-neutral-400">
          Login with your account below
        </p>
      </div>

      <!-- Error Message -->
      <div
        v-if="errorMessage"
        class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200"
      >
        {{ errorMessage }}
      </div>

      <!-- Email/Password Form -->
      <form class="grid gap-4" @submit="onSubmit">
        <TextInput
          v-model="email"
          type="email"
          size="md"
          label="Email"
          placeholder="you@example.com"
          :disabled="isLoading"
          icon="heroicons:envelope"
        />

        <div class="grid gap-2">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Password
            </label>
            <button
              type="button"
              class="text-sm text-neutral-600 underline hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
              @click="showForgotPassword = true"
            >
              Forgot your password?
            </button>
          </div>
          <PasswordInput
            v-model="password"
            size="md"
            placeholder="Enter your password"
            :disabled="isLoading"
            icon="heroicons:lock-closed"
          />
        </div>

        <Button
          :text="isLoading ? 'Signing in...' : 'Sign In'"
          type="submit"
          size="md"
          variant="primary"
          :disabled="isLoading"
          :loading="isLoading"
        />
      </form>

      <!-- Sign Up Link -->
      <div class="text-center text-sm text-neutral-600 dark:text-neutral-400">
        Don't have an account?
        <NuxtLink
          to="#"
          class="font-medium text-blue-600 underline dark:text-blue-400"
        >
          Sign up
        </NuxtLink>
      </div>
    </template>
  </div>
</template>

<style scoped>

</style>

