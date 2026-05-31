/**
 * PNG Badge Endpoint Integration Tests
 *
 * Tests for GET /api/public/badges/[token].png
 * Verifies correct Content-Type, security headers, and PNG output.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { H3Event } from 'h3'

// Shared test state - using object to allow reference from stubs
const testState = {
  responseHeaders: new Map<string, string>(),
}

// Hoist stubs to ensure they run before module imports
vi.hoisted(() => {
  // @ts-expect-error - stubbing global
  globalThis.defineEventHandler = (handler: unknown) => handler
  // @ts-expect-error - stubbing global
  globalThis.getRouterParam = (event: H3Event, name: string) => {
    return (event.context?.params as Record<string, string>)?.[name] || ''
  }
  // @ts-expect-error - stubbing global
  globalThis.setHeader = () => {
    // Placeholder - overridden after imports to use testState
  }
  // @ts-expect-error - stubbing global
  globalThis.getHeader = (event: H3Event, name: string) => {
    return (event.node?.req?.headers as Record<string, string>)?.[name.toLowerCase()]
  }
  // @ts-expect-error - stubbing global
  globalThis.useRuntimeConfig = () => ({
    badgeOurDomains: ['costofconcrete.com', 'www.costofconcrete.com', 'localhost'],
  })
})

// Mock #supabase/server
vi.mock('#supabase/server', () => ({
  serverSupabaseServiceRole: vi.fn(),
}))

// Mock badgeRequest
vi.mock('../../../utils/badgeRequest', () => ({
  processBadgeRequest: vi.fn(),
}))

// Mock badgeAssets
vi.mock('../../../utils/badgeAssets', () => ({
  loadBadgePng: vi.fn(),
}))

// Import after mocks
import { serverSupabaseServiceRole } from '#supabase/server'
import { processBadgeRequest } from '../../../utils/badgeRequest'
import { loadBadgePng } from '../../../utils/badgeAssets'

// Import the handler we're testing
import handler from '../../../api/public/badges/[token].png.get'

// Now override setHeader to use testState (after imports complete)
// @ts-expect-error - stubbing global
globalThis.setHeader = (_event: H3Event, name: string, value: string) => {
  testState.responseHeaders.set(name.toLowerCase(), value)
}

// PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
const PNG_MAGIC_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

// Create a minimal PNG buffer for testing (magic bytes + minimal IHDR)
function createTestPng(): Buffer {
  // PNG signature + minimal structure for testing
  return Buffer.concat([
    PNG_MAGIC_BYTES,
    // IHDR chunk (minimal, just for testing)
    Buffer.from([0x00, 0x00, 0x00, 0x0d]), // chunk length
    Buffer.from('IHDR'),
    Buffer.alloc(13), // IHDR data
    Buffer.from([0x00, 0x00, 0x00, 0x00]), // CRC
  ])
}

// Test UUIDs
const VALID_TOKEN = '550e8400-e29b-41d4-a716-446655440000'
const INVALID_TOKEN = 'not-a-valid-uuid'

describe('PNG Badge Endpoint', () => {
  let mockEvent: H3Event
  let mockAdminClient: Record<string, unknown>
  let verifiedPng: Buffer
  let placeholderPng: Buffer

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset response headers
    testState.responseHeaders.clear()

    // Create test PNGs
    verifiedPng = createTestPng()
    placeholderPng = createTestPng()

    // Create mock event
    mockEvent = {
      context: {
        params: { token: VALID_TOKEN },
      },
      node: {
        req: {
          headers: {},
        },
        res: {},
      },
    } as unknown as H3Event

    // Mock admin client
    mockAdminClient = {}
    vi.mocked(serverSupabaseServiceRole).mockReturnValue(mockAdminClient as any)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Valid token', () => {
    beforeEach(() => {
      vi.mocked(processBadgeRequest).mockResolvedValue({
        valid: true,
        contractorId: 'contractor-123',
      })
      vi.mocked(loadBadgePng).mockResolvedValue(verifiedPng)
    })

    it('returns verified PNG for valid token', async () => {
      const result = await handler(mockEvent)

      expect(result).toBeInstanceOf(Buffer)
      expect(result).toEqual(verifiedPng)
      expect(loadBadgePng).toHaveBeenCalledWith('verified')
    })

    it('sets Content-Type to image/png', async () => {
      await handler(mockEvent)

      expect(testState.responseHeaders.get('content-type')).toBe('image/png')
    })

    it('sets security headers', async () => {
      await handler(mockEvent)

      expect(testState.responseHeaders.get('x-content-type-options')).toBe('nosniff')
    })

    it('sets cache headers', async () => {
      await handler(mockEvent)

      expect(testState.responseHeaders.get('cache-control')).toBe('public, max-age=300')
    })

    it('response starts with PNG magic bytes', async () => {
      const result = await handler(mockEvent)

      expect(result).toBeInstanceOf(Buffer)
      const buffer = result as Buffer
      expect(Buffer.from(buffer.subarray(0, 8))).toEqual(PNG_MAGIC_BYTES)
    })

    it('calls processBadgeRequest with correct parameters', async () => {
      await handler(mockEvent)

      expect(processBadgeRequest).toHaveBeenCalledWith(
        mockEvent,
        VALID_TOKEN,
        mockAdminClient
      )
    })
  })

  describe('Invalid token', () => {
    beforeEach(() => {
      vi.mocked(processBadgeRequest).mockResolvedValue({
        valid: false,
      })
      vi.mocked(loadBadgePng).mockResolvedValue(placeholderPng)
    })

    it('returns placeholder PNG for invalid token', async () => {
      mockEvent.context.params = { token: INVALID_TOKEN }

      const result = await handler(mockEvent)

      expect(result).toBeInstanceOf(Buffer)
      expect(result).toEqual(placeholderPng)
      expect(loadBadgePng).toHaveBeenCalledWith('placeholder')
    })

    it('returns placeholder PNG when contractor not found', async () => {
      const result = await handler(mockEvent)

      expect(result).toBeInstanceOf(Buffer)
      expect(loadBadgePng).toHaveBeenCalledWith('placeholder')
    })

    it('still sets correct Content-Type for placeholder', async () => {
      await handler(mockEvent)

      expect(testState.responseHeaders.get('content-type')).toBe('image/png')
    })

    it('still sets security headers for placeholder', async () => {
      await handler(mockEvent)

      expect(testState.responseHeaders.get('x-content-type-options')).toBe('nosniff')
    })

    it('placeholder response also has PNG magic bytes', async () => {
      const result = await handler(mockEvent)

      expect(result).toBeInstanceOf(Buffer)
      const buffer = result as Buffer
      expect(Buffer.from(buffer.subarray(0, 8))).toEqual(PNG_MAGIC_BYTES)
    })
  })

  describe('Token parsing', () => {
    it('strips .png suffix from token parameter', async () => {
      mockEvent.context.params = { token: `${VALID_TOKEN}.png` }
      vi.mocked(processBadgeRequest).mockResolvedValue({ valid: true })
      vi.mocked(loadBadgePng).mockResolvedValue(verifiedPng)

      await handler(mockEvent)

      expect(processBadgeRequest).toHaveBeenCalledWith(
        mockEvent,
        VALID_TOKEN, // Should be stripped of .png
        mockAdminClient
      )
    })

    it('handles empty token gracefully', async () => {
      mockEvent.context.params = { token: '' }
      vi.mocked(processBadgeRequest).mockResolvedValue({ valid: false })
      vi.mocked(loadBadgePng).mockResolvedValue(placeholderPng)

      const result = await handler(mockEvent)

      expect(result).toEqual(placeholderPng)
      expect(loadBadgePng).toHaveBeenCalledWith('placeholder')
    })

    it('handles missing token gracefully', async () => {
      mockEvent.context.params = {}
      vi.mocked(processBadgeRequest).mockResolvedValue({ valid: false })
      vi.mocked(loadBadgePng).mockResolvedValue(placeholderPng)

      const result = await handler(mockEvent)

      expect(result).toEqual(placeholderPng)
      expect(processBadgeRequest).toHaveBeenCalledWith(
        mockEvent,
        '', // Empty string when token is missing
        mockAdminClient
      )
    })
  })

  describe('Error handling', () => {
    it('propagates errors from processBadgeRequest', async () => {
      vi.mocked(processBadgeRequest).mockRejectedValue(new Error('Database error'))
      vi.mocked(loadBadgePng).mockResolvedValue(placeholderPng)

      // The handler doesn't have try/catch so errors propagate
      await expect(handler(mockEvent)).rejects.toThrow('Database error')
    })
  })
})
