/**
 * POST /api/contractors/bulk-update
 *
 * Tests for bulk status update endpoint.
 * Supports two modes:
 * - IDs mode: Update specific contractors by UUID array
 * - Filters mode: Update all contractors matching filter criteria
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { H3Event } from 'h3'

// Hoist stubs for Nuxt globals
vi.hoisted(() => {
  // @ts-expect-error - stubbing global
  globalThis.defineEventHandler = (handler: unknown) => handler
  // @ts-expect-error - stubbing global
  globalThis.readBody = vi.fn()
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
import handler from '../../../api/contractors/bulk-update.post'

// Test UUIDs
const UUID1 = '550e8400-e29b-41d4-a716-446655440001'
const UUID2 = '550e8400-e29b-41d4-a716-446655440002'
const UUID3 = '550e8400-e29b-41d4-a716-446655440003'
const UUID_NOT_FOUND = '550e8400-e29b-41d4-a716-446655440999'
const UUID_DELETED = '550e8400-e29b-41d4-a716-446655440888'

/**
 * Helper to create a chainable mock for Supabase query builder
 */
function createMockChain(result: { data: unknown; error: unknown; count?: number }) {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
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

describe('POST /api/contractors/bulk-update', () => {
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
  // IDS MODE TESTS
  // =====================================================

  describe('IDs mode', () => {
    it('updates 3 contractors successfully', async () => {
      // Setup request body
      // @ts-expect-error - mocked global
      globalThis.readBody = vi.fn().mockResolvedValue({
        ids: [UUID1, UUID2, UUID3],
        status: 'active',
      })

      // Setup mock client with prefetch and update chains
      const prefetchChain = createMockChain({
        data: [
          { id: UUID1, status: 'pending', deleted_at: null },
          { id: UUID2, status: 'pending', deleted_at: null },
          { id: UUID3, status: 'pending', deleted_at: null },
        ],
        error: null,
      })

      const updateChain = createMockChain({
        data: [{ id: UUID1 }, { id: UUID2 }, { id: UUID3 }],
        error: null,
      })

      mockSupabaseClient = {
        from: vi.fn()
          .mockReturnValueOnce(prefetchChain)
          .mockReturnValueOnce(updateChain),
      }

      vi.mocked(serverSupabaseClient).mockResolvedValue(mockSupabaseClient as never)

      const result = await handler(mockEvent)

      expect(result).toEqual({
        success: true,
        data: {
          total: 3,
          succeeded: [UUID1, UUID2, UUID3],
          failed: [],
        },
      })
    })

    it('returns failed array for non-existent ID', async () => {
      // @ts-expect-error - mocked global
      globalThis.readBody = vi.fn().mockResolvedValue({
        ids: [UUID1, UUID_NOT_FOUND],
        status: 'active',
      })

      // Prefetch returns only UUID1 (UUID_NOT_FOUND doesn't exist)
      const prefetchChain = createMockChain({
        data: [{ id: UUID1, status: 'pending', deleted_at: null }],
        error: null,
      })

      const updateChain = createMockChain({
        data: [{ id: UUID1 }],
        error: null,
      })

      mockSupabaseClient = {
        from: vi.fn()
          .mockReturnValueOnce(prefetchChain)
          .mockReturnValueOnce(updateChain),
      }

      vi.mocked(serverSupabaseClient).mockResolvedValue(mockSupabaseClient as never)

      const result = await handler(mockEvent)

      expect(result).toEqual({
        success: true,
        data: {
          total: 2,
          succeeded: [UUID1],
          failed: [{ id: UUID_NOT_FOUND, reason: 'Contractor not found' }],
        },
      })
    })

    it('returns failed array for already-deleted ID', async () => {
      // @ts-expect-error - mocked global
      globalThis.readBody = vi.fn().mockResolvedValue({
        ids: [UUID1, UUID_DELETED],
        status: 'active',
      })

      // Prefetch returns both, but UUID_DELETED has deleted_at set
      const prefetchChain = createMockChain({
        data: [
          { id: UUID1, status: 'pending', deleted_at: null },
          { id: UUID_DELETED, status: 'pending', deleted_at: '2024-01-01T00:00:00Z' },
        ],
        error: null,
      })

      const updateChain = createMockChain({
        data: [{ id: UUID1 }],
        error: null,
      })

      mockSupabaseClient = {
        from: vi.fn()
          .mockReturnValueOnce(prefetchChain)
          .mockReturnValueOnce(updateChain),
      }

      vi.mocked(serverSupabaseClient).mockResolvedValue(mockSupabaseClient as never)

      const result = await handler(mockEvent)

      expect(result).toEqual({
        success: true,
        data: {
          total: 2,
          succeeded: [UUID1],
          failed: [{ id: UUID_DELETED, reason: 'Contractor already deleted' }],
        },
      })
    })

    it('rejects request with 501 IDs (exceeds 500 limit)', async () => {
      const tooManyIds = Array.from({ length: 501 }, (_, i) =>
        `550e8400-e29b-41d4-a716-${String(i).padStart(12, '0')}`
      )

      // @ts-expect-error - mocked global
      globalThis.readBody = vi.fn().mockResolvedValue({
        ids: tooManyIds,
        status: 'active',
      })

      mockSupabaseClient = { from: vi.fn() }
      vi.mocked(serverSupabaseClient).mockResolvedValue(mockSupabaseClient as never)

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: 400,
        message: 'Invalid request data',
      })
    })

    it('rejects empty ids array', async () => {
      // @ts-expect-error - mocked global
      globalThis.readBody = vi.fn().mockResolvedValue({
        ids: [],
        status: 'active',
      })

      mockSupabaseClient = { from: vi.fn() }
      vi.mocked(serverSupabaseClient).mockResolvedValue(mockSupabaseClient as never)

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: 400,
        message: 'Invalid request data',
      })
    })

    it('rejects request with both ids AND filters', async () => {
      // @ts-expect-error - mocked global
      globalThis.readBody = vi.fn().mockResolvedValue({
        ids: [UUID1],
        filters: { status: 'pending' },
        status: 'active',
      })

      mockSupabaseClient = { from: vi.fn() }
      vi.mocked(serverSupabaseClient).mockResolvedValue(mockSupabaseClient as never)

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: 400,
        message: 'Invalid request data',
      })
    })
  })

  // =====================================================
  // FILTERS MODE TESTS
  // =====================================================

  describe('Filters mode', () => {
    it('updates all matching contractors when count <= 500', async () => {
      // @ts-expect-error - mocked global
      globalThis.readBody = vi.fn().mockResolvedValue({
        filters: { status: 'pending' },
        status: 'active',
      })

      // Filters mode: count → get IDs → prefetch → update
      const countChain = createMockChain({ data: null, error: null, count: 3 })
      const idsChain = createMockChain({
        data: [{ id: UUID1 }, { id: UUID2 }, { id: UUID3 }],
        error: null,
      })
      const prefetchChain = createMockChain({
        data: [
          { id: UUID1, status: 'pending', deleted_at: null },
          { id: UUID2, status: 'pending', deleted_at: null },
          { id: UUID3, status: 'pending', deleted_at: null },
        ],
        error: null,
      })
      const updateChain = createMockChain({
        data: [{ id: UUID1 }, { id: UUID2 }, { id: UUID3 }],
        error: null,
      })

      mockSupabaseClient = {
        from: vi.fn()
          .mockReturnValueOnce(countChain)
          .mockReturnValueOnce(idsChain)
          .mockReturnValueOnce(prefetchChain)
          .mockReturnValueOnce(updateChain),
      }

      vi.mocked(serverSupabaseClient).mockResolvedValue(mockSupabaseClient as never)

      const result = await handler(mockEvent)

      expect(result).toEqual({
        success: true,
        data: {
          total: 3,
          succeeded: [UUID1, UUID2, UUID3],
          failed: [],
        },
      })

      // Verify applyContractorFilters was called
      expect(applyContractorFilters).toHaveBeenCalled()
    })

    it('rejects when matching count exceeds 500', async () => {
      // @ts-expect-error - mocked global
      globalThis.readBody = vi.fn().mockResolvedValue({
        filters: { status: 'pending' },
        status: 'active',
      })

      // Count returns 101
      const countChain = createMockChain({ data: null, error: null, count: 101 })

      mockSupabaseClient = {
        from: vi.fn().mockReturnValueOnce(countChain),
      }

      vi.mocked(serverSupabaseClient).mockResolvedValue(mockSupabaseClient as never)

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: 400,
        message: 'Too many contractors (101). Maximum 100 allowed.',
      })
    })

    it('returns 0 succeeded when filters match nothing', async () => {
      // @ts-expect-error - mocked global
      globalThis.readBody = vi.fn().mockResolvedValue({
        filters: { status: 'pending', search: 'nonexistent' },
        status: 'active',
      })

      // Count returns 0
      const countChain = createMockChain({ data: null, error: null, count: 0 })
      const idsChain = createMockChain({ data: [], error: null })

      mockSupabaseClient = {
        from: vi.fn()
          .mockReturnValueOnce(countChain)
          .mockReturnValueOnce(idsChain),
      }

      vi.mocked(serverSupabaseClient).mockResolvedValue(mockSupabaseClient as never)

      const result = await handler(mockEvent)

      expect(result).toEqual({
        success: true,
        data: {
          total: 0,
          succeeded: [],
          failed: [],
        },
      })
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
      globalThis.readBody = vi.fn().mockResolvedValue({
        ids: [UUID1],
        status: 'active',
      })

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: 403,
      })
    })
  })
})
