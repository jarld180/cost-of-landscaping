import consola from 'consola'
import { parseCookies } from 'h3'

// Global middleware to protect all /admin/* routes
// - Unauthenticated users are redirected to /login with a redirect back
// - Authenticated non-admin users receive a 403 handled by app/error.vue
// - Runs on both server and client so SSR and hydration stay in sync

export default defineNuxtRouteMiddleware(async (to) => {
  // Only apply to admin routes
  if (!to.path.startsWith('/admin')) {
    return
  }

  const redirectToLogin = () => {
    const redirectTarget = to.fullPath || '/admin/pages'

    // Store redirect path in state instead of query param
    const redirectAfterLogin = useState<string | null>('auth:redirectAfterLogin', () => null)
    redirectAfterLogin.value = redirectTarget

    if (import.meta.dev) {
      consola.info('Admin route guard: redirecting to login', {
        path: to.fullPath,
        redirectTarget,
      })
    }

    return navigateTo('/login')
  }

  // ----- SERVER-SIDE GUARD -----
  if (import.meta.server) {
    const event = useRequestEvent()

    // Should not happen, but if it does, let the client-side guard handle it
    if (!event) {
      return
    }

    try {
      // Check for Supabase auth cookies instead of calling getUser()
      // This avoids the SSR cookie timing issue that causes the flash
      // Cookie format: sb-{project-id}-auth-token (and variants)
      const cookies = parseCookies(event)
      const cookieNames = Object.keys(cookies)
      const hasAuthCookies = cookieNames.some(name => name.startsWith('sb-') && name.includes('auth-token'))

      if (!hasAuthCookies) {
        // No auth cookies at all - definitely not authenticated
        if (import.meta.dev) {
          consola.info('Admin route guard (server): no auth cookies, redirecting to login', {
            path: to.fullPath,
            availableCookies: cookieNames,
          })
        }

        return redirectToLogin()
      }

      // Auth cookies exist - let the client-side guard verify the session
      // This prevents the flash on hard refresh while maintaining security
      if (import.meta.dev) {
        consola.info('Admin route guard (server): auth cookies present, deferring to client', {
          path: to.fullPath,
          authCookies: cookieNames.filter(name => name.startsWith('sb-')),
        })
      }

      return
    }
    catch (err: any) {
      if (import.meta.dev) {
        consola.error('Admin route guard (server): unexpected error', err)
      }

      // Fail closed: if something goes wrong on the server, treat as unauthenticated
      return redirectToLogin()
    }
  }

  // ----- CLIENT-SIDE GUARD -----
  if (import.meta.client) {
    const supabase = useSupabaseClient()

    // Global state for the current Supabase user, admin flag, and account status.
    // undefined => not yet resolved, null => explicitly unauthenticated.
    const authUserState = useState<any | null | undefined>('admin-auth:user', () => undefined)
    const isAdminState = useState<boolean | undefined>('admin-auth:isAdmin', () => undefined)
    const accountStatusState = useState<string | null | undefined>('admin-auth:status', () => undefined)

    // Resolve the current Supabase user once per client session
    if (authUserState.value === undefined) {
      try {
        const { data, error } = await supabase.auth.getUser()

        if (error && import.meta.dev) {
          consola.warn('Admin route guard (client): error fetching Supabase user', error.message)
        }

        authUserState.value = data?.user ?? null
      }
      catch (err: any) {
        if (import.meta.dev) {
          consola.error('Admin route guard (client): unexpected error when fetching user', err)
        }
        authUserState.value = null
      }
    }

    // If we still have no authenticated user, redirect to login with redirect back
    if (!authUserState.value) {
      if (import.meta.dev) {
        consola.info('Admin route guard (client): unauthenticated, redirecting to login', {
          path: to.fullPath,
        })
      }

      return redirectToLogin()
    }

    // Resolve is_admin flag and account status for the current user once per client session
    if (isAdminState.value === undefined) {
      try {
        const { data, error } = await supabase
          .from('account_profiles')
          .select('is_admin, account_type, status, metadata')
          .eq('id', authUserState.value.id)
          .maybeSingle()

        if (error && import.meta.dev) {
          consola.warn('Admin route guard (client): error fetching account_profiles row', error.message)
        }

        // If there is no row or is_admin is false, treat as non-admin
        isAdminState.value = !!data?.is_admin
        accountStatusState.value = data?.status ?? null
      }
      catch (err: any) {
        if (import.meta.dev) {
          consola.error('Admin route guard (client): unexpected error when checking is_admin', err)
        }
        // Fail closed: treat as non-admin with no status
        isAdminState.value = false
        accountStatusState.value = null
      }
    }

    // Authenticated but not an admin: throw a 403 handled by app/error.vue
    if (!isAdminState.value) {
      if (import.meta.dev) {
        consola.info('Admin route guard (client): authenticated but not admin, throwing 403', {
          path: to.fullPath,
          userId: authUserState.value?.id,
        })
      }

      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden',
        message: 'You do not have permission to access this area.',
      })
    }

    // Admin but account is not active: throw a 403
    if (accountStatusState.value !== 'active') {
      if (import.meta.dev) {
        consola.info('Admin route guard (client): account not active, throwing 403', {
          path: to.fullPath,
          userId: authUserState.value?.id,
          status: accountStatusState.value,
        })
      }

      const message = accountStatusState.value === 'suspended'
        ? 'Your account has been suspended. Please contact an administrator.'
        : 'Your account is no longer active. Please contact an administrator.'

      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden',
        message,
      })
    }

    if (import.meta.dev) {
      consola.success('Admin route guard (client): admin access granted', {
        path: to.fullPath,
        userId: authUserState.value?.id,
        status: accountStatusState.value,
      })
    }
  }
})
