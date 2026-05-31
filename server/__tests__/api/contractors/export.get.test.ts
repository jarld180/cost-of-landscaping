/**
 * GET /api/contractors/export
 *
 * Tests for CSV export endpoint.
 * Supports two modes:
 * - IDs mode: Export specific contractors by UUID array (comma-separated query string)
 * - Filters mode: Export all contractors matching filter criteria
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { H3Event } from 'h3'

// Hoist stubs for Nuxt globals
vi.hoisted(() => {
  // @ts-expect-error - stubbing global
  globalThis.defineEventHandler = (handler: unknown) => handler
  // @ts-expect-error - stubbing global
  globalThis.getQuery = vi.fn()
  // @ts-expect-error - stubbing global
  globalThis.setHeader = vi.fn()
  // @ts-expect-error - stubbing global
  globalThis.createError = (opts: { statusCode: number; statusMessage?: string; message?: string; data?: unknown }) => {
    const err = new Error(opts.message) as Error & { statusCode: number; statusMessage?: string; data?: unknown }
    err.statusCode = opts.statusCode
    err.statusMessage = opts.statusMessage
    err.data = opts.data
    return err
  }
})

// Mock #supabase/server
vi.mock('#supabase/server', () => ({
  serverSupabaseClient: vi.fn(),
}))

// Mock auth utils
vi.mock('../../../utils/auth', () => ({
  requireAdmin: vi.fn(),
}))

// Mock contractorFilters
vi.mock('../../../utils/contractorFilters', () => ({
  applyContractorFilters: vi.fn((query) => query),
}))

// Import mocked modules
import { serverSupabaseClient } from '#supabase/server'
import { requireAdmin } from '../../../utils/auth'
import { applyContractorFilters } from '../../../utils/contractorFilters'

// Import handler after mocks
import handler from '../../../api/contractors/export.get'

// Test UUIDs
const UUID1 = '550e8400-e29b-41d4-a716-446655440001'
const UUID2 = '550e8400-e29b-41d4-a716-446655440002'
const UUID3 = '550e8400-e29b-41d4-a716-446655440003'

/**
 * Helper to create a chainable mock for Supabase query builder
 */
function createMockChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: vi.fn((resolve: (value: unknown) => void) => resolve(result)),
  }
  // Make it thenable
  Object.defineProperty(chain, 'then', {
    value: (resolve: (value: unknown) => void) => {
      resolve(result)
      return Promise.resolve(result)
    },
  })
  return chain
}

// Sample contractor data for tests
const sampleContractor1 = {
  id: UUID1,
  company_name: 'Acme Concrete',
  slug: 'acme-concrete',
  status: 'active',
  phone: '555-1234',
  email: 'info@acme.com',
  website: 'https://acme.com',
  street_address: '123 Main St',
  postal_code: '12345',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
  city: { name: 'Springfield', state_code: 'IL' },
}

const sampleContractor2 = {
  id: UUID2,
  company_name: 'Best Builders',
  slug: 'best-builders',
  status: 'pending',
  phone: null,
  email: null,
  website: null,
  street_address: null,
  postal_code: null,
  created_at: '2024-02-01T00:00:00Z',
  updated_at: '2024-02-02T00:00:00Z',
  city: null,
}

// Contractor with special characters for escaping test
const contractorWithSpecialChars = {
  id: UUID3,
  company_name: 'Acme, "Best" Co',
  slug: 'acme-best-co',
  status: 'active',
  phone: '555-9999',
  email: 'test@example.com',
  website: 'https://example.com',
  street_address: '456 Oak Ave',
  postal_code: '67890',
  created_at: '2024-03-01T00:00:00Z',
  updated_at: '2024-03-02T00:00:00Z',
  city: { name: 'Chicago', state_code: 'IL' },
}

