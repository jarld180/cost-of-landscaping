/**
 * DataForSEO Labs Service Unit Tests
 *
 * Tests all methods of DataForSeoLabsService with mocked API responses.
 * Validates proper request formation, response parsing, and error handling.
 *
 * @see BAM-311 Batch 2.3: Testing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DataForSeoLabsService } from '../../services/DataForSeoLabsService'
import { DataForSeoError, DATAFORSEO_STATUS_CODES } from '../../schemas/dataforseo.schemas'

// =====================================================
// MOCK RESPONSES
// =====================================================

const mockKeywordOverviewResponse = {
  status_code: DATAFORSEO_STATUS_CODES.SUCCESS,
  status_message: 'Ok.',
  cost: 0.001,
  tasks: [{
    status_code: DATAFORSEO_STATUS_CODES.SUCCESS,
    status_message: 'Ok.',
    result: [{
      se_type: 'google',
      location_code: 2840,
      language_code: 'en',
      items_count: 1,
      items: [{
        keyword: 'concrete contractors',
        keyword_info: {
          search_volume: 12000,
          cpc: 8.50,
          competition: 0.65,
          competition_level: 'MEDIUM',
        },
        keyword_properties: {
          keyword_difficulty: 45,
        },
        search_intent_info: {
          main_intent: 'commercial',
          foreign_intent: null,
        },
      }],
    }],
  }],
}

const mockSerpResponse = {
  status_code: DATAFORSEO_STATUS_CODES.SUCCESS,
  status_message: 'Ok.',
  cost: 0.002,
  tasks: [{
    status_code: DATAFORSEO_STATUS_CODES.SUCCESS,
    status_message: 'Ok.',
    result: [{
      keyword: 'concrete contractors',
      items: [
        {
          type: 'organic',
          rank_group: 1,
          rank_absolute: 1,
          position: 'left',
          title: 'Top Concrete Contractors Near You',
          url: 'https://example.com/contractors',
          description: 'Find the best concrete contractors in your area.',
          domain: 'example.com',
        },
        {
          type: 'organic',
          rank_group: 2,
          rank_absolute: 2,
          position: 'left',
          title: 'Concrete Services | Local Experts',
          url: 'https://example2.com/services',
          description: 'Professional concrete services for residential and commercial.',
          domain: 'example2.com',
        },
        {
          type: 'people_also_ask',
          items: [
            { title: 'How much does concrete work cost?' },
            { title: 'What is the best concrete contractor?' },
          ],
        },
      ],
    }],
  }],
}

const mockRelatedKeywordsResponse = {
  status_code: DATAFORSEO_STATUS_CODES.SUCCESS,
  status_message: 'Ok.',
  cost: 0.001,
  tasks: [{
    status_code: DATAFORSEO_STATUS_CODES.SUCCESS,
    status_message: 'Ok.',
    result: [{
      seed_keyword: 'concrete contractors',
      items: [
        { keyword_data: { keyword: 'concrete contractors near me', keyword_info: { search_volume: 8000, cpc: 7.0 }, keyword_properties: { keyword_difficulty: 40 } } },
        { keyword_data: { keyword: 'cement contractors', keyword_info: { search_volume: 3000, cpc: 5.0 }, keyword_properties: { keyword_difficulty: 35 } } },
        { keyword_data: { keyword: 'concrete driveway contractors', keyword_info: { search_volume: 2500, cpc: 6.0 }, keyword_properties: { keyword_difficulty: 38 } } },
      ],
    }],
  }],
}

const mockKeywordSuggestionsResponse = {
  status_code: DATAFORSEO_STATUS_CODES.SUCCESS,
  status_message: 'Ok.',
  cost: 0.001,
  tasks: [{
    status_code: DATAFORSEO_STATUS_CODES.SUCCESS,
    status_message: 'Ok.',
    result: [{
      seed_keyword: 'concrete contractors',
      items: [
        { keyword_data: { keyword: 'affordable concrete contractors', keyword_info: { search_volume: 1500, cpc: 4.0 }, keyword_properties: { keyword_difficulty: 30 } } },
        { keyword_data: { keyword: 'licensed concrete contractors', keyword_info: { search_volume: 1200, cpc: 4.5 }, keyword_properties: { keyword_difficulty: 32 } } },
      ],
    }],
  }],
}

const mockSearchIntentResponse = {
  status_code: DATAFORSEO_STATUS_CODES.SUCCESS,
  status_message: 'Ok.',
  cost: 0.001,
  tasks: [{
    status_code: DATAFORSEO_STATUS_CODES.SUCCESS,
    status_message: 'Ok.',
    result: [
      { keyword: 'concrete contractors', main_intent: 'commercial', probability: 0.85 },
      { keyword: 'what is concrete', main_intent: 'informational', probability: 0.92 },
    ],
  }],
}

// =====================================================
// TEST SUITE
// =====================================================

describe('DataForSeoLabsService', () => {
  let service: DataForSeoLabsService
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // Mock global fetch
    fetchMock = vi.fn()
    global.fetch = fetchMock as unknown as typeof fetch

    // Create service instance
    service = new DataForSeoLabsService('test-api-key')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // =====================================================
  // CONSTRUCTOR TESTS
  // =====================================================

  describe('constructor', () => {
    it('should throw error when no API key provided', () => {
      const originalEnv = process.env.DATAFORSEO_API_KEY
      delete process.env.DATAFORSEO_API_KEY

      expect(() => new DataForSeoLabsService()).toThrow('DATAFORSEO_API_KEY is required')

      process.env.DATAFORSEO_API_KEY = originalEnv
    })

    it('should use provided API key', () => {
      const svc = new DataForSeoLabsService('my-custom-key')
      expect(svc).toBeDefined()
    })

    it('should use environment variable when no key provided', () => {
      process.env.DATAFORSEO_API_KEY = 'env-key'
      const svc = new DataForSeoLabsService()
      expect(svc).toBeDefined()
    })
  })

  // =====================================================
  // KEYWORD OVERVIEW TESTS
  // =====================================================

  describe('getKeywordOverview', () => {
    it('should fetch keyword overview data', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockKeywordOverviewResponse),
      })

      const { results, cost } = await service.getKeywordOverview(['concrete contractors'])

      expect(results).toHaveLength(1)
      expect(results[0].keyword).toBe('concrete contractors')
      expect(results[0].search_volume).toBe(12000)
      expect(results[0].keyword_difficulty).toBe(45)
      expect(cost).toBe(0.001)
    })

    it('should throw DataForSeoError on API failure', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status_code: 40000,
          status_message: 'Rate limit exceeded',
          cost: 0,
          tasks: [],
        }),
      })

      await expect(service.getKeywordOverview(['test'])).rejects.toThrow(DataForSeoError)
    })

    it('should throw on HTTP error', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: () => Promise.resolve('Invalid credentials'),
      })

      await expect(service.getKeywordOverview(['test'])).rejects.toThrow('HTTP 401')
    })
  })

  // =====================================================
  // SERP RESULTS TESTS
  // =====================================================

  describe('getSerpResults', () => {
    it('should fetch and parse organic results', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSerpResponse),
      })

      const { organicResults, paaQuestions, cost } = await service.getSerpResults('concrete contractors')

      expect(organicResults).toHaveLength(2)
      expect(organicResults[0].title).toBe('Top Concrete Contractors Near You')
      expect(organicResults[0].domain).toBe('example.com')
      expect(paaQuestions).toHaveLength(2)
      expect(paaQuestions[0]).toBe('How much does concrete work cost?')
      expect(cost).toBe(0.002)
    })

    it('should handle empty SERP results', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          ...mockSerpResponse,
          tasks: [{ ...mockSerpResponse.tasks[0], result: [{ keyword: 'test', items: [] }] }],
        }),
      })

      const { organicResults, paaQuestions } = await service.getSerpResults('obscure keyword')

      expect(organicResults).toHaveLength(0)
      expect(paaQuestions).toHaveLength(0)
    })
  })

  // =====================================================
  // RELATED KEYWORDS TESTS
  // =====================================================

  describe('getRelatedKeywords', () => {
    it('should fetch related keywords', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRelatedKeywordsResponse),
      })

      const { keywords, cost } = await service.getRelatedKeywords('concrete contractors')

      expect(keywords).toHaveLength(3)
      expect(keywords).toContain('concrete contractors near me')
      expect(keywords).toContain('cement contractors')
      expect(cost).toBe(0.001)
    })
  })

  // =====================================================
  // KEYWORD SUGGESTIONS TESTS
  // =====================================================

  describe('getKeywordSuggestions', () => {
    it('should fetch keyword suggestions', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockKeywordSuggestionsResponse),
      })

      const { keywords, cost } = await service.getKeywordSuggestions('concrete contractors')

      expect(keywords).toHaveLength(2)
      expect(keywords).toContain('affordable concrete contractors')
      expect(cost).toBe(0.001)
    })
  })

  // =====================================================
  // SEARCH INTENT TESTS
  // =====================================================

  describe('getSearchIntent', () => {
    it('should fetch search intent for keywords', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSearchIntentResponse),
      })

      const { intents, cost } = await service.getSearchIntent(['concrete contractors', 'what is concrete'])

      expect(intents.size).toBe(2)
      expect(intents.get('concrete contractors')).toBe('commercial')
      expect(intents.get('what is concrete')).toBe('informational')
      expect(cost).toBe(0.001)
    })
  })

  // =====================================================
  // PERFORM RESEARCH (INTEGRATION) TESTS
  // =====================================================

  describe('performResearch', () => {
    it('should perform comprehensive research combining all API calls', async () => {
      // Mock all four API calls
      fetchMock
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockKeywordOverviewResponse) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockSerpResponse) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockRelatedKeywordsResponse) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockKeywordSuggestionsResponse) })

      const result = await service.performResearch('concrete contractors')

      expect(result.keyword).toBe('concrete contractors')
      expect(result.keywordData.searchVolume).toBe(12000)
      expect(result.keywordData.difficulty).toBe(45)
      expect(result.keywordData.intent).toBe('commercial')
      expect(result.serpResults).toHaveLength(2)
      expect(result.paaQuestions).toHaveLength(2)
      expect(result.relatedKeywords).toHaveLength(3)
      expect(result.keywordSuggestions).toHaveLength(2)
      expect(result.totalCost).toBe(0.005) // Sum of all API costs
    })

    it('should use default options when not provided', async () => {
      fetchMock
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockKeywordOverviewResponse) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockSerpResponse) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockRelatedKeywordsResponse) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockKeywordSuggestionsResponse) })

      await service.performResearch('test keyword')

      // Verify correct endpoints were called
      expect(fetchMock).toHaveBeenCalledTimes(4)
    })

    it('should handle partial API failures gracefully', async () => {
      // First call succeeds, second fails
      fetchMock
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockKeywordOverviewResponse) })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            status_code: 40000,
            status_message: 'Error',
            cost: 0,
            tasks: [],
          }),
        })

      await expect(service.performResearch('test')).rejects.toThrow(DataForSeoError)
    })
  })
})

