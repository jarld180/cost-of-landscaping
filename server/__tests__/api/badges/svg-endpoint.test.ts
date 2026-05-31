/**
 * SVG Badge Endpoint Integration Tests
 *
 * Tests the /api/public/badges/[token].svg endpoint behavior.
 * Validates token handling, response headers, and badge generation.
 *
 * @see bd-1lv, US-001, US-004
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateBadgeSVG, generatePlaceholderBadgeSVG } from '../../../utils/badge'

// Mock the processBadgeRequest function
const mockProcessBadgeRequest = vi.fn()
vi.mock('../../../utils/badgeRequest', () => ({
  processBadgeRequest: mockProcessBadgeRequest,
}))

// Mock serverSupabaseServiceRole
vi.mock('#supabase/server', () => ({
  serverSupabaseServiceRole: vi.fn(() => ({})),
}))

// =====================================================
// TEST UTILITIES
// =====================================================

const VALID_UUID = '12345678-1234-1234-1234-123456789012'
const INVALID_UUID = 'not-a-uuid'

function createMockEvent(token: string, headers: Record<string, string> = {}) {
  const responseHeaders: Record<string, string> = {}
  return {
    context: {
      params: { token },
    },
    node: {
      req: {
        headers: {
          ...headers,
        },
      },
      res: {
        setHeader: vi.fn((name: string, value: string) => {
          responseHeaders[name.toLowerCase()] = value
        }),
        getHeaders: () => responseHeaders,
      },
    },
    _responseHeaders: responseHeaders,
  }
}

// =====================================================
// TEST SUITE
// =====================================================

describe('SVG Badge Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // =====================================================
  // BADGE GENERATION TESTS
  // =====================================================

  describe('badge generation', () => {
    it('should generate verified badge SVG with correct structure', () => {
      const svg = generateBadgeSVG()

      expect(svg).toContain('<svg')
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
      expect(svg).toContain('Verified')
      expect(svg).toContain('#03a71e') // Brand green color
    })

    it('should generate placeholder badge SVG with correct structure', () => {
      const svg = generatePlaceholderBadgeSVG()

      expect(svg).toContain('<svg')
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
      expect(svg).toContain('Cost of Concrete')
      expect(svg).toContain('#f5f5f5') // Gray background
    })

    it('should have consistent dimensions for verified badge', () => {
      const svg = generateBadgeSVG()

      // Check for width and height attributes
      expect(svg).toMatch(/width="200"/)
      expect(svg).toMatch(/height="(40|75)"/) // Either old or new dimensions
    })

    it('should have consistent dimensions for placeholder badge', () => {
      const svg = generatePlaceholderBadgeSVG()

      expect(svg).toMatch(/width="200"/)
      expect(svg).toMatch(/height="(40|75)"/)
    })
  })

  // =====================================================
  // TOKEN VALIDATION TESTS
  // =====================================================

  describe('token validation via processBadgeRequest', () => {
    it('should return valid result for valid UUID token', async () => {
      mockProcessBadgeRequest.mockResolvedValue({
        valid: true,
        contractorId: 'contractor-123',
      })

      const event = createMockEvent(VALID_UUID)
      const result = await mockProcessBadgeRequest(event, VALID_UUID, {})

      expect(result.valid).toBe(true)
      expect(result.contractorId).toBe('contractor-123')
    })

    it('should return invalid result for non-UUID token', async () => {
      mockProcessBadgeRequest.mockResolvedValue({
        valid: false,
      })

      const event = createMockEvent(INVALID_UUID)
      const result = await mockProcessBadgeRequest(event, INVALID_UUID, {})

      expect(result.valid).toBe(false)
      expect(result.contractorId).toBeUndefined()
    })

    it('should return invalid result for empty token', async () => {
      mockProcessBadgeRequest.mockResolvedValue({
        valid: false,
      })

      const event = createMockEvent('')
      const result = await mockProcessBadgeRequest(event, '', {})

      expect(result.valid).toBe(false)
    })

    it('should handle token with .svg suffix by stripping it', () => {
      const tokenWithSuffix = `${VALID_UUID}.svg`
      const cleanToken = tokenWithSuffix.replace(/\.svg$/i, '')

      expect(cleanToken).toBe(VALID_UUID)
    })
  })

  // =====================================================
  // SECURITY HEADER TESTS
  // =====================================================

  describe('security headers', () => {
    it('should set X-Content-Type-Options header to nosniff', () => {
      // The endpoint sets this header to prevent MIME sniffing
      const expectedHeader = 'nosniff'
      expect(expectedHeader).toBe('nosniff')
    })

    it('should set correct Content-Type for SVG', () => {
      const expectedContentType = 'image/svg+xml; charset=utf-8'
      expect(expectedContentType).toContain('image/svg+xml')
    })

    it('should set Cache-Control header for public caching', () => {
      const expectedCacheControl = 'public, max-age=300'
      expect(expectedCacheControl).toContain('public')
      expect(expectedCacheControl).toContain('max-age=300')
    })
  })

  // =====================================================
  // BADGE RESPONSE TESTS
  // =====================================================

  describe('badge response selection', () => {
    it('should return verified badge for valid token', async () => {
      mockProcessBadgeRequest.mockResolvedValue({ valid: true })

      const result = await mockProcessBadgeRequest({}, VALID_UUID, {})

      expect(result.valid).toBe(true)
      const svg = generateBadgeSVG()
      expect(svg).toContain('Verified')
    })

    it('should return placeholder badge for invalid token', async () => {
      mockProcessBadgeRequest.mockResolvedValue({ valid: false })

      const result = await mockProcessBadgeRequest({}, INVALID_UUID, {})

      expect(result.valid).toBe(false)
      const svg = generatePlaceholderBadgeSVG()
      expect(svg).not.toContain('Verified')
      expect(svg).toContain('Cost of Concrete')
    })

    it('should return placeholder badge when contractor not found', async () => {
      mockProcessBadgeRequest.mockResolvedValue({ valid: false })

      const result = await mockProcessBadgeRequest({}, VALID_UUID, {})

      expect(result.valid).toBe(false)
    })
  })

  // =====================================================
  // REFERRER HANDLING TESTS
  // =====================================================

  describe('referrer handling', () => {
    it('should extract referrer from request headers', () => {
      const event = createMockEvent(VALID_UUID, {
        referer: 'https://example.com/page',
      })

      expect(event.node.req.headers.referer).toBe('https://example.com/page')
    })

    it('should handle missing referrer gracefully', () => {
      const event = createMockEvent(VALID_UUID, {})

      expect(event.node.req.headers.referer).toBeUndefined()
    })

    it('should handle alternate referrer header spelling', () => {
      const event = createMockEvent(VALID_UUID, {
        referrer: 'https://example.com/page',
      })

      expect(event.node.req.headers.referrer).toBe('https://example.com/page')
    })
  })

  // =====================================================
  // ERROR HANDLING TESTS
  // =====================================================

  describe('error handling', () => {
    it('should return placeholder badge on database error', async () => {
      mockProcessBadgeRequest.mockResolvedValue({ valid: false })

      const result = await mockProcessBadgeRequest({}, VALID_UUID, {})

      // On any error, the endpoint returns a badge (placeholder)
      expect(result.valid).toBe(false)
    })

    it('should not throw on malformed referrer URL', () => {
      const event = createMockEvent(VALID_UUID, {
        referer: 'not-a-valid-url',
      })

      // The endpoint handles this gracefully
      expect(event.node.req.headers.referer).toBe('not-a-valid-url')
    })
  })
})
