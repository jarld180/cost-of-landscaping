/**
 * Client-side plugin to detect Supabase auth recovery tokens in URL hash
 * and redirect to the login page where they can be processed.
 *
 * Recovery links from Supabase emails contain hash fragments like:
 * /#access_token=...&type=recovery
 *
 * Since hash fragments are client-side only, we need to detect them
 * and redirect to /login where the AuthSignIn component handles the flow.
 */
export default defineNuxtPlugin(() => {
  const router = useRouter()

  // Only run on client
  if (import.meta.client) {
    const hash = window.location.hash

    // Check if this is a recovery link
    if (hash && hash.includes('type=recovery')) {
      // Check if we're already on the login page
      if (window.location.pathname !== '/login') {
        // Redirect to login page, preserving the hash
        // Use window.location to preserve the hash fragment
        window.location.href = `/login${hash}`
      }
    }
  }
})

