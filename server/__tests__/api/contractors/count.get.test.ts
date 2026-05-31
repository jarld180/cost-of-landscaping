/**
 * GET /api/contractors/count
 *
 * Tests for count endpoint.
 * Returns total count of contractors matching optional filters (admin only).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { H3Event } from 'h3'

// Hoist stubs for Nuxt auto-imports
vi.hoisted(() => {
  // @ts-expect-error - stubbing global
  globalThis.defineEventHandler = (handler: unknown) => handler
  // @ts-expect-error - stubbing global
  globalThis.getQuery = vi.fn()
  // @ts-expect-error - stubbing global
  globalThis.createError = (opts: { statusCode: number; statusMessage?: string; message?: string; data?: unknown }) => {
    const err = new Error(opts.message) as Error & { statusCode: number; statusMessage?: string; data?: unknown }
    err.statusCode = opts.statusCode
    err.statusMessage = opts.statusMessage
    err.data = opts.data
    return err
  }
})

// Mock Supabase client
vi.mock('#supabase/server', () => ({
  serverSupabaseClient: vi.fn(),
}))

// Mock auth utility
vi.mock('../../../utils/auth', () => ({
  requireAdmin: vi.fn(),
}))

// Mock contractor filters utility
vi.mock('../../../utils/contractorFilters', () => ({
  applyContractorFilters: vi.fn((query, filters) => query),
}))

import { serverSupabaseClient } from '#supabase/server'
import { requireAdmin } from '../../../utils/auth'
import { applyContractorFilters } from '../../../utils/contractorFilters'
import handler from '../../../api/contractors/count.get'

// =====================================================
// TEST UTILITIES
// =====================================================

const VALID_UUID_1 = '11111111-1111-4111-8111-111111111111'
const VALID_UUID_2 = '22222222-2222-4222-8222-222222222222'
const VALID_UUID_3 = '33333333-3333-4333-8333-333333333333'

function createMockEvent(): H3Event {
  return {} as H3Event
}

function createMockSupabaseClient(options: {
  count?: number
  error?: { message: string; code?: string } | null
}) {
  const { count = 0, error = null } = options

  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    then: vi.fn((resolve) => {
      resolve({ count, error })
    }),
  }

  return {
    from: vi.fn().mockReturnValue(mockQuery),
    _mockQuery: mockQuery,
  }
}

// =====================================================
// TEST SUITE
// =====================================================

describe('GET /api/contractors/count', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAdmin).mockResolvedValue('admin-user-id')
    vi.mocked(applyContractorFilters).mockImplementation((query) => query)
  })

  // =====================================================
  // AUTHORIZATION TESTS
  // =====================================================

  describe('authorization', () => {
    it('should return 403 for non-admin user', async () => {
      vi.mocked(requireAdmin).mockRejectedValue(
        createError({
          statusCode: 403,
          statusMessage: 'Forbidden',
          message: 'Admin access required to perform this action.',
        })
      )

      const mockClient = createMockSupabaseClient({ count: 0 })
      vi.mocked(serverSupabaseClient).mockResolvedValue(mockClient as never)

      // @ts-expect-error - getQuery is mocked globally
      globalThis.getQuery = vi.fn().mockReturnValue({})

      const event = createMockEvent()

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 403,
        message: 'Admin access required to perform this action.',
      })
    })

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(requireAdmin).mockRejectedValue(
        createError({
          statusCode: 401,
          statusMessage: 'Unauthorized',
          message: 'Authentication required. Please log in.',
        })
      )

      const mockClient = createMockSupabaseClient({ count: 0 })
      vi.mocked(serverSupabaseClient).mockResolvedValue(mockClient as never)

      // @ts-expect-error - getQuery is mocked globally
      globalThis.getQuery = vi.fn().mockReturnValue({})

      const event = createMockEvent()

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 401,
        message: 'Authentication required. Please log in.',
      })
    })
  })

  // =====================================================
  // NO FILTERS TESTS
  // =====================================================

  describe('no filters', () => {
    it('should return total count when no filters provided', async () => {
      const mockClient = createMockSupabaseClient({ count: 42 })
      vi.mocked(serverSupabaseClient).mockResolvedValue(mockClient as never)

      // @ts-expect-error - getQuery is mocked globally
      globalThis.getQuery = vi.fn().mockReturnValue({})

      const event = createMockEvent()
      const result = await handler(event)

      expect(result).toEqual({
        success: true,
        count: 42,
      })
    })

    it('should return 0 when no contractors exist', async () => {
      const mockClient = createMockSupabaseClient({ count: 0 })
      vi.mocked(serverSupabaseClient).mockResolvedValue(mockClient as never)

      // @ts-expect-error - getQuery is mocked globally
      globalThis.getQuery = vi.fn().mockReturnValue({})

      const event = createMockEvent()
      const result = await handler(event)

      expect(result).toEqual({
        success: true,
        count: 0,
      })
    })
  })

  // =====================================================
  // WITH FILTERS TESTS
  // =====================================================

  describe('with filters', () => {
    it('should return filtered count with cityId filter', async () => {
      const mockClient = createMockSupabaseClient({ count: 15 })
      vi.mocked(serverSupabaseClient).mockResolvedValue(mockClient as never)

      // @ts-expect-error - getQuery is mocked globally
      globalThis.getQuery = vi.fn().mockReturnValue({
        cityId: VALID_UUID_1,
      })

      const event = createMockEvent()
      const result = await handler(event)

      expect(result).toEqual({
        success: true,
        count: 15,
      })

      // Verify applyContractorFilters was called with filters
      expect(applyContractorFilters).toHaveBeenCalled()
    })

    it('should return filtered count with status filter', async () => {
      const mockClient = createMockSupabaseClient({ count: 8 })
      vi.mocked(serverSupabaseClient).mockResolvedValue(mockClient as never)

      // @ts-expect-error - getQuery is mocked globally
      globalThis.getQuery = vi.fn().mockReturnValue({
        status: 'active',
      })

      const event = createMockEvent()
      const result = await handler(event)

      expect(result).toEqual({
        success: true,
        count: 8,
      })

      expect(applyContractorFilters).toHaveBeenCalled()
    })

    it('should return filtered count with category filter', async () => {
      const mockClient = createMockSupabaseClient({ count: 5 })
      vi.mocked(serverSupabaseClient).mockResolvedValue(mockClient as never)

      // @ts-expect-error - getQuery is mocked globally
      globalThis.getQuery = vi.fn().mockReturnValue({
        category: 'concrete-contractors',
      })

      const event = createMockEvent()
      const result = await handler(event)

      expect(result).toEqual({
        success: true,
        count: 5,
      })

      expect(applyContractorFilters).toHaveBeenCalled()
    })

    it('should return filtered count with search filter', async () => {
      const mockClient = createMockSupabaseClient({ count: 3 })
      vi.mocked(serverSupabaseClient).mockResolvedValue(mockClient as never)

      // @ts-expect-error - getQuery is mocked globally
      globalThis.getQuery = vi.fn().mockReturnValue({
        search: 'test company',
      })

      const event = createMockEvent()
      const result = await handler(event)

      expect(result).toEqual({
        success: true,
        count: 3,
      })

      expect(applyContractorFilters).toHaveBeenCalled()
    })

    it('should return filtered count with multiple filters combined', async () => {
      const mockClient = createMockSupabaseClient({ count: 2 })
      vi.mocked(serverSupabaseClient).mockResolvedValue(mockClient as never)

      // @ts-expect-error - getQuery is mocked globally
      globalThis.getQuery = vi.fn().mockReturnValue({
        cityId: VALID_UUID_1,
        status: 'active',
        category: 'concrete-contractors',
        search: 'test',
      })

      const event = createMockEvent()
      const result = await handler(event)

      expect(result).toEqual({
        success: true,
        count: 2,
      })

      expect(applyContractorFilters).toHaveBeenCalled()
    })
  })

  // =====================================================
  // ZERO RESULTS TESTS
  // =====================================================

  describe('zero results', () => {
    it('should return 0 when filters match no contractors', async () => {
      const mockClient = createMockSupabaseClient({ count: 0 })
      vi.mocked(serverSupabaseClient).mockResolvedValue(mockClient as never)

      // @ts-expect-error - getQuery is mocked globally
      globalThis.getQuery = vi.fn().mockReturnValue({
        status: 'suspended',
        search: 'nonexistent-company',
      })

      const event = createMockEvent()
      const result = await handler(event)

      expect(result).toEqual({
        success: true,
        count: 0,
      })
    })
  })

  // =====================================================
  // VALIDATION TESTS
  // =====================================================

  describe('validation', () => {
    it('should return 400 for invalid cityId UUID format', async () => {
      const mockClient = createMockSupabaseClient({ count: 0 })
      vi.mocked(serverSupabaseClient).mockResolvedValue(mockClient as never)

      // @ts-expect-error - getQuery is mocked globally
      globalThis.getQuery = vi.fn().mockReturnValue({
        cityId: 'not-a-valid-uuid',
      })

      const event = createMockEvent()

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 400,
        message: 'Invalid query parameters',
      })
    })

    it('should return 400 for invalid status value', async () => {
      const mockClient = createMockSupabaseClient({ count: 0 })
      vi.mocked(serverSupabaseClient).mockResolvedValue(mockClient as never)

      // @ts-expect-error - getQuery is mocked globally
      globalThis.getQuery = vi.fn().mockReturnValue({
        status: 'invalid-status',
      })

      const event = createMockEvent()

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 400,
        message: 'Invalid query parameters',
      })
    })
  })

  // =====================================================
  // ERROR HANDLING TESTS
  // =====================================================

  describe('error handling', () => {
    it('should handle database error gracefully', async () => {
      const mockClient = createMockSupabaseClient({
        count: 0,
        error: { message: 'Database connection failed' },
      })
      vi.mocked(serverSupabaseClient).mockResolvedValue(mockClient as never)

      // @ts-expect-error - getQuery is mocked globally
      globalThis.getQuery = vi.fn().mockReturnValue({})

      const event = createMockEvent()

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 500,
      })
    })
  })

  // =====================================================
  // RESPONSE FORMAT TESTS
  // =====================================================

  describe('response format', () => {
    it('should return exact response format: { success: true, count: number }', async () => {
      const mockClient = createMockSupabaseClient({ count: 123 })
      vi.mocked(serverSupabaseClient).mockResolvedValue(mockClient as never)

      // @ts-expect-error - getQuery is mocked globally
      globalThis.getQuery = vi.fn().mockReturnValue({})

      const event = createMockEvent()
      const result = await handler(event)

      // Verify exact structure
      expect(Object.keys(result).sort()).toEqual(['count', 'success'])
      expect(result.success).toBe(true)
      expect(typeof result.count).toBe('number')
      expect(result.count).toBe(123)
    })

    it('should NOT return contractor data', async () => {
      const mockClient = createMockSupabaseClient({ count: 5 })
      vi.mocked(serverSupabaseClient).mockResolvedValue(mockClient as never)

      // @ts-expect-error - getQuery is mocked globally
      globalThis.getQuery = vi.fn().mockReturnValue({})

      const event = createMockEvent()
      const result = await handler(event)

      // Verify no data field
      expect(result).not.toHaveProperty('data')
      expect(result).not.toHaveProperty('contractors')
      expect(result).not.toHaveProperty('pagination')
    })
  })
})
