/**
 * POST /api/contractors/bulk-delete
 *
 * Tests for bulk soft delete endpoint.
 * Supports two modes: IDs mode (specific contractors) or filters mode (matching criteria).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { H3Event } from 'h3'

// Hoist stubs for Nuxt auto-imports
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

// Mock Supabase client
vi.mock('#supabase/server', () => ({
  serverSupabaseClient: vi.fn(),
}))

// Mock auth utility
vi.mock('../../../utils/auth', () => ({
  requireAdmin: vi.fn(),
}))

import { serverSupabaseClient } from '#supabase/server'
import { requireAdmin } from '../../../utils/auth'
import handler from '../../../api/contractors/bulk-delete.post'

// =====================================================
// TEST UTILITIES
// =====================================================

const VALID_UUID_1 = '11111111-1111-4111-8111-111111111111'
const VALID_UUID_2 = '22222222-2222-4222-8222-222222222222'
const VALID_UUID_3 = '33333333-3333-4333-8333-333333333333'
const NON_EXISTENT_UUID = '99999999-9999-4999-8999-999999999999'
const ALREADY_DELETED_UUID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

function createMockEvent(): H3Event {
  return {} as H3Event
}

function createMockSupabaseClient(options: {
  selectData?: Array<{ id: string; deleted_at: string | null }> | null
  selectError?: { message: string; code?: string } | null
  updateData?: Array<{ id: string }> | null
  updateError?: { message: string; code?: string } | null
  countData?: number
  countError?: { message: string; code?: string } | null
}) {
  const {
    selectData = null,
    selectError = null,
    updateData = null,
    updateError = null,
    countData = 0,
    countError = null,
  } = options

  // Track query chain state
  let currentSelectData = selectData
  let currentUpdateData = updateData
  let queryCallCount = 0

  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    then: vi.fn((resolve) => {
      queryCallCount++
      // First query is typically the pre-fetch select
      if (queryCallCount === 1 && currentSelectData !== null) {
        resolve({ data: currentSelectData, error: selectError })
      } else if (currentUpdateData !== null) {
        resolve({ data: currentUpdateData, error: updateError })
      } else {
        resolve({ data: [], error: selectError || updateError })
      }
    }),
  }

  // For count queries
  const mockCountQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    then: vi.fn((resolve) => {
      resolve({ count: countData, error: countError })
    }),
  }

  return {
    from: vi.fn().mockReturnValue(mockQuery),
    _mockQuery: mockQuery,
    _mockCountQuery: mockCountQuery,
    _setSelectData: (data: typeof selectData) => { currentSelectData = data },
    _setUpdateData: (data: typeof updateData) => { currentUpdateData = data },
    _resetCallCount: () => { queryCallCount = 0 },
  }
}

// More sophisticated mock for multi-query scenarios
function createMultiQueryMockClient(queryResponses: Array<{
  type: 'select' | 'update' | 'count'
  data?: unknown
  error?: { message: string; code?: string } | null
  count?: number
}>) {
  let queryIndex = 0

  const createChainableQuery = () => {
    const query: Record<string, unknown> = {}
    const chainMethods = ['select', 'in', 'is', 'eq', 'contains', 'ilike', 'update']

    chainMethods.forEach(method => {
      query[method] = vi.fn().mockImplementation(() => query)
    })

    // Handle promise resolution
    query.then = vi.fn((resolve) => {
      const response = queryResponses[queryIndex] || { data: [], error: null }
      queryIndex++

      if (response.type === 'count') {
        resolve({ count: response.count ?? 0, data: null, error: response.error ?? null })
      } else {
        resolve({ data: response.data ?? [], error: response.error ?? null })
      }
    })

    return query
  }

  return {
    from: vi.fn().mockImplementation(() => createChainableQuery()),
    _resetQueryIndex: () => { queryIndex = 0 },
  }
}

// =====================================================
// TEST SUITE
// =====================================================

describe('POST /api/contractors/bulk-delete', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAdmin).mockResolvedValue('admin-user-id')
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

      const mockClient = createMockSupabaseClient({})
      vi.mocked(serverSupabaseClient).mockResolvedValue(mockClient as never)

      // @ts-expect-error - readBody is mocked globally
      globalThis.readBody = vi.fn().mockResolvedValue({
        ids: [VALID_UUID_1],
      })

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

      const mockClient = createMockSupabaseClient({})
      vi.mocked(serverSupabaseClient).mockResolvedValue(mockClient as never)

      // @ts-expect-error - readBody is mocked globally
      globalThis.readBody = vi.fn().mockResolvedValue({
        ids: [VALID_UUID_1],
      })

      const event = createMockEvent()

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 401,
        message: 'Authentication required. Please log in.',
      })
    })
  })

  // =====================================================
  // VALIDATION TESTS
  // =====================================================

  describe('validation', () => {
    it('should return 400 when both ids AND filters are provided', async () => {
      const mockClient = createMockSupabaseClient({})
      vi.mocked(serverSupabaseClient).mockResolvedValue(mockClient as never)

      // @ts-expect-error - readBody is mocked globally
      globalThis.readBody = vi.fn().mockResolvedValue({
        ids: [VALID_UUID_1],
        filters: { status: 'pending' },
      })

      const event = createMockEvent()

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 400,
        message: 'Invalid request data',
      })
    })

    it('should return 400 when neither ids nor filters are provided', async () => {
      const mockClient = createMockSupabaseClient({})
      vi.mocked(serverSupabaseClient).mockResolvedValue(mockClient as never)

      // @ts-expect-error - readBody is mocked globally
      globalThis.readBody = vi.fn().mockResolvedValue({})

      const event = createMockEvent()

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 400,
        message: 'Invalid request data',
      })
    })

    it('should return 400 when ids array exceeds 500 items', async () => {
      const mockClient = createMockSupabaseClient({})
      vi.mocked(serverSupabaseClient).mockResolvedValue(mockClient as never)

      // Generate 501 UUIDs
      const tooManyIds = Array.from({ length: 501 }, (_, i) =>
        `${String(i).padStart(8, '0')}-0000-0000-0000-000000000000`
      )

      // @ts-expect-error - readBody is mocked globally
      globalThis.readBody = vi.fn().mockResolvedValue({
        ids: tooManyIds,
      })

      const event = createMockEvent()

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 400,
        message: 'Invalid request data',
      })
    })

    it('should return 400 for invalid UUID format in ids', async () => {
      const mockClient = createMockSupabaseClient({})
      vi.mocked(serverSupabaseClient).mockResolvedValue(mockClient as never)

      // @ts-expect-error - readBody is mocked globally
      globalThis.readBody = vi.fn().mockResolvedValue({
        ids: ['not-a-valid-uuid'],
      })

      const event = createMockEvent()

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 400,
        message: 'Invalid request data',
      })
    })
  })

  // =====================================================
  // IDS MODE TESTS
  // =====================================================

  describe('IDs mode', () => {
    it('should soft delete 3 valid contractors successfully', async () => {
      const mockClient = createMultiQueryMockClient([
        // First query: pre-fetch to check existence and deleted_at status
        {
          type: 'select',
          data: [
            { id: VALID_UUID_1, deleted_at: null },
            { id: VALID_UUID_2, deleted_at: null },
            { id: VALID_UUID_3, deleted_at: null },
          ],
        },
        // Second query: bulk update (soft delete)
        {
          type: 'update',
          data: [
            { id: VALID_UUID_1 },
            { id: VALID_UUID_2 },
            { id: VALID_UUID_3 },
          ],
        },
      ])

      vi.mocked(serverSupabaseClient).mockResolvedValue(mockClient as never)

      // @ts-expect-error - readBody is mocked globally
      globalThis.readBody = vi.fn().mockResolvedValue({
        ids: [VALID_UUID_1, VALID_UUID_2, VALID_UUID_3],
      })

      const event = createMockEvent()
      const result = await handler(event)

      expect(result).toEqual({
        success: true,
        data: {
          total: 3,
          succeeded: [VALID_UUID_1, VALID_UUID_2, VALID_UUID_3],
          failed: [],
        },
      })
    })

    it('should report non-existent ID in failed array with reason "Contractor not found"', async () => {
      const mockClient = createMultiQueryMockClient([
        // Pre-fetch: only 2 of 3 IDs exist
        {
          type: 'select',
          data: [
            { id: VALID_UUID_1, deleted_at: null },
            { id: VALID_UUID_2, deleted_at: null },
            // NON_EXISTENT_UUID not returned
          ],
        },
        // Bulk update for the 2 valid ones
        {
          type: 'update',
          data: [
            { id: VALID_UUID_1 },
            { id: VALID_UUID_2 },
          ],
        },
      ])

      vi.mocked(serverSupabaseClient).mockResolvedValue(mockClient as never)

      // @ts-expect-error - readBody is mocked globally
      globalThis.readBody = vi.fn().mockResolvedValue({
        ids: [VALID_UUID_1, VALID_UUID_2, NON_EXISTENT_UUID],
      })

      const event = createMockEvent()
      const result = await handler(event)

      expect(result).toEqual({
        success: true,
        data: {
          total: 3,
          succeeded: [VALID_UUID_1, VALID_UUID_2],
          failed: [{ id: NON_EXISTENT_UUID, reason: 'Contractor not found' }],
        },
      })
    })

    it('should report already-deleted ID in failed array with reason "Contractor already deleted"', async () => {
      const mockClient = createMultiQueryMockClient([
        // Pre-fetch: one contractor already has deleted_at set
        {
          type: 'select',
          data: [
            { id: VALID_UUID_1, deleted_at: null },
            { id: ALREADY_DELETED_UUID, deleted_at: '2024-01-01T00:00:00.000Z' },
          ],
        },
        // Bulk update for the 1 valid one
        {
          type: 'update',
          data: [
            { id: VALID_UUID_1 },
          ],
        },
      ])

      vi.mocked(serverSupabaseClient).mockResolvedValue(mockClient as never)

      // @ts-expect-error - readBody is mocked globally
      globalThis.readBody = vi.fn().mockResolvedValue({
        ids: [VALID_UUID_1, ALREADY_DELETED_UUID],
      })

      const event = createMockEvent()
      const result = await handler(event)

      expect(result).toEqual({
        success: true,
        data: {
          total: 2,
          succeeded: [VALID_UUID_1],
          failed: [{ id: ALREADY_DELETED_UUID, reason: 'Contractor already deleted' }],
        },
      })
    })

    it('should handle mixed scenario: valid, non-existent, and already-deleted IDs', async () => {
      const mockClient = createMultiQueryMockClient([
        // Pre-fetch: returns existing contractors with their deleted_at status
        {
          type: 'select',
          data: [
            { id: VALID_UUID_1, deleted_at: null },
            { id: ALREADY_DELETED_UUID, deleted_at: '2024-01-01T00:00:00.000Z' },
            // NON_EXISTENT_UUID not returned
          ],
        },
        // Bulk update for the 1 valid one
        {
          type: 'update',
          data: [
            { id: VALID_UUID_1 },
          ],
        },
      ])

      vi.mocked(serverSupabaseClient).mockResolvedValue(mockClient as never)

      // @ts-expect-error - readBody is mocked globally
      globalThis.readBody = vi.fn().mockResolvedValue({
        ids: [VALID_UUID_1, NON_EXISTENT_UUID, ALREADY_DELETED_UUID],
      })

      const event = createMockEvent()
      const result = await handler(event)

      expect(result).toEqual({
        success: true,
        data: {
          total: 3,
          succeeded: [VALID_UUID_1],
          failed: [
            { id: NON_EXISTENT_UUID, reason: 'Contractor not found' },
            { id: ALREADY_DELETED_UUID, reason: 'Contractor already deleted' },
          ],
        },
      })
    })
  })

  // =====================================================
  // FILTERS MODE TESTS
  // =====================================================

  describe('filters mode', () => {
    it('should soft delete all matching contractors when count <= 500', async () => {
      const mockClient = createMultiQueryMockClient([
        // First query: count matching contractors
        {
          type: 'count',
          count: 3,
        },
        // Second query: get IDs of matching contractors
        {
          type: 'select',
          data: [
            { id: VALID_UUID_1 },
            { id: VALID_UUID_2 },
            { id: VALID_UUID_3 },
          ],
        },
        // Third query: pre-fetch to check deleted_at status
        {
          type: 'select',
          data: [
            { id: VALID_UUID_1, deleted_at: null },
            { id: VALID_UUID_2, deleted_at: null },
            { id: VALID_UUID_3, deleted_at: null },
          ],
        },
        // Fourth query: bulk update (soft delete)
        {
          type: 'update',
          data: [
            { id: VALID_UUID_1 },
            { id: VALID_UUID_2 },
            { id: VALID_UUID_3 },
          ],
        },
      ])

      vi.mocked(serverSupabaseClient).mockResolvedValue(mockClient as never)

      // @ts-expect-error - readBody is mocked globally
      globalThis.readBody = vi.fn().mockResolvedValue({
        filters: { status: 'pending' },
      })

      const event = createMockEvent()
      const result = await handler(event)

      expect(result).toEqual({
        success: true,
        data: {
          total: 3,
          succeeded: [VALID_UUID_1, VALID_UUID_2, VALID_UUID_3],
          failed: [],
        },
      })
    })

    it('should return 400 error when matching count > 100', async () => {
      const mockClient = createMultiQueryMockClient([
        // Count query returns 101
        {
          type: 'count',
          count: 101,
        },
      ])

      vi.mocked(serverSupabaseClient).mockResolvedValue(mockClient as never)

      // @ts-expect-error - readBody is mocked globally
      globalThis.readBody = vi.fn().mockResolvedValue({
        filters: { status: 'pending' },
      })

      const event = createMockEvent()

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 400,
        message: 'Too many contractors (101). Maximum 100 allowed.',
      })
    })

    it('should apply all filter types correctly', async () => {
      const mockClient = createMultiQueryMockClient([
        // Count query
        {
          type: 'count',
          count: 2,
        },
        // Get IDs
        {
          type: 'select',
          data: [
            { id: VALID_UUID_1 },
            { id: VALID_UUID_2 },
          ],
        },
        // Pre-fetch
        {
          type: 'select',
          data: [
            { id: VALID_UUID_1, deleted_at: null },
            { id: VALID_UUID_2, deleted_at: null },
          ],
        },
        // Bulk update
        {
          type: 'update',
          data: [
            { id: VALID_UUID_1 },
            { id: VALID_UUID_2 },
          ],
        },
      ])

      vi.mocked(serverSupabaseClient).mockResolvedValue(mockClient as never)

      // @ts-expect-error - readBody is mocked globally
      globalThis.readBody = vi.fn().mockResolvedValue({
        filters: {
          cityId: '44444444-4444-4444-8444-444444444444',
          status: 'active',
          category: 'concrete-contractors',
          search: 'test company',
        },
      })

      const event = createMockEvent()
      const result = await handler(event)

      expect(result.success).toBe(true)
      expect(result.data.succeeded).toHaveLength(2)
    })
  })

  // =====================================================
  // ERROR HANDLING TESTS
  // =====================================================

  describe('error handling', () => {
    it('should handle database error during pre-fetch', async () => {
      const mockClient = createMultiQueryMockClient([
        {
          type: 'select',
          error: { message: 'Database connection failed' },
        },
      ])

      vi.mocked(serverSupabaseClient).mockResolvedValue(mockClient as never)

      // @ts-expect-error - readBody is mocked globally
      globalThis.readBody = vi.fn().mockResolvedValue({
        ids: [VALID_UUID_1],
      })

      const event = createMockEvent()

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 500,
      })
    })

    it('should handle database error during update', async () => {
      const mockClient = createMultiQueryMockClient([
        // Pre-fetch succeeds
        {
          type: 'select',
          data: [{ id: VALID_UUID_1, deleted_at: null }],
        },
        // Update fails
        {
          type: 'update',
          error: { message: 'Update failed' },
        },
      ])

      vi.mocked(serverSupabaseClient).mockResolvedValue(mockClient as never)

      // @ts-expect-error - readBody is mocked globally
      globalThis.readBody = vi.fn().mockResolvedValue({
        ids: [VALID_UUID_1],
      })

      const event = createMockEvent()

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 500,
      })
    })
  })
})
