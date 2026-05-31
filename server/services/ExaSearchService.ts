/**
 * ExaSearchService
 *
 * Provides research capabilities using Exa AI REST API.
 * Implements discriminated union return types for clear success/failure handling.
 * Uses highlights-only content (not full text) to minimize API costs.
 *
 * @see seo-article-improvements.md Task 5
 */

import { consola } from 'consola'

// =====================================================
// TYPES
// =====================================================

/**
 * Single search result from Exa API
 */
interface ExaApiResult {
  url: string
  title: string
  publishedDate: string
  highlights?: string[]
  highlightScores?: number[]
}

/**
 * Exa API response structure
 */
interface ExaApiResponse {
  requestId: string
  results: ExaApiResult[]
  costDollars?: {
    total: number
  }
}

/**
 * Processed search result for external consumption
 */
export interface ExaResult {
  url: string
  title: string
  snippet: string
  highlights?: string[]
}

/**
 * Discriminated union: success case
 */
interface ExaSearchSuccess {
  success: true
  data: {
    competitors: ExaResult[]
    authoritativeSources: ExaResult[]
  }
  totalCost: number
}

/**
 * Discriminated union: failure case
 */
interface ExaSearchFailure {
  success: false
  error: string
  totalCost: 0
}

/**
 * Discriminated union return type
 */
export type ExaSearchResult = ExaSearchSuccess | ExaSearchFailure

// =====================================================
// SERVICE
// =====================================================

export class ExaSearchService {
  private apiKey: string
  private readonly baseUrl = 'https://api.exa.ai/search'
  private readonly defaultCostPerSearch = 0.005

  /**
   * Constructor
   * @param apiKey - API key for Exa API
   * @throws Error if no API key provided
   */
  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('EXA_API_KEY is required')
    }
    this.apiKey = apiKey
  }

  /**
   * Private helper: Make authenticated request to Exa API
   */
  private async search(params: {
    query: string
    numResults: number
    includeDomains?: string[]
  }): Promise<ExaApiResponse> {
    const requestBody = {
      query: params.query,
      type: 'auto',
      numResults: params.numResults,
      contents: {
        highlights: {
          numSentences: 3,
          highlightsPerUrl: 2,
        },
      },
      ...(params.includeDomains && { includeDomains: params.includeDomains }),
    }

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Convert Exa API result to ExaResult
   */
  private processResult(result: ExaApiResult): ExaResult {
    const snippet =
      result.highlights && result.highlights.length > 0
        ? result.highlights.join(' ')
        : result.title

    return {
      url: result.url,
      title: result.title,
      snippet,
      highlights: result.highlights,
    }
  }

  /**
   * Search for competitor content
   * @param keyword - Search keyword
   * @param limit - Number of results (default: 5)
   * @returns Array of competitor results
   */
  async searchCompetitorContent(keyword: string, limit = 5): Promise<ExaResult[]> {
    const response = await this.search({
      query: keyword,
      numResults: limit,
    })

    return response.results.map(r => this.processResult(r))
  }

  /**
   * Search for authoritative sources
   * Filters for wikipedia.org, britannica.com, .edu, and .gov domains
   * @param keyword - Search keyword
   * @param limit - Number of results (default: 3)
   * @returns Array of authoritative source results
   */
  async searchAuthoritativeSources(keyword: string, limit = 3): Promise<ExaResult[]> {
    // Request extra results to account for post-filtering
    const response = await this.search({
      query: keyword,
      numResults: limit * 2,
      includeDomains: ['wikipedia.org', 'britannica.com'],
    })

    // Post-filter to also accept .edu and .gov TLDs
    const isAuthoritative = (url: string): boolean => {
      return (
        url.includes('wikipedia.org') ||
        url.includes('britannica.com') ||
        url.includes('.edu') ||
        url.includes('.gov')
      )
    }

    return response.results
      .filter(r => isAuthoritative(r.url))
      .slice(0, limit)
      .map(r => this.processResult(r))
  }

  /**
   * Perform comprehensive research
   * Combines competitor content and authoritative sources
   * Returns discriminated union: success with data or failure with error
   * @param keyword - Search keyword
   * @returns ExaSearchResult (discriminated union)
   */
  async performResearch(keyword: string): Promise<ExaSearchResult> {
    try {
      let totalCost = 0

      // 1. Search competitor content
      const competitorResponse = await this.search({
        query: keyword,
        numResults: 5,
      })

      const competitorCost =
        competitorResponse.costDollars?.total ?? this.defaultCostPerSearch
      totalCost += competitorCost

      // 2. Search authoritative sources
      const authoritativeResponse = await this.search({
        query: keyword,
        numResults: 6, // Request extra to account for post-filtering
        includeDomains: ['wikipedia.org', 'britannica.com'],
      })

      const authoritativeCost =
        authoritativeResponse.costDollars?.total ?? this.defaultCostPerSearch
      totalCost += authoritativeCost

      // 3. Process results
      const competitors = competitorResponse.results.map(r => this.processResult(r))

      // Post-filter authoritative sources
      const isAuthoritative = (url: string): boolean => {
        return (
          url.includes('wikipedia.org') ||
          url.includes('britannica.com') ||
          url.includes('.edu') ||
          url.includes('.gov')
        )
      }

      const authoritativeSources = authoritativeResponse.results
        .filter(r => isAuthoritative(r.url))
        .slice(0, 3)
        .map(r => this.processResult(r))

      return {
        success: true,
        data: {
          competitors,
          authoritativeSources,
        },
        totalCost,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      consola.warn(`[ExaSearchService] Research failed: ${errorMessage}`)

      return {
        success: false,
        error: errorMessage,
        totalCost: 0,
      }
    }
  }
}
