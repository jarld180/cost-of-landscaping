import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

/**
 * Vitest Configuration for Cost of Concrete
 *
 * Unit and integration testing for server-side services and agents.
 * Uses Vitest for fast, modern testing with native TypeScript support.
 */
export default defineConfig({
  test: {
    // Test directory
    include: ['server/**/*.test.ts', 'app/composables/**/*.test.ts'],

    // Environment
    environment: 'node',

    // Globals (describe, it, expect, etc.)
    globals: true,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: ['server/services/**/*.ts', 'server/repositories/**/*.ts'],
      exclude: ['**/*.test.ts', '**/__tests__/**', '**/node_modules/**'],
    },

    // Timeout for async tests
    testTimeout: 30000,

    // Reporter
    reporters: ['verbose'],

    // Setup files (for global mocks, env vars, etc.)
    setupFiles: ['./server/__tests__/setup.ts', './app/composables/__tests__/setup.ts'],
  },

  // Resolve aliases to match Nuxt/tsconfig paths
  resolve: {
    alias: {
      '~': resolve(__dirname, './app'),
      '@': resolve(__dirname, './app'),
      '#supabase/server': resolve(__dirname, './node_modules/@nuxtjs/supabase/dist/runtime/server/services/index.js'),
    },
  },
})

