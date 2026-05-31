import type { User } from '@supabase/supabase-js'
import consola from 'consola'

/**
 * Centralized auth state composable
 *
 * Provides consistent user state across all pages (public, admin, owner).
 * Leverages useSupabaseUser() as the source of truth and lazily fetches
 * profile data from account_profiles only when needed.
 *
 * @example
 * ```ts
 * const { isAuthenticated, email, displayName, ensureProfile } = useAuthUser()
 *
 * async function openDialog() {
 *   await ensureProfile() // Fetch profile if not already loaded
 *   if (isAuthenticated.value) {
 *     // Use email.value, displayName.value
 *   }
 * }
 * ```
 */
export function useAuthUser() {
  // Get user from Nuxt Supabase module (already reactive, handles SSR)
  const user = useSupabaseUser()

  // Reuse existing useState keys for backward compatibility with middlewares
  // undefined = not yet fetched, null = explicitly no profile
  const isAdmin = useState<boolean | undefined>('admin-auth:isAdmin', () => undefined)
  const status = useState<string | null | undefined>('admin-auth:status', () => undefined)

  // Computed helpers - Supabase user uses 'sub' (JWT subject) or 'id' for user ID
  const isAuthenticated = computed(() => !!(user.value?.id || user.value?.sub))
  const email = computed(() => user.value?.email || '')
  const displayName = computed(() =>
    user.value?.user_metadata?.display_name
    || user.value?.user_metadata?.full_name
    || ''
  )

  // Loading state
  const isLoading = ref(false)

  // Singleton promise to prevent race conditions
  let profilePromise: Promise<void> | null = null

  /**
   * Fetch profile data from account_profiles if not already loaded.
   * Uses singleton pattern to prevent duplicate fetches.
   */
  async function ensureProfile(): Promise<void> {
    // Supabase user object uses 'sub' for user ID (JWT subject claim), not 'id'
    const userId = user.value?.id || user.value?.sub

    // Debug: log on client in dev mode only
    if (import.meta.client && import.meta.dev) {
      console.log('[useAuthUser] ensureProfile called', {
        hasUser: !!user.value,
        userId,
        userEmail: user.value?.email,
        isAdminState: isAdmin.value,
      })
    }

    // No user = nothing to fetch
    if (!userId) {
      if (import.meta.dev) {
        consola.debug('[useAuthUser] ensureProfile: no user, skipping')
      }
      return
    }

    // Already loaded
    if (isAdmin.value !== undefined) {
      if (import.meta.dev) {
        consola.debug('[useAuthUser] ensureProfile: profile already loaded', {
          isAdmin: isAdmin.value,
          status: status.value,
        })
      }
      return
    }

    // Return existing promise if fetch in progress
    if (profilePromise) {
      if (import.meta.dev) {
        consola.debug('[useAuthUser] ensureProfile: fetch already in progress, waiting')
      }
      return profilePromise
    }

    // Start new fetch
    profilePromise = (async () => {
      isLoading.value = true

      try {
        if (import.meta.dev) {
          consola.info('[useAuthUser] ensureProfile: fetching profile for', userId)
        }

        const supabase = useSupabaseClient()
        const { data, error } = await supabase
          .from('account_profiles')
          .select('is_admin, status')
          .eq('id', userId)
          .maybeSingle()

        if (error) {
          if (import.meta.dev) {
            consola.warn('[useAuthUser] ensureProfile: error fetching profile', error.message)
          }
          // Set defaults on error
          isAdmin.value = false
          status.value = null
          return
        }

        isAdmin.value = !!data?.is_admin
        status.value = data?.status ?? null

        if (import.meta.dev) {
          consola.success('[useAuthUser] ensureProfile: profile loaded', {
            isAdmin: isAdmin.value,
            status: status.value,
          })
        }
      }
      catch (err: any) {
        if (import.meta.dev) {
          consola.error('[useAuthUser] ensureProfile: unexpected error', err)
        }
        isAdmin.value = false
        status.value = null
      }
      finally {
        isLoading.value = false
        profilePromise = null
      }
    })()

    return profilePromise
  }

  return {
    // User object from Supabase
    user: user as Ref<User | null>,

    // Computed helpers
    isAuthenticated,
    email,
    displayName,

    // Profile data (lazy-loaded)
    isAdmin,
    status,

    // Loading state
    isLoading,

    // Methods
    ensureProfile,
  }
}

