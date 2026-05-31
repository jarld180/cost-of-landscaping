/**
 * DataForSEO Labs Service
 *
 * API client wrapper for DataForSEO Labs API endpoints.
 * Used by the Research Agent for keyword research, SERP analysis, and search intent.
 * Separate from DataForSeoService which handles Business Data (reviews).
 */

import { consola } from 'consola'
import {
  DATAFORSEO_LABS_BASE_URL,
  DATAFORSEO_LABS_ENDPOINTS,
  type KeywordOverviewResponse,
  type KeywordOverviewResult,
  type SerpResponse,
  type SerpOrganicItem,
  type SerpPeopleAlsoAskItem,
  type RelatedKeywordsResponse,
  type KeywordSuggestionsResponse,
  type SearchIntentResponse,
  type LabsResearchData,
} from '../schemas/dataforseo-labs.schemas'
import { DataForSeoError, DATAFORSEO_STATUS_CODES } from '../schemas/dataforseo.schemas'

// =====================================================
// SERVICE
// =====================================================

export class DataForSeoLabsService {
  private authHeader: string

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('DATAFORSEO_API_KEY is required')
    }
    this.authHeader = `Basic ${apiKey}`
  }

  // =====================================================
  // API HELPERS
  // =====================================================

  private async fetchApi<T>(endpoint: string, body: unknown[]): Promise<T> {
    const response = await fetch(`${DATAFORSEO_LABS_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const text = await response.text()
      consola.error(`[DataForSeoLabsService] HTTP ${response.status}: ${text}`)
      throw new DataForSeoError(`HTTP ${response.status}: ${response.statusText}`, response.status)
    }

    return response.json()
  }

  // =====================================================
  // KEYWORD OVERVIEW
  // =====================================================

  async getKeywordOverview(
    keywords: string[],
    locationCode = 2840,
    languageCode = 'en'
  ): Promise<{ results: KeywordOverviewResult[]; cost: number }> {
    consola.debug(`[DataForSeoLabsService] Getting keyword overview for ${keywords.length} keywords`)

    const data = await this.fetchApi<KeywordOverviewResponse>(
      DATAFORSEO_LABS_ENDPOINTS.KEYWORD_OVERVIEW,
      [{ keywords, location_code: locationCode, language_code: languageCode }]
    )

    if (data.status_code !== DATAFORSEO_STATUS_CODES.SUCCESS) {
      throw new DataForSeoError(`Keyword overview failed: ${data.status_message}`, data.status_code)
    }

    // DataForSEO returns: tasks[0].result[0].items[0] which contains the keyword data
    // We need to flatten this structure to match our KeywordOverviewResult interface
    const rawResults = data.tasks?.[0]?.result || []
    const results: KeywordOverviewResult[] = []

    for (const resultGroup of rawResults) {
      if (resultGroup.items) {
        for (const item of resultGroup.items) {
          results.push({
            keyword: item.keyword,
            search_volume: item.keyword_info?.search_volume ?? null,
            keyword_difficulty: item.keyword_properties?.keyword_difficulty ?? null,
            cpc: item.keyword_info?.cpc ?? null,
            competition: item.keyword_info?.competition ?? null,
            competition_level: item.keyword_info?.competition_level ?? null,
            search_intent_info: item.search_intent_info ? {
              main_intent: item.search_intent_info.main_intent,
              foreign_intent: item.search_intent_info.foreign_intent ?? null,
            } : undefined,
            monthly_searches: item.keyword_info?.monthly_searches,
          })
        }
      }
    }

    return { results, cost: data.cost }
  }

  // =====================================================
  // SERP RESULTS
  // =====================================================

  async getSerpResults(
    keyword: string,
    locationCode = 2840,
    languageCode = 'en',
    depth = 10
  ): Promise<{
    organicResults: SerpOrganicItem[]
    paaQuestions: string[]
    cost: number
  }> {
    consola.debug(`[DataForSeoLabsService] Getting SERP results for: ${keyword}`)

    const data = await this.fetchApi<SerpResponse>(
      DATAFORSEO_LABS_ENDPOINTS.SERP,
      [{ keyword, location_code: locationCode, language_code: languageCode, depth }]
    )

    if (data.status_code !== DATAFORSEO_STATUS_CODES.SUCCESS) {
      throw new DataForSeoError(`SERP request failed: ${data.status_message}`, data.status_code)
    }

    const items = data.tasks?.[0]?.result?.[0]?.items || []

    // Extract organic results
    const organicResults = items
      .filter((item): item is SerpOrganicItem => item.type === 'organic')
      .slice(0, depth)

    // Extract PAA questions
    const paaQuestions: string[] = []
    for (const item of items) {
      if (item.type === 'people_also_ask') {
        const paaItem = item as SerpPeopleAlsoAskItem
        if (paaItem.items) {
          for (const q of paaItem.items) {
            if (q.title) paaQuestions.push(q.title)
          }
        }
      }
    }

    return { organicResults, paaQuestions, cost: data.cost }
  }

  // =====================================================
  // RELATED KEYWORDS
  // =====================================================

  async getRelatedKeywords(
    keyword: string,
    locationCode = 2840,
    languageCode = 'en',
    limit = 20
  ): Promise<{ keywords: string[]; cost: number }> {
    consola.debug(`[DataForSeoLabsService] Getting related keywords for: ${keyword}`)

    const data = await this.fetchApi<RelatedKeywordsResponse>(
      DATAFORSEO_LABS_ENDPOINTS.RELATED_KEYWORDS,
      [{ keyword, location_code: locationCode, language_code: languageCode, limit }]
    )

    if (data.status_code !== DATAFORSEO_STATUS_CODES.SUCCESS) {
      throw new DataForSeoError(`Related keywords failed: ${data.status_message}`, data.status_code)
    }

    const items = data.tasks?.[0]?.result?.[0]?.items || []

    // Extract keywords from keyword_data.keyword (API structure)
    const keywords: string[] = []
    for (const item of items) {
      if (item.keyword_data?.keyword) {
        keywords.push(item.keyword_data.keyword)
      }
    }

    return { keywords, cost: data.cost }
  }

  // =====================================================
  // KEYWORD SUGGESTIONS
  // =====================================================

  async getKeywordSuggestions(
    keyword: string,
    locationCode = 2840,
    languageCode = 'en',
    limit = 20
  ): Promise<{ keywords: string[]; cost: number }> {
    consola.debug(`[DataForSeoLabsService] Getting keyword suggestions for: ${keyword}`)

    const data = await this.fetchApi<KeywordSuggestionsResponse>(
      DATAFORSEO_LABS_ENDPOINTS.KEYWORD_SUGGESTIONS,
      [{ keyword, location_code: locationCode, language_code: languageCode, limit }]
    )

    if (data.status_code !== DATAFORSEO_STATUS_CODES.SUCCESS) {
      throw new DataForSeoError(`Keyword suggestions failed: ${data.status_message}`, data.status_code)
    }

    const items = data.tasks?.[0]?.result?.[0]?.items || []

    // Extract keywords from keyword_data.keyword (API structure)
    const keywords: string[] = []
    for (const item of items) {
      if (item.keyword_data?.keyword) {
        keywords.push(item.keyword_data.keyword)
      }
    }

    return { keywords, cost: data.cost }
  }

  // =====================================================
  // SEARCH INTENT
  // =====================================================

  async getSearchIntent(
    keywords: string[],
    locationCode = 2840,
    languageCode = 'en'
  ): Promise<{ intents: Map<string, string>; cost: number }> {
    consola.debug(`[DataForSeoLabsService] Getting search intent for ${keywords.length} keywords`)

    const data = await this.fetchApi<SearchIntentResponse>(
      DATAFORSEO_LABS_ENDPOINTS.SEARCH_INTENT,
      [{ keywords, location_code: locationCode, language_code: languageCode }]
    )

    if (data.status_code !== DATAFORSEO_STATUS_CODES.SUCCESS) {
      throw new DataForSeoError(`Search intent failed: ${data.status_message}`, data.status_code)
    }

    const results = data.tasks?.[0]?.result || []
    const intents = new Map<string, string>()
    for (const item of results) {
      if (item.keyword && item.main_intent) {
        intents.set(item.keyword, item.main_intent)
      }
    }

    return { intents, cost: data.cost }
  }

  // =====================================================
  // COMBINED RESEARCH
  // =====================================================

  /**
   * Perform comprehensive keyword research
   * Calls all relevant Labs API endpoints and combines results
   */
  async performResearch(
    keyword: string,
    options: {
      locationCode?: number
      languageCode?: string
      serpDepth?: number
      relatedLimit?: number
      suggestionsLimit?: number
    } = {}
  ): Promise<LabsResearchData> {
    const {
      locationCode = 2840,
      languageCode = 'en',
      serpDepth = 10,
      relatedLimit = 15,
      suggestionsLimit = 15,
    } = options

    let totalCost = 0

    consola.info(`[DataForSeoLabsService] Starting research for: ${keyword}`)

    // 1. Get keyword overview
    const { results: kwResults, cost: kwCost } = await this.getKeywordOverview(
      [keyword], locationCode, languageCode
    )
    totalCost += kwCost
    const kwData = kwResults[0] || null

    // 2. Get SERP results
    const { organicResults, paaQuestions, cost: serpCost } = await this.getSerpResults(
      keyword, locationCode, languageCode, serpDepth
    )
    totalCost += serpCost

    // 3. Get related keywords
    const { keywords: relatedKeywords, cost: relatedCost } = await this.getRelatedKeywords(
      keyword, locationCode, languageCode, relatedLimit
    )
    totalCost += relatedCost

    // 4. Get keyword suggestions
    const { keywords: suggestions, cost: suggestionsCost } = await this.getKeywordSuggestions(
      keyword, locationCode, languageCode, suggestionsLimit
    )
    totalCost += suggestionsCost

    consola.info(`[DataForSeoLabsService] Research complete. Total cost: $${totalCost.toFixed(4)}`)

    return {
      keyword,
      keywordData: {
        searchVolume: kwData?.search_volume ?? null,
        difficulty: kwData?.keyword_difficulty ?? null,
        cpc: kwData?.cpc ?? null,
        intent: kwData?.search_intent_info?.main_intent ?? null,
        competition: kwData?.competition ?? null,
      },
      serpResults: organicResults.map(item => ({
        rank: item.rank_group,
        url: item.url,
        title: item.title,
        description: item.description,
        domain: item.domain,
      })),
      paaQuestions,
      relatedKeywords,
      keywordSuggestions: suggestions,
      totalCost,
    }
  }
}

