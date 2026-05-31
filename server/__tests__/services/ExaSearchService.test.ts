/**
 * ExaSearchService Unit Tests
 *
 * Tests all methods of ExaSearchService with mocked fetch responses.
 * Validates proper request formation, response parsing, discriminated union return type,
 * cost tracking, and snippet derivation.
 *
 * @see seo-article-improvements.md Task 4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ExaSearchService } from '../../services/ExaSearchService'

// =====================================================
// MOCK RESPONSES
// =====================================================

const mockExaCompetitorResponse = {
  requestId: 'req-123',
  results: [
    {
      url: 'https://example.com/concrete-costs',
      title: 'How Much Does a Concrete Driveway Cost?',
      publishedDate: '2024-01-15T00:00:00.000Z',
      highlights: ['Concrete driveways cost between $3-12 per square foot', 'Labor typically accounts for 50% of total cost'],
      highlightScores: [0.85, 0.78],
    },
    {
      url: 'https://example2.com/concrete-guide',
      title: 'Complete Concrete Pricing Guide',
      publishedDate: '2024-01-10T00:00:00.000Z',
      highlights: ['Average driveway costs $2,400-$6,000', 'Factors affecting price include location and complexity'],
      highlightScores: [0.82, 0.75],
    },
    {
      url: 'https://example3.com/concrete-prices',
      title: 'Concrete Prices by Region',
      publishedDate: '2024-01-05T00:00:00.000Z',
      highlights: ['Regional variations can affect pricing significantly'],
      highlightScores: [0.80],
    },
  ],
  costDollars: {
    total: 0.005,
  },
}

const mockExaAuthoritativeResponse = {
  requestId: 'req-124',
  results: [
    {
      url: 'https://wikipedia.org/wiki/Concrete',
      title: 'Concrete - Wikipedia',
      publishedDate: '2024-01-01T00:00:00.000Z',
      highlights: ['Concrete is a composite material composed of cement and aggregates', 'It is widely used in construction'],
      highlightScores: [0.90, 0.85],
    },
    {
      url: 'https://britannica.com/technology/concrete',
      title: 'Concrete | Britannica',
      publishedDate: '2024-01-02T00:00:00.000Z',
      highlights: ['Concrete has been used for thousands of years', 'Modern concrete was developed in the 19th century'],
      highlightScores: [0.88, 0.82],
    },
    {
      url: 'https://example.edu/concrete-research',
      title: 'Concrete Research at University',
      publishedDate: '2024-01-03T00:00:00.000Z',
      highlights: ['Our research focuses on sustainable concrete alternatives'],
      highlightScores: [0.79],
    },
  ],
  costDollars: {
    total: 0.005,
  },
}

const mockExaEmptyResponse = {
  requestId: 'req-125',
  results: [],
  costDollars: {
    total: 0.005,
  },
}

const mockExaResponseNoCost = {
  requestId: 'req-126',
  results: [
    {
      url: 'https://example.com/test',
      title: 'Test Result',
      publishedDate: '2024-01-01T00:00:00.000Z',
      highlights: ['Test highlight'],
      highlightScores: [0.85],
    },
  ],
  // costDollars missing - should use fallback
}

const mockExaResponseNoHighlights = {
  requestId: 'req-127',
  results: [
    {
      url: 'https://example.com/no-highlights',
      title: 'Result Without Highlights',
      publishedDate: '2024-01-01T00:00:00.000Z',
      // highlights missing - should use title as snippet
      highlightScores: [],
    },
  ],
  costDollars: {
    total: 0.005,
  },
}

// =====================================================
// TEST SUITE
// =====================================================

describe('ExaSearchService', () => {
  let service: ExaSearchService
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // Mock global fetch
    fetchMock = vi.fn()
    global.fetch = fetchMock as unknown as typeof fetch

    // Create service instance with test API key
    service = new ExaSearchService('test-exa-api-key')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // =====================================================
  // CONSTRUCTOR TESTS
  // =====================================================

  describe('constructor', () => {
    it('should throw error when no API key provided', () => {
      const originalEnv = process.env.EXA_API_KEY
      delete process.env.EXA_API_KEY

      expect(() => new ExaSearchService()).toThrow('EXA_API_KEY is required')

      process.env.EXA_API_KEY = originalEnv
    })

    it('should use provided API key', () => {
      const svc = new ExaSearchService('my-custom-key')
      expect(svc).toBeDefined()
    })

    it('should use environment variable when no key provided', () => {
      process.env.EXA_API_KEY = 'env-exa-key'
      const svc = new ExaSearchService()
      expect(svc).toBeDefined()
    })
  })

  // =====================================================
  // PERFORM RESEARCH TESTS (DISCRIMINATED UNION)
  // =====================================================

  describe('performResearch', () => {
    it('returns success:true with data on API success', async () => {
      // Mock both competitor and authoritative searches
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockExaCompetitorResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockExaAuthoritativeResponse),
        })

      const result = await service.performResearch('concrete cost')

      // Verify discriminated union: success: true
      expect(result.success).toBe(true)
      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('totalCost')
      expect(result.totalCost).toBeGreaterThan(0)

      // Verify data structure
      if (result.success) {
        expect(result.data.competitors).toEqual(expect.any(Array))
        expect(result.data.authoritativeSources).toEqual(expect.any(Array))
        expect(result.data.competitors.length).toBeGreaterThan(0)
        expect(result.data.authoritativeSources.length).toBeGreaterThan(0)
      }
    })

    it('returns success:false with error on API failure', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'))

      const result = await service.performResearch('concrete cost')

      // Verify discriminated union: success: false
      expect(result.success).toBe(false)
      expect(result).toHaveProperty('error')
      expect(result.totalCost).toBe(0)
      expect(result.error).toBe('Network error')

      // Verify data is NOT present in failure case
      expect(result).not.toHaveProperty('data')
    })

    it('returns success:true with empty arrays when API returns no results', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockExaEmptyResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockExaEmptyResponse),
        })

      const result = await service.performResearch('obscure keyword')

      // Verify discriminated union: success: true with empty data
      expect(result.success).toBe(true)
      expect(result).toHaveProperty('data')
      expect(result.totalCost).toBeGreaterThan(0)

      if (result.success) {
        expect(result.data.competitors).toEqual([])
        expect(result.data.authoritativeSources).toEqual([])
      }
    })

    it('uses costDollars.total from response', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockExaCompetitorResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockExaAuthoritativeResponse),
        })

      const result = await service.performResearch('concrete cost')

      // Both responses have costDollars.total: 0.005, so total should be 0.01
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.totalCost).toBe(0.01) // 0.005 + 0.005
      }
    })

    it('falls back to $0.005 per search if costDollars missing', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockExaResponseNoCost),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockExaResponseNoCost),
        })

      const result = await service.performResearch('concrete cost')

      // Both searches should use fallback $0.005, total $0.01
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.totalCost).toBe(0.01) // 0.005 + 0.005 (fallback)
      }
    })

    it('derives snippet from highlights.join()', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockExaCompetitorResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockExaAuthoritativeResponse),
        })

      const result = await service.performResearch('concrete cost')

      expect(result.success).toBe(true)
      if (result.success) {
        // Check first competitor snippet is joined highlights
        const firstCompetitor = result.data.competitors[0]
        expect(firstCompetitor.snippet).toBe(
          'Concrete driveways cost between $3-12 per square foot Labor typically accounts for 50% of total cost'
        )
      }
    })

    it('uses title as snippet when highlights missing', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockExaResponseNoHighlights),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockExaEmptyResponse),
        })

      const result = await service.performResearch('concrete cost')

      expect(result.success).toBe(true)
      if (result.success) {
        const firstCompetitor = result.data.competitors[0]
        expect(firstCompetitor.snippet).toBe('Result Without Highlights')
      }
    })

    it('filters authoritative sources to only wikipedia/britannica/.edu/.gov', async () => {
      // Mock response with mixed domains
      const mixedAuthoritativeResponse = {
        requestId: 'req-128',
        results: [
          {
            url: 'https://wikipedia.org/wiki/Concrete',
            title: 'Wikipedia Article',
            publishedDate: '2024-01-01T00:00:00.000Z',
            highlights: ['Wikipedia content'],
            highlightScores: [0.90],
          },
          {
            url: 'https://example.com/not-authoritative',
            title: 'Regular Website',
            publishedDate: '2024-01-01T00:00:00.000Z',
            highlights: ['Regular content'],
            highlightScores: [0.70],
          },
          {
            url: 'https://university.edu/research',
            title: 'University Research',
            publishedDate: '2024-01-01T00:00:00.000Z',
            highlights: ['.edu domain'],
            highlightScores: [0.85],
          },
          {
            url: 'https://government.gov/data',
            title: 'Government Data',
            publishedDate: '2024-01-01T00:00:00.000Z',
            highlights: ['.gov domain'],
            highlightScores: [0.80],
          },
        ],
        costDollars: { total: 0.005 },
      }

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockExaCompetitorResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mixedAuthoritativeResponse),
        })

      const result = await service.performResearch('concrete cost')

      expect(result.success).toBe(true)
      if (result.success) {
        // Should only have 3 authoritative sources (wikipedia, .edu, .gov)
        expect(result.data.authoritativeSources.length).toBe(3)
        
        // Verify all are authoritative
        for (const source of result.data.authoritativeSources) {
          const isAuthoritative = 
            source.url.includes('wikipedia.org') ||
            source.url.includes('britannica.com') ||
            source.url.includes('.edu') ||
            source.url.includes('.gov')
          expect(isAuthoritative).toBe(true)
        }
      }
    })

    it('handles HTTP error responses', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: () => Promise.resolve('Invalid API key'),
      })

      const result = await service.performResearch('concrete cost')

      expect(result.success).toBe(false)
      expect(result.totalCost).toBe(0)
      expect(result.error).toContain('HTTP 401')
    })

    it('handles JSON parse errors', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      })

      const result = await service.performResearch('concrete cost')

      expect(result.success).toBe(false)
      expect(result.totalCost).toBe(0)
      expect(result.error).toContain('Invalid JSON')
    })
  })

  // =====================================================
  // SEARCH COMPETITOR CONTENT TESTS
  // =====================================================

  describe('searchCompetitorContent', () => {
    it('should fetch competitor content with highlights', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockExaCompetitorResponse),
      })

      const result = await service.searchCompetitorContent('concrete cost')

      expect(result).toHaveLength(3)
      expect(result[0].url).toBe('https://example.com/concrete-costs')
      expect(result[0].title).toBe('How Much Does a Concrete Driveway Cost?')
      expect(result[0].snippet).toContain('Concrete driveways cost')
    })

    it('should respect numResults limit', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockExaCompetitorResponse),
      })

      await service.searchCompetitorContent('concrete cost', 2)

      // Verify fetch was called with numResults: 2
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.exa.ai/search',
        expect.objectContaining({
          body: expect.stringContaining('"numResults":2'),
        })
      )
    })

    it('should request highlights only (not text)', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockExaCompetitorResponse),
      })

      await service.searchCompetitorContent('concrete cost')

      // Verify fetch was called with highlights in contents
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.exa.ai/search',
        expect.objectContaining({
          body: expect.stringContaining('"highlights"'),
        })
      )

      // Verify text is NOT requested
      const callBody = fetchMock.mock.calls[0][1].body
      expect(callBody).not.toContain('"text"')
    })

    it('should use x-api-key header', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockExaCompetitorResponse),
      })

      await service.searchCompetitorContent('concrete cost')

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.exa.ai/search',
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-api-key': 'test-exa-api-key',
          }),
        })
      )
    })
  })

  // =====================================================
  // SEARCH AUTHORITATIVE SOURCES TESTS
  // =====================================================

  describe('searchAuthoritativeSources', () => {
    it('should fetch authoritative sources with domain filtering', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockExaAuthoritativeResponse),
      })

      const result = await service.searchAuthoritativeSources('concrete')

      expect(result).toHaveLength(3)
      
      // Verify all results are authoritative
      for (const source of result) {
        const isAuthoritative = 
          source.url.includes('wikipedia.org') ||
          source.url.includes('britannica.com') ||
          source.url.includes('.edu') ||
          source.url.includes('.gov')
        expect(isAuthoritative).toBe(true)
      }
    })

    it('should include wikipedia and britannica in includeDomains', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockExaAuthoritativeResponse),
      })

      await service.searchAuthoritativeSources('concrete')

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.exa.ai/search',
        expect.objectContaining({
          body: expect.stringContaining('wikipedia.org'),
        })
      )
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.exa.ai/search',
        expect.objectContaining({
          body: expect.stringContaining('britannica.com'),
        })
      )
    })

    it('should post-filter for .edu and .gov domains', async () => {
      const mixedResponse = {
        requestId: 'req-129',
        results: [
          {
            url: 'https://wikipedia.org/wiki/Test',
            title: 'Wikipedia',
            publishedDate: '2024-01-01T00:00:00.000Z',
            highlights: ['Wiki'],
            highlightScores: [0.90],
          },
          {
            url: 'https://example.com/not-authoritative',
            title: 'Not Authoritative',
            publishedDate: '2024-01-01T00:00:00.000Z',
            highlights: ['Not auth'],
            highlightScores: [0.70],
          },
          {
            url: 'https://university.edu/research',
            title: 'University',
            publishedDate: '2024-01-01T00:00:00.000Z',
            highlights: ['.edu'],
            highlightScores: [0.85],
          },
        ],
        costDollars: { total: 0.005 },
      }

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mixedResponse),
      })

      const result = await service.searchAuthoritativeSources('concrete')

      // Should only have 2 (wikipedia and .edu), not the .com
      expect(result.length).toBe(2)
      expect(result.every(r => 
        r.url.includes('wikipedia.org') || 
        r.url.includes('britannica.com') || 
        r.url.includes('.edu') || 
        r.url.includes('.gov')
      )).toBe(true)
    })
  })
})
