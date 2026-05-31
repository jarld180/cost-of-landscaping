/**
 * DataForSEO Labs API Schemas
 *
 * TypeScript types for DataForSEO Labs API endpoints used by the Research Agent.
 * Covers keyword research, SERP data, related keywords, and search intent.
 * Based on: https://docs.dataforseo.com/v3/dataforseo_labs/
 */

import { z } from 'zod'

// =====================================================
// API CONFIGURATION
// =====================================================

export const DATAFORSEO_LABS_BASE_URL = 'https://api.dataforseo.com'

/** Labs API endpoint paths */
export const DATAFORSEO_LABS_ENDPOINTS = {
  KEYWORD_OVERVIEW: '/v3/dataforseo_labs/google/keyword_overview/live',
  SERP: '/v3/serp/google/organic/live/advanced',
  RELATED_KEYWORDS: '/v3/dataforseo_labs/google/related_keywords/live',
  KEYWORD_SUGGESTIONS: '/v3/dataforseo_labs/google/keyword_suggestions/live',
  SEARCH_INTENT: '/v3/dataforseo_labs/google/search_intent/live',
} as const

// =====================================================
// KEYWORD OVERVIEW
// =====================================================

export const keywordOverviewRequestSchema = z.object({
  keywords: z.array(z.string()).max(1000),
  location_code: z.number().default(2840), // USA
  language_code: z.string().default('en'),
})

export type KeywordOverviewRequest = z.infer<typeof keywordOverviewRequestSchema>

export interface KeywordOverviewResult {
  keyword: string
  search_volume: number | null
  keyword_difficulty: number | null
  cpc: number | null
  competition: number | null
  competition_level: string | null
  search_intent_info?: {
    main_intent: string
    foreign_intent: string[] | null
  }
  monthly_searches?: Array<{ year: number; month: number; search_volume: number }>
}

/** Raw item from DataForSEO keyword overview API (nested in result.items) */
export interface KeywordOverviewRawItem {
  keyword: string
  keyword_info?: {
    search_volume: number | null
    cpc: number | null
    competition: number | null
    competition_level: string | null
    monthly_searches?: Array<{ year: number; month: number; search_volume: number }>
  }
  keyword_properties?: {
    keyword_difficulty: number | null
  }
  search_intent_info?: {
    main_intent: string
    foreign_intent: string[] | null
  }
}

/** Raw result group from DataForSEO keyword overview API */
export interface KeywordOverviewResultGroup {
  se_type: string
  location_code: number
  language_code: string
  items_count: number
  items: KeywordOverviewRawItem[]
}

export interface KeywordOverviewResponse {
  status_code: number
  status_message: string
  cost: number
  tasks: Array<{
    status_code: number
    status_message: string
    result: KeywordOverviewResultGroup[] | null
  }>
}

// =====================================================
// SERP RESULTS
// =====================================================

export const serpRequestSchema = z.object({
  keyword: z.string(),
  location_code: z.number().default(2840),
  language_code: z.string().default('en'),
  depth: z.number().min(10).max(100).default(10),
})

export type SerpRequest = z.infer<typeof serpRequestSchema>

export interface SerpOrganicItem {
  type: 'organic'
  rank_group: number
  rank_absolute: number
  position: string
  title: string
  url: string
  description: string | null
  domain: string
}

export interface SerpPeopleAlsoAskItem {
  type: 'people_also_ask'
  items: Array<{
    title: string
    expanded_element?: Array<{
      type: string
      description?: string
    }>
  }>
}

export interface SerpResponse {
  status_code: number
  status_message: string
  cost: number
  tasks: Array<{
    status_code: number
    status_message: string
    result: Array<{
      keyword: string
      items: Array<SerpOrganicItem | SerpPeopleAlsoAskItem | { type: string; [key: string]: unknown }>
    }> | null
  }>
}

// =====================================================
// RELATED KEYWORDS
// =====================================================

export const relatedKeywordsRequestSchema = z.object({
  keyword: z.string(),
  location_code: z.number().default(2840),
  language_code: z.string().default('en'),
  limit: z.number().min(1).max(1000).default(20),
})

export type RelatedKeywordsRequest = z.infer<typeof relatedKeywordsRequestSchema>

export interface RelatedKeywordItem {
  keyword_data: {
    keyword: string
    keyword_info?: {
      search_volume: number | null
      cpc: number | null
    }
    keyword_properties?: {
      keyword_difficulty: number | null
    }
  }
  related_keywords?: string[]
}

export interface RelatedKeywordsResponse {
  status_code: number
  status_message: string
  cost: number
  tasks: Array<{
    status_code: number
    status_message: string
    result: Array<{
      seed_keyword: string
      items: RelatedKeywordItem[] | null
    }> | null
  }>
}

// =====================================================
// KEYWORD SUGGESTIONS
// =====================================================

export const keywordSuggestionsRequestSchema = z.object({
  keyword: z.string(),
  location_code: z.number().default(2840),
  language_code: z.string().default('en'),
  limit: z.number().min(1).max(1000).default(20),
})

export type KeywordSuggestionsRequest = z.infer<typeof keywordSuggestionsRequestSchema>

export interface KeywordSuggestionItem {
  keyword_data: {
    keyword: string
    keyword_info?: {
      search_volume: number | null
      cpc: number | null
    }
    keyword_properties?: {
      keyword_difficulty: number | null
    }
  }
}

export interface KeywordSuggestionsResponse {
  status_code: number
  status_message: string
  cost: number
  tasks: Array<{
    status_code: number
    status_message: string
    result: Array<{
      seed_keyword: string
      items: KeywordSuggestionItem[] | null
    }> | null
  }>
}

// =====================================================
// SEARCH INTENT
// =====================================================

export const searchIntentRequestSchema = z.object({
  keywords: z.array(z.string()).max(1000),
  location_code: z.number().default(2840),
  language_code: z.string().default('en'),
})

export type SearchIntentRequest = z.infer<typeof searchIntentRequestSchema>

export interface SearchIntentResult {
  keyword: string
  main_intent: 'informational' | 'navigational' | 'commercial' | 'transactional' | null
  probability: number | null
}

export interface SearchIntentResponse {
  status_code: number
  status_message: string
  cost: number
  tasks: Array<{
    status_code: number
    status_message: string
    result: SearchIntentResult[] | null
  }>
}

// =====================================================
// AGGREGATED RESEARCH OUTPUT
// =====================================================

/** Combined research data from all Labs API calls */
export interface LabsResearchData {
  keyword: string
  keywordData: {
    searchVolume: number | null
    difficulty: number | null
    cpc: number | null
    intent: string | null
    competition: number | null
  }
  serpResults: Array<{
    rank: number
    url: string
    title: string
    description: string
    domain: string
  }>
  paaQuestions: string[]
  relatedKeywords: string[]
  keywordSuggestions: string[]
  totalCost: number
}

