/**
 * Badge Request Handler Unit Tests
 *
 * Tests for processBadgeRequest() and extractOrigin() functions.
 * Validates token lookup, logging, dedup, and auto-verification.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { H3Event } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/supabase'

// Mock consola
vi.mock('consola', () => ({
  consola: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock clientIP utility
vi.mock('../../utils/clientIP', () => ({
  getClientIP: vi.fn(() => '192.168.1.100'),
}))

// Mock domain utility
vi.mock('../../utils/domain', () => ({
  extractRootDomain: vi.fn((url: string) => {
    if (url.includes('example.com')) return 'example.com'
    if (url.includes('contractor-site.com')) return 'contractor-site.com'
    if (url.includes('other-site.com')) return 'other-site.com'
    return null
  }),
  doDomainsMatch: vi.fn((a: string, b: string) => {
    const extractDomain = (url: string) => {
      if (url.includes('example.com')) return 'example.com'
      if (url.includes('contractor-site.com')) return 'contractor-site.com'
      return url
    }
    return extractDomain(a) === extractDomain(b)
  }),
}))

// Hoist stubs for Nuxt auto-imports
vi.hoisted(() => {
  // @ts-expect-error - stubbing Nuxt global
  globalThis.getHeader = vi.fn()
  // @ts-expect-error - stubbing Nuxt global
  globalThis.useRuntimeConfig = () => ({
    badgeOurDomains: ['costofconcrete.com', 'localhost'],
  })
})

// Import after mocks
import { processBadgeRequest, extractOrigin } from '../../utils/badgeRequest'

// Test data
const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000'
const INVALID_UUID = 'not-a-valid-uuid'
const CONTRACTOR_ID = 'contractor-123'

describe('extractOrigin', () => {
  it('extracts origin from full URL', () => {
    expect(extractOrigin('https://example.com/path/to/page?query=1')).toBe('https://example.com')
  })

  it('extracts origin from URL without path', () => {
    expect(extractOrigin('https://example.com')).toBe('https://example.com')
  })

  it('extracts origin from URL with port', () => {
    expect(extractOrigin('https://example.com:8080/api')).toBe('https://example.com:8080')
  })

  it('extracts origin from http URL', () => {
    expect(extractOrigin('http://example.com/page')).toBe('http://example.com')
  })

  it('returns null for invalid URL', () => {
    expect(extractOrigin('not a url')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(extractOrigin('')).toBeNull()
  })

  it('returns null for malformed URL', () => {
    expect(extractOrigin('://missing-protocol.com')).toBeNull()
  })
})

describe('processBadgeRequest', () => {
  let mockEvent: H3Event
  let mockAdminClient: {
    from: ReturnType<typeof vi.fn>
  }
  let mockSelect: ReturnType<typeof vi.fn>
  let mockEq: ReturnType<typeof vi.fn>
  let mockMaybeSingle: ReturnType<typeof vi.fn>
  let mockUpsert: ReturnType<typeof vi.fn>
  let mockUpdate: ReturnType<typeof vi.fn>
  let mockIs: ReturnType<typeof vi.fn>

  // Helper to set getHeader mock
  function setGetHeaderMock(impl: (event: unknown, name: string) => string | null) {
    // @ts-expect-error - accessing stubbed global
    globalThis.getHeader = vi.fn(impl)
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset header mock to default
    setGetHeaderMock((_event: unknown, name: string) => {
      if (name === 'referer' || name === 'referrer') return null
      if (name === 'user-agent') return 'TestAgent/1.0'
      return null
    })

    // Create mock event
    mockEvent = {
      node: {
        req: {
          headers: {},
        },
      },
    } as unknown as H3Event

    // Setup Supabase mock chain
    mockMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: CONTRACTOR_ID,
        embed_verified: false,
        embed_verified_at: null,
        website: 'https://contractor-site.com',
      },
      error: null,
    })

    mockEq = vi.fn().mockReturnThis()
    mockIs = vi.fn().mockResolvedValue({ error: null })

    mockSelect = vi.fn(() => ({
      eq: mockEq.mockReturnValue({
        maybeSingle: mockMaybeSingle,
      }),
    }))

    mockUpsert = vi.fn().mockResolvedValue({ error: null })
    mockUpdate = vi.fn(() => ({
      eq: mockEq.mockReturnValue({
        is: mockIs,
      }),
    }))

    mockAdminClient = {
      from: vi.fn((table: string) => {
        if (table === 'contractors') {
          return {
            select: mockSelect,
            update: mockUpdate,
          }
        }
        if (table === 'badge_embed_logs') {
          return {
            upsert: mockUpsert,
          }
        }
        return {}
      }),
    }
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('token validation', () => {
    it('returns valid: false for invalid UUID format', async () => {
      const result = await processBadgeRequest(
        mockEvent,
        INVALID_UUID,
        mockAdminClient as unknown as SupabaseClient<Database>
      )

      expect(result).toEqual({ valid: false })
      expect(mockAdminClient.from).not.toHaveBeenCalled()
    })

    it('returns valid: false for empty token', async () => {
      const result = await processBadgeRequest(
        mockEvent,
        '',
        mockAdminClient as unknown as SupabaseClient<Database>
      )

      expect(result).toEqual({ valid: false })
    })

    it('returns valid: false for token with extra characters', async () => {
      const result = await processBadgeRequest(
        mockEvent,
        VALID_UUID + 'extra',
        mockAdminClient as unknown as SupabaseClient<Database>
      )

      expect(result).toEqual({ valid: false })
    })

    it('accepts valid UUID format', async () => {
      const result = await processBadgeRequest(
        mockEvent,
        VALID_UUID,
        mockAdminClient as unknown as SupabaseClient<Database>
      )

      expect(result.valid).toBe(true)
      expect(mockAdminClient.from).toHaveBeenCalledWith('contractors')
    })

    it('accepts UUID with uppercase letters', async () => {
      const uppercaseUUID = VALID_UUID.toUpperCase()

      const result = await processBadgeRequest(
        mockEvent,
        uppercaseUUID,
        mockAdminClient as unknown as SupabaseClient<Database>
      )

      expect(result.valid).toBe(true)
    })
  })

  describe('contractor lookup', () => {
    it('returns valid: false when contractor not found', async () => {
      mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })

      const result = await processBadgeRequest(
        mockEvent,
        VALID_UUID,
        mockAdminClient as unknown as SupabaseClient<Database>
      )

      expect(result).toEqual({ valid: false })
    })

    it('returns valid: false on database error', async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' },
      })

      const result = await processBadgeRequest(
        mockEvent,
        VALID_UUID,
        mockAdminClient as unknown as SupabaseClient<Database>
      )

      expect(result).toEqual({ valid: false })
    })

    it('returns valid: true with contractorId when contractor found', async () => {
      const result = await processBadgeRequest(
        mockEvent,
        VALID_UUID,
        mockAdminClient as unknown as SupabaseClient<Database>
      )

      expect(result).toEqual({ valid: true, contractorId: CONTRACTOR_ID })
    })
  })

  describe('logging behavior', () => {
    it('logs badge request with client IP and user agent', async () => {
      await processBadgeRequest(
        mockEvent,
        VALID_UUID,
        mockAdminClient as unknown as SupabaseClient<Database>
      )

      // Wait for async logging
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(mockAdminClient.from).toHaveBeenCalledWith('badge_embed_logs')
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          contractor_id: CONTRACTOR_ID,
          request_ip: '192.168.1.100',
          user_agent: 'TestAgent/1.0',
        }),
        expect.objectContaining({
          onConflict: 'contractor_id,request_ip,hour_bucket',
          ignoreDuplicates: true,
        })
      )
    })

    it('logs referrer origin when present', async () => {
      setGetHeaderMock((_event: unknown, name: string) => {
        if (name === 'referer') return 'https://external-site.com/page'
        if (name === 'user-agent') return 'TestAgent/1.0'
        return null
      })

      await processBadgeRequest(
        mockEvent,
        VALID_UUID,
        mockAdminClient as unknown as SupabaseClient<Database>
      )

      await new Promise(resolve => setTimeout(resolve, 10))

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          referrer_origin: 'https://external-site.com',
          referrer_url: 'https://external-site.com/page',
        }),
        expect.any(Object)
      )
    })

    it('uses hour bucket for dedup grouping', async () => {
      await processBadgeRequest(
        mockEvent,
        VALID_UUID,
        mockAdminClient as unknown as SupabaseClient<Database>
      )

      await new Promise(resolve => setTimeout(resolve, 10))

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          hour_bucket: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:00:00\.000Z$/),
        }),
        expect.any(Object)
      )
    })

    it('returns result even if logging fails', async () => {
      mockUpsert.mockResolvedValueOnce({
        error: { message: 'Log insert failed' },
      })

      const result = await processBadgeRequest(
        mockEvent,
        VALID_UUID,
        mockAdminClient as unknown as SupabaseClient<Database>
      )

      // Result should still be valid
      expect(result).toEqual({ valid: true, contractorId: CONTRACTOR_ID })
    })
  })

  describe('auto-verification', () => {
    it('does not verify when contractor is already verified', async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: {
          id: CONTRACTOR_ID,
          embed_verified: true, // Already verified
          embed_verified_at: '2026-01-01T00:00:00Z',
          website: 'https://contractor-site.com',
        },
        error: null,
      })

      setGetHeaderMock((_event: unknown, name: string) => {
        if (name === 'referer') return 'https://contractor-site.com/page'
        return null
      })

      await processBadgeRequest(
        mockEvent,
        VALID_UUID,
        mockAdminClient as unknown as SupabaseClient<Database>
      )

      // Update should not be called
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('does not verify when referrer is our own domain', async () => {
      setGetHeaderMock((_event: unknown, name: string) => {
        if (name === 'referer') return 'https://costofconcrete.com/contractors/123'
        return null
      })

      await processBadgeRequest(
        mockEvent,
        VALID_UUID,
        mockAdminClient as unknown as SupabaseClient<Database>
      )

      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('does not verify when no referrer', async () => {
      await processBadgeRequest(
        mockEvent,
        VALID_UUID,
        mockAdminClient as unknown as SupabaseClient<Database>
      )

      expect(mockUpdate).not.toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('handles referrer header spelled as referer', async () => {
      setGetHeaderMock((_event: unknown, name: string) => {
        if (name === 'referer') return 'https://external.com'
        return null
      })

      await processBadgeRequest(
        mockEvent,
        VALID_UUID,
        mockAdminClient as unknown as SupabaseClient<Database>
      )

      await new Promise(resolve => setTimeout(resolve, 10))

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          referrer_url: 'https://external.com',
        }),
        expect.any(Object)
      )
    })

    it('handles malformed referrer URL gracefully', async () => {
      setGetHeaderMock((_event: unknown, name: string) => {
        if (name === 'referer') return 'not-a-valid-url'
        return null
      })

      const result = await processBadgeRequest(
        mockEvent,
        VALID_UUID,
        mockAdminClient as unknown as SupabaseClient<Database>
      )

      // Should still return valid result
      expect(result.valid).toBe(true)
    })

    it('handles contractor with no website', async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: {
          id: CONTRACTOR_ID,
          embed_verified: false,
          embed_verified_at: null,
          website: null, // No website
        },
        error: null,
      })

      setGetHeaderMock((_event: unknown, name: string) => {
        if (name === 'referer') return 'https://any-external-site.com'
        return null
      })

      const result = await processBadgeRequest(
        mockEvent,
        VALID_UUID,
        mockAdminClient as unknown as SupabaseClient<Database>
      )

      expect(result.valid).toBe(true)
    })
  })
})
