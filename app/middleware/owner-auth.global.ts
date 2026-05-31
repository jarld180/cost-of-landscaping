import consola from 'consola'
import { parseCookies } from 'h3'

/**
 * Global middleware to protect all /owner/* routes
 * - Unauthenticated users are redirected to /login with a redirect back
 * - Runs on both server and client so SSR and hydration stay in sync
 *
 * Note: Unlike admin routes, we only check authentication here.
 * Ownership verification happens at the API level for specific contractors.
 */

export default defineNuxtRouteMiddleware(async (to) => {
  // Only apply to owner routes
  if (!to.path.startsWith('/owner')) {
    return
  }

  const redirectToLogin = () => {
    const redirectTarget = to.fullPath || '/owner'

    // Store redirect path in state instead of query param
    const redirectAfterLogin = useState<string | null>('auth:redirectAfterLogin', () => null)
    redirectAfterLogin.value = redirectTarget

    if (import.meta.dev) {
      consola.info('Owner route guard: redirecting to login', {
        path: to.fullPath,
        redirectTarget,
      })
    }

    return navigateTo('/login')
  }

  // ----- SERVER-SIDE GUARD -----
  if (import.meta.server) {
    const event = useRequestEvent()

    if (!event) {
      return
    }

    try {
      const cookies = parseCookies(event)
      const cookieNames = Object.keys(cookies)
      const hasAuthCookies = cookieNames.some(name => name.startsWith('sb-') && name.includes('auth-token'))

      if (!hasAuthCookies) {
        if (import.meta.dev) {
          consola.info('Owner route guard (server): no auth cookies, redirecting to login', {
            path: to.fullPath,
          })
        }
        return redirectToLogin()
      }

      if (import.meta.dev) {
        consola.info('Owner route guard (server): auth cookies present, deferring to client', {
          path: to.fullPath,
        })
      }

      return
    }
    catch (err: any) {
      if (import.meta.dev) {
        consola.error('Owner route guard (server): unexpected error', err)
      }
      return redirectToLogin()
    }
  }

  // ----- CLIENT-SIDE GUARD -----
  if (import.meta.client) {
    const supabase = useSupabaseClient()

    // Reuse the same auth state as admin middleware
    const authUserState = useState<any | null | undefined>('admin-auth:user', () => undefined)

    // Resolve the current Supabase user once per client session
    if (authUserState.value === undefined) {
      try {
        const { data, error } = await supabase.auth.getUser()

        if (error && import.meta.dev) {
          consola.warn('Owner route guard (client): error fetching Supabase user', error.message)
        }

        authUserState.value = data?.user ?? null
      }
      catch (err: any) {
        if (import.meta.dev) {
          consola.error('Owner route guard (client): unexpected error when fetching user', err)
        }
        authUserState.value = null
      }
    }

    // If we have no authenticated user, redirect to login
    if (!authUserState.value) {
      if (import.meta.dev) {
        consola.info('Owner route guard (client): unauthenticated, redirecting to login', {
          path: to.fullPath,
        })
      }
      return redirectToLogin()
    }

    if (import.meta.dev) {
      consola.success('Owner route guard (client): authenticated, access granted', {
        path: to.fullPath,
        userId: authUserState.value?.id,
      })
    }
  }
})

