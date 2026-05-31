/**
 * Research Agent
 *
 * First agent in the AI article writing pipeline.
 * Uses DataForSEO Labs API to gather keyword research, competitor analysis, and SERP data.
 * Output feeds into the Writer Agent.
 */

import { consola } from 'consola'
import { z } from 'zod'
import { BaseAIAgent, type AgentContext, type AgentResult, type ResearchAgentInput } from '../AIAgent'
import { AgentRegistry } from '../AgentRegistry'
import { researchOutputSchema, type ResearchOutput, type AIAgentType } from '../../../schemas/ai.schemas'
import { DataForSeoLabsService } from '../../DataForSeoLabsService'
import { ExaSearchService } from '../../ExaSearchService'

// =====================================================
// AGENT IMPLEMENTATION
// =====================================================

export class ResearchAgent extends BaseAIAgent<ResearchAgentInput, ResearchOutput> {
  readonly agentType: AIAgentType = 'research'
  readonly name = 'Research Agent'
  readonly description = 'Gathers keyword research, competitor analysis, and SERP data using DataForSEO'

  // =====================================================
  // VALIDATION
  // =====================================================

  validateInput(input: unknown): input is ResearchAgentInput {
    if (!input || typeof input !== 'object') return false
    const obj = input as Record<string, unknown>
    return typeof obj.keyword === 'string' && obj.keyword.length > 0
  }

  getOutputSchema(): Record<string, unknown> {
    return z.toJSONSchema(researchOutputSchema)
  }

  // =====================================================
  // EXECUTION
  // =====================================================