describe('GET /api/contractors/export', () => {
  let mockEvent: H3Event
  let mockSupabaseClient: Record<string, unknown>

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup mock event
    mockEvent = { context: {}, node: { req: {}, res: {} } } as unknown as H3Event

    // Default: admin user authenticated
    vi.mocked(requireAdmin).mockResolvedValue('admin-user-id')
  })

  // =====================================================
  // BASIC EXPORT TESTS
  // =====================================================

  describe('Basic export', () => {
    it('returns CSV with header row + data rows', async () => {
      // @ts-expect-error - mocked global
      globalThis.getQuery = vi.fn().mockReturnValue({})

      const queryChain = createMockChain({
        data: [sampleContractor1, sampleContractor2],
        error: null,
      })

      mockSupabaseClient = {
        from: vi.fn().mockReturnValue(queryChain),
      }

      vi.mocked(serverSupabaseClient).mockResolvedValue(mockSupabaseClient as never)

      const result = await handler(mockEvent)

      // Should be a string (CSV)
      expect(typeof result).toBe('string')

      // Split into lines
      const lines = (result as string).split('\n')

      // Should have header + 2 data rows
      expect(lines.length).toBe(3)

      // Verify setHeader was called for Content-Type
      expect(globalThis.setHeader).toHaveBeenCalledWith(
        mockEvent,
        'Content-Type',
        'text/csv; charset=utf-8'
      )

      // Verify setHeader was called for Content-Disposition
      expect(globalThis.setHeader).toHaveBeenCalledWith(
        mockEvent,
        'Content-Disposition',
        expect.stringMatching(/^attachment; filename="contractors-export-\d{4}-\d{2}-\d{2}\.csv"$/)
      )
    })

    it('returns header row order exactly as specified', async () => {
      // @ts-expect-error - mocked global
      globalThis.getQuery = vi.fn().mockReturnValue({})

      const queryChain = createMockChain({
        data: [sampleContractor1],
        error: null,
      })

      mockSupabaseClient = {
        from: vi.fn().mockReturnValue(queryChain),
      }

      vi.mocked(serverSupabaseClient).mockResolvedValue(mockSupabaseClient as never)

      const result = await handler(mockEvent)
      const csvOutput = result as string

      // Remove BOM and get header line
      const headerLine = csvOutput.split('\n')[0].replace(/^\uFEFF/, '')
      expect(headerLine).toBe('company_name,slug,status,phone,email,website,city,state,street_address,postal_code,created_at,updated_at')
    })
  })

  // =====================================================
  // FILTERED EXPORT TESTS
  // =====================================================

  describe('Filtered export', () => {
    it('only includes matching contractors when filters applied', async () => {
      // @ts-expect-error - mocked global
      globalThis.getQuery = vi.fn().mockReturnValue({ status: 'active' })

      const queryChain = createMockChain({
        data: [sampleContractor1], // Only active contractor
        error: null,
      })

      mockSupabaseClient = {
        from: vi.fn().mockReturnValue(queryChain),
      }

      vi.mocked(serverSupabaseClient).mockResolvedValue(mockSupabaseClient as never)

      const result = await handler(mockEvent)
      const lines = (result as string).split('\n')

      // Header + 1 data row
      expect(lines.length).toBe(2)

      // Verify applyContractorFilters was called
      expect(applyContractorFilters).toHaveBeenCalled()
    })

    it('uses IDs mode when ids query param provided', async () => {
      // @ts-expect-error - mocked global
      globalThis.getQuery = vi.fn().mockReturnValue({ ids: `${UUID1},${UUID2}` })

      const queryChain = createMockChain({
        data: [sampleContractor1, sampleContractor2],
        error: null,
      })

      mockSupabaseClient = {
        from: vi.fn().mockReturnValue(queryChain),
      }

      vi.mocked(serverSupabaseClient).mockResolvedValue(mockSupabaseClient as never)

      const result = await handler(mockEvent)
      const lines = (result as string).split('\n')

      // Header + 2 data rows
      expect(lines.length).toBe(3)

      // Verify .in() was called for IDs mode
      expect(queryChain.in).toHaveBeenCalledWith('id', [UUID1, UUID2])
    })
  })

  // =====================================================
  // EMPTY RESULTS TESTS
  // =====================================================

  describe('Empty results', () => {
    it('returns header row only when no contractors match', async () => {
      // @ts-expect-error - mocked global
      globalThis.getQuery = vi.fn().mockReturnValue({ search: 'nonexistent' })

      const queryChain = createMockChain({
        data: [],
        error: null,
      })

      mockSupabaseClient = {
        from: vi.fn().mockReturnValue(queryChain),
      }

      vi.mocked(serverSupabaseClient).mockResolvedValue(mockSupabaseClient as never)

      const result = await handler(mockEvent)
      const csvOutput = result as string

      // Should have BOM + header only (no data rows)
      const lines = csvOutput.split('\n')
      expect(lines.length).toBe(1)

      // Header should still be present
      const headerLine = csvOutput.replace(/^\uFEFF/, '')
      expect(headerLine).toBe('company_name,slug,status,phone,email,website,city,state,street_address,postal_code,created_at,updated_at')
    })
  })

  // =====================================================
  // AUTH TESTS
  // =====================================================

  describe('Authorization', () => {
    it('rejects non-admin user with 403', async () => {
      vi.mocked(requireAdmin).mockRejectedValue(
        Object.assign(new Error('Admin access required to perform this action.'), {
          statusCode: 403,
          statusMessage: 'Forbidden',
        })
      )

      // @ts-expect-error - mocked global
      globalThis.getQuery = vi.fn().mockReturnValue({})

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: 403,
      })
    })
  })

  // =====================================================
  // CSV FORMAT TESTS
  // =====================================================

  describe('CSV format', () => {
    it('Content-Type header is text/csv; charset=utf-8', async () => {
      // @ts-expect-error - mocked global
      globalThis.getQuery = vi.fn().mockReturnValue({})

      const queryChain = createMockChain({
        data: [sampleContractor1],
        error: null,
      })

      mockSupabaseClient = {
        from: vi.fn().mockReturnValue(queryChain),
      }

      vi.mocked(serverSupabaseClient).mockResolvedValue(mockSupabaseClient as never)

      await handler(mockEvent)

      expect(globalThis.setHeader).toHaveBeenCalledWith(
        mockEvent,
        'Content-Type',
        'text/csv; charset=utf-8'
      )
    })

    it('BOM is present at start of response', async () => {
      // @ts-expect-error - mocked global
      globalThis.getQuery = vi.fn().mockReturnValue({})

      const queryChain = createMockChain({
        data: [sampleContractor1],
        error: null,
      })

      mockSupabaseClient = {
        from: vi.fn().mockReturnValue(queryChain),
      }

      vi.mocked(serverSupabaseClient).mockResolvedValue(mockSupabaseClient as never)

      const result = await handler(mockEvent)
      const csvOutput = result as string

      // BOM check - first character should be \uFEFF (0xFEFF)
      expect(csvOutput.charCodeAt(0)).toBe(0xFEFF)
    })

    it('escapes values with commas and quotes correctly', async () => {
      // @ts-expect-error - mocked global
      globalThis.getQuery = vi.fn().mockReturnValue({})

      const queryChain = createMockChain({
        data: [contractorWithSpecialChars],
        error: null,
      })

      mockSupabaseClient = {
        from: vi.fn().mockReturnValue(queryChain),
      }

      vi.mocked(serverSupabaseClient).mockResolvedValue(mockSupabaseClient as never)

      const result = await handler(mockEvent)
      const csvOutput = result as string

      // Company name with comma and quotes should be escaped
      // 'Acme, "Best" Co' should become '"Acme, ""Best"" Co"'
      expect(csvOutput).toContain('"Acme, ""Best"" Co"')
    })

    it('handles null values as empty strings', async () => {
      // @ts-expect-error - mocked global
      globalThis.getQuery = vi.fn().mockReturnValue({})

      const queryChain = createMockChain({
        data: [sampleContractor2], // Has null phone, email, website, etc.
        error: null,
      })

      mockSupabaseClient = {
        from: vi.fn().mockReturnValue(queryChain),
      }

      vi.mocked(serverSupabaseClient).mockResolvedValue(mockSupabaseClient as never)

      const result = await handler(mockEvent)
      const csvOutput = result as string
      const lines = csvOutput.split('\n')
      const dataLine = lines[1]

      // Should have empty values for null fields (consecutive commas)
      // company_name,slug,status,phone,email,website,city,state,street_address,postal_code,created_at,updated_at
      // Best Builders,best-builders,pending,,,,,,,,,2024-02-01T00:00:00Z,2024-02-02T00:00:00Z
      expect(dataLine).toContain('Best Builders,best-builders,pending,,,,,,,')
    })
  })

  // =====================================================
  // ERROR HANDLING TESTS
  // =====================================================

  describe('Error handling', () => {
    it('throws error when database query fails', async () => {
      // @ts-expect-error - mocked global
      globalThis.getQuery = vi.fn().mockReturnValue({})

      const queryChain = createMockChain({
        data: null,
        error: { message: 'Database error' },
      })

      mockSupabaseClient = {
        from: vi.fn().mockReturnValue(queryChain),
      }

      vi.mocked(serverSupabaseClient).mockResolvedValue(mockSupabaseClient as never)

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: 500,
      })
    })
  })
})
