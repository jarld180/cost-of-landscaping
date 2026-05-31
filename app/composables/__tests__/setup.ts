import { vi } from 'vitest'

// NO #imports mock - composables use dependency injection for all external deps
// This file only sets up global $fetch for any composable that might use it directly
// Tests inject mocks via composable options: { supabaseClient, fetchFn }
globalThis.$fetch = vi.fn()