  async execute(input: ResearchAgentInput, context: AgentContext): Promise<AgentResult<ResearchOutput>> {
    const { keyword, targetWordCount } = input
    const { log, onProgress } = context
    const startTime = Date.now()

    log('info', `Starting research for keyword: "${keyword}"`)
    onProgress?.('Starting keyword research...')

    try {
      if (!context.dataforseoApiKey) {
        return this.failure(
          'DataForSEO API key not configured',
          { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          0
        )
      }

      const labsService = new DataForSeoLabsService(context.dataforseoApiKey)

      // Perform comprehensive research
      onProgress?.('Fetching keyword data from DataForSEO...')
      const researchData = await labsService.performResearch(keyword, {
        serpDepth: 10,
        relatedLimit: 15,
        suggestionsLimit: 15,
      })

      log('debug', `Research data fetched. Cost: $${researchData.totalCost.toFixed(4)}`)

      // Perform Exa search
      onProgress?.('Searching for authoritative sources with Exa...')
      let exaResult
      if (!context.exaApiKey) {
        log('warn', 'Exa API key not provided, skipping Exa search')
        exaResult = { success: false, error: 'Exa API key not provided', totalCost: 0 }
      } else {
        try {
          const exaService = new ExaSearchService(context.exaApiKey)
          exaResult = await exaService.performResearch(keyword)
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error)
          log('warn', 'Exa search failed', { error: errorMsg })
          exaResult = { success: false, error: errorMsg, totalCost: 0 }
        }
      }
      const exaData = exaResult.success ? exaResult.data : null
      if (!exaResult.success) {
        log('warn', 'Exa search failed', { error: exaResult.error })
      }

      // Calculate recommended word count from competitor analysis
      onProgress?.('Analyzing competitor content...')
      const competitorWordCounts = await this.analyzeCompetitorContent(
        researchData.serpResults,
        log
      )

      const avgCompetitorWordCount = competitorWordCounts.length > 0
        ? Math.round(competitorWordCounts.reduce((a, b) => a + b, 0) / competitorWordCounts.length)
        : 1500

      // Recommended word count: 10-20% more than competitor average, or use target
      const recommendedWordCount = targetWordCount
        ?? Math.min(Math.round(avgCompetitorWordCount * 1.15), 5000)

      // Identify content gaps
      onProgress?.('Identifying content gaps...')
      const contentGaps = this.identifyContentGaps(
        researchData.paaQuestions,
        researchData.relatedKeywords
      )

      // Build research output
      const output: ResearchOutput = {
        keyword,
        keywordData: {
          searchVolume: researchData.keywordData.searchVolume ?? undefined,
          difficulty: researchData.keywordData.difficulty ?? undefined,
          intent: researchData.keywordData.intent ?? undefined,
          cpc: researchData.keywordData.cpc ?? undefined,
        },
        competitors: researchData.serpResults.slice(0, 10).map(r => ({
          url: r.url,
          title: r.title,
          wordCount: competitorWordCounts[researchData.serpResults.indexOf(r)] || undefined,
          headings: undefined, // Would require additional crawling
        })),
        relatedKeywords: [
          ...researchData.relatedKeywords.slice(0, 10),
          ...researchData.keywordSuggestions.slice(0, 5),
        ],
        paaQuestions: researchData.paaQuestions.slice(0, 10),
        recommendedWordCount,
        contentGaps,
        exaData,
      }

      // Validate output
      const parseResult = researchOutputSchema.safeParse(output)
      if (!parseResult.success) {
        log('error', 'Output validation failed', parseResult.error)
        return this.failure(
          `Output validation failed: ${parseResult.error.message}`,
          { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          0
        )
      }

      const duration = Date.now() - startTime
       log('info', `Research complete in ${duration}ms. Recommended word count: ${recommendedWordCount}`)
       onProgress?.(`Research complete. Found ${output.competitors.length} competitors, ${output.relatedKeywords.length} related keywords.`)

       // Calculate total cost: DataForSEO + Exa
       const totalCostUsd = researchData.totalCost + exaResult.totalCost

       // No LLM tokens used - research uses external APIs
       return this.success(
         parseResult.data,
         { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
         true,
         totalCostUsd
       )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      log('error', `Research failed: ${message}`, error)
      return this.failure(message, { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, 0)
    }
  }

  // =====================================================
  // HELPERS
  // =====================================================

  /**
   * Analyze competitor content to estimate word counts
   * In production, this would crawl the pages for actual content
   */
  private async analyzeCompetitorContent(
    serpResults: Array<{ url: string; title: string; description: string | null }>,
    log: AgentContext['log']
  ): Promise<number[]> {
    // For now, estimate based on description length (heuristic)
    // TODO: Implement actual page crawling for accurate word counts
    const estimates: number[] = []

    for (const result of serpResults.slice(0, 5)) {
      // Rough estimate: description length * 10 (very rough heuristic)
      const descLength = result.description?.length ?? 0
      const estimate = descLength > 0 
        ? Math.max(800, Math.min(descLength * 12, 4000))
        : 1500  // fallback when description is null
      estimates.push(estimate)
      log('debug', `Estimated word count for ${result.url}: ${estimate}`)
    }

    return estimates
  }

  /**
   * Identify content gaps based on PAA questions and related keywords
   */
  private identifyContentGaps(
    paaQuestions: string[],
    relatedKeywords: string[]
  ): string[] {
    const gaps: string[] = []

    // Extract topics from PAA questions
    for (const question of paaQuestions.slice(0, 5)) {
      const lowerQ = question.toLowerCase()
      if (lowerQ.includes('how') || lowerQ.includes('what') || lowerQ.includes('why')) {
        gaps.push(`Answer: ${question}`)
      }
    }

    // Find unique angles from related keywords
    const uniqueTerms = new Set<string>()
    for (const kw of relatedKeywords) {
      const words = kw.toLowerCase().split(' ')
      for (const word of words) {
        if (word.length > 4 && !uniqueTerms.has(word)) {
          uniqueTerms.add(word)
        }
      }
    }

    // Limit to top 5 content gaps
    return gaps.slice(0, 5)
  }
}

// =====================================================
// REGISTER AGENT
// =====================================================

// Register agent on module load
const researchAgent = new ResearchAgent()
AgentRegistry.register(researchAgent)

export { researchAgent }

