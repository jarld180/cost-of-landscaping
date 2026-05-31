/**
 * Vitest Global Setup
 *
 * Sets up test environment, mocks, and global utilities.
 * Loaded before all tests via vitest.config.ts setupFiles.
 */

import { vi } from 'vitest'
import { config } from 'dotenv'
import { resolve } from 'path'

// =====================================================
// ENVIRONMENT VARIABLES
// =====================================================

// When running integration tests, load .env.local first so real credentials
// are available. This must happen BEFORE any service imports in test files.
if (process.env.RUN_INTEGRATION === 'true') {
  config({ path: resolve(process.cwd(), '.env.local') })
}

// Set a fallback API key for unit tests that don't need real credentials
// This only applies if no real key was loaded above
if (!process.env.DATAFORSEO_API_KEY) {
  process.env.DATAFORSEO_API_KEY = 'test-api-key-base64-encoded'
}
process.env.NODE_ENV = 'test'

// =====================================================
// GLOBAL MOCKS
// =====================================================

// Mock consola to prevent noisy logs during tests
vi.mock('consola', () => ({
  consola: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    log: vi.fn(),
  },
}))

// =====================================================
// GLOBAL TEST UTILITIES
// =====================================================

/**
 * Helper to create a mock DataForSEO API response
 */
export function createMockApiResponse<T>(data: T, cost = 0.001): T & { cost: number } {
  return { ...data, cost }
}

/**
 * Helper to create a failed API response
 */
export function createMockErrorResponse(statusCode: number, message: string) {
  return {
    status_code: statusCode,
    status_message: message,
    cost: 0,
    tasks: [],
  }
}

