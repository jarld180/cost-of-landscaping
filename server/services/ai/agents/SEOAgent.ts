/**
 * SEO Agent
 *
 * Third agent in the AI article writing pipeline.
 * Analyzes and optimizes content for search engines.
 * Generates meta tags, schema markup, and internal link suggestions.
 */

import { z } from 'zod'
import { BaseAIAgent, type AgentContext, type AgentResult, type SEOAgentInput } from '../AIAgent'
import { AgentRegistry } from '../AgentRegistry'
import {
  seoOutputSchema,
  type SEOOutput,
  type AIAgentType,
  type WriterOutput,
  type ResearchOutput,
} from '../../../schemas/ai.schemas'
import { PageRepository } from '../../../repositories/PageRepository'

// =====================================================
// SEO OPTIMIZATION SYSTEM PROMPT
// =====================================================

const SEO_SYSTEM_PROMPT = `You are an expert SEO analyst and optimizer. Your task is to analyze article content and provide comprehensive SEO optimization recommendations.

## YOUR RESPONSIBILITIES

### Meta Tags - CRITICAL CHARACTER LIMITS
⚠️ STRICT LIMIT: metaTitle MUST be 60 characters or FEWER - COUNT EVERY CHARACTER!
⚠️ STRICT LIMIT: metaDescription MUST be 160 characters or FEWER

When writing the metaTitle:
- Include primary keyword near the start
- Keep it SHORT and punchy - sacrifice detail for brevity
- Example good title: "landscape Driveway Costs 2025 | Pricing Guide" (44 chars)
- Example BAD title: "Cost of Landscape Pros Charleston SC 2025 | $4.50-$8/sq ft" (TOO LONG - 65 chars!)

### Content Analysis
You will be provided with:
- The article content and its headings
- Keyword density calculation (already computed)
- Heading structure analysis (already computed)
- List of existing site pages for internal linking

### Your Analysis Should Include
1. Evaluate heading structure and suggest improvements
2. Analyze keyword usage and provide optimization advice
3. Suggest which existing pages would make good internal links

### Output Format
You MUST respond with valid JSON matching this exact structure:
{
  "metaTitle": "Short SEO title ≤60 chars",
  "metaDescription": "Compelling description under 160 characters with CTA",
  "headingAnalysis": {
    "isValid": true,
    "issues": ["List of heading structure issues"],
    "suggestions": ["Suggestions for improvement"]
  },
  "keywordDensity": {
    "percentage": 1.5,
    "analysis": "Analysis of keyword usage"
  },
  "schemaMarkup": {},
  "internalLinks": [
    {
      "anchorText": "suggested anchor text",
      "suggestedPath": "/path/to/page",
      "reason": "why this link is relevant"
    }
  ],
  "optimizationScore": 85
}

## IMPORTANT RULES
- metaTitle: HARD LIMIT of 60 characters - this is validated and will REJECT longer titles
- metaDescription: HARD LIMIT of 160 characters
- Include primary keyword naturally in both
- Score should reflect overall SEO optimization (0-100)
`

// =====================================================
// TYPES
// =====================================================

interface HeadingInfo {
  level: number
  text: string
}

interface ExistingPage {
  title: string
  path: string
  description: string | null
}

// =====================================================
// AGENT IMPLEMENTATION
// =====================================================

export class SEOAgent extends BaseAIAgent<SEOAgentInput, SEOOutput> {
  readonly agentType: AIAgentType = 'seo'
  readonly name = 'SEO Agent'
  readonly description = 'Analyzes and optimizes content for search engines'

  // =====================================================
  // VALIDATION
  // =====================================================

  validateInput(input: unknown): input is SEOAgentInput {
    if (!input || typeof input !== 'object') return false
    const obj = input as Record<string, unknown>
    return (
      typeof obj.keyword === 'string' &&
      obj.keyword.length > 0 &&
      obj.article !== undefined
    )
  }

  getOutputSchema(): Record<string, unknown> {
    return z.toJSONSchema(seoOutputSchema)
  }

  // =====================================================
  // EXECUTION
  // =====================================================

  async execute(input: SEOAgentInput, context: AgentContext): Promise<AgentResult<SEOOutput>> {
    const { keyword, article, researchData } = input
    const { log, onProgress, llmProvider, persona, client } = context
    const startTime = Date.now()

    log('info', `Starting SEO Agent for keyword: "${keyword}"`)
    onProgress?.('SEO Agent starting content optimization...')

    try {
      const writerOutput = article as WriterOutput
      const research = researchData as ResearchOutput | undefined

      // Step 1: Extract and analyze headings
      log('debug', 'Analyzing heading structure...')
      onProgress?.('Analyzing heading structure...')
      const headings = this.extractHeadings(writerOutput.content)
      const headingAnalysis = this.analyzeHeadingStructure(headings)
      log('info', `Found ${headings.length} headings. Valid structure: ${headingAnalysis.isValid}`)

      // Step 2: Calculate keyword density
      log('debug', 'Calculating keyword density...')
      onProgress?.('Calculating keyword density...')
      const keywordDensity = this.calculateKeywordDensity(writerOutput.content, keyword)
      log('info', `Keyword density: ${keywordDensity.percentage.toFixed(2)}%`)

      // Step 3: Get existing pages for internal linking
      log('debug', 'Fetching existing pages for internal link suggestions...')
      onProgress?.('Analyzing potential internal links...')
      const existingPages = await this.getExistingPages(client, log)
      log('info', `Found ${existingPages.length} published pages for internal linking`)

      // Step 4: Generate schema markup
      log('debug', 'Generating Article schema markup...')
      const schemaMarkup = this.generateArticleSchema(writerOutput, keyword)

      // Step 5: Call LLM for meta optimization and final analysis
      log('debug', 'Calling LLM for meta tag optimization...')
      onProgress?.('Optimizing meta tags with AI...')

      const userPrompt = this.buildUserPrompt(
        keyword,
        writerOutput,
        headings,
        headingAnalysis,
        keywordDensity,
        existingPages,
        research
      )

      const systemPrompt = persona.system_prompt || SEO_SYSTEM_PROMPT

      const result = await llmProvider.generateJSONWithToolUse<SEOOutput>({
        prompt: userPrompt,
        systemPrompt,
        model: persona.model,
        schema: seoOutputSchema,
        toolName: 'generate_seo_analysis',
        toolDescription: 'Generate SEO analysis with meta tags, keyword density, and optimization recommendations',
        temperature: persona.temperature ?? 0.5,
        maxTokens: persona.max_tokens ?? 4000,
        agentName: this.agentType,
      })

      const duration = Date.now() - startTime
      const seoOutput = result.data

      // Override with our calculated values to ensure accuracy
      seoOutput.keywordDensity = keywordDensity
      seoOutput.schemaMarkup = schemaMarkup

      // Ensure meta tags are within limits
      if (seoOutput.metaTitle.length > 60) {
        log('warn', `Meta title too long (${seoOutput.metaTitle.length} chars), truncating...`)
        seoOutput.metaTitle = seoOutput.metaTitle.substring(0, 57) + '...'
      }
      if (seoOutput.metaDescription.length > 160) {
        log('warn', `Meta description too long (${seoOutput.metaDescription.length} chars), truncating...`)
        seoOutput.metaDescription = seoOutput.metaDescription.substring(0, 157) + '...'
      }

      log('info', `SEO optimization complete in ${duration}ms`)
      log('info', `Meta title: "${seoOutput.metaTitle}" (${seoOutput.metaTitle.length} chars)`)
      log('info', `Meta description: "${seoOutput.metaDescription}" (${seoOutput.metaDescription.length} chars)`)
      log('info', `Optimization score: ${seoOutput.optimizationScore}/100`)
      log('debug', `Token usage: ${result.usage.totalTokens} total | Cost: $${result.estimatedCostUsd.toFixed(4)}`)

      onProgress?.(`SEO optimization complete. Score: ${seoOutput.optimizationScore}/100`)

      // Validate output
      const parseResult = seoOutputSchema.safeParse(seoOutput)
      if (!parseResult.success) {
        log('error', 'Output validation failed', parseResult.error)
        return this.failure(
          `Output validation failed: ${parseResult.error.message}`,
          result.usage,
          result.estimatedCostUsd
        )
      }

      onProgress?.('SEO Agent complete. Passing to QA Agent...')

      return this.success(parseResult.data, result.usage, true, result.estimatedCostUsd)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      log('error', `SEO Agent failed: ${message}`, error)
      return this.failure(message, { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, 0)
    }
  }


  // =====================================================
  // HELPER METHODS
  // =====================================================

  /**
   * Extract headings from markdown content
   */
  private extractHeadings(content: string): HeadingInfo[] {
    const headings: HeadingInfo[] = []
    const lines = content.split('\n')

    for (const line of lines) {
      const match = line.match(/^(#{1,6})\s+(.+)$/)
      if (match) {
        headings.push({
          level: match[1].length,
          text: match[2].trim(),
        })
      }
    }

    return headings
  }

  /**
   * Analyze heading structure for SEO best practices
   */
  private analyzeHeadingStructure(headings: HeadingInfo[]): {
    isValid: boolean
    issues: string[]
    suggestions: string[]
  } {
    const issues: string[] = []
    const suggestions: string[] = []

    // Check for H1
    const h1Count = headings.filter(h => h.level === 1).length
    if (h1Count === 0) {
      issues.push('Missing H1 heading')
      suggestions.push('Add a single H1 heading at the beginning of the article')
    } else if (h1Count > 1) {
      issues.push(`Multiple H1 headings found (${h1Count})`)
      suggestions.push('Use only one H1 heading per page for SEO best practices')
    }

    // Check heading hierarchy
    let prevLevel = 0
    for (const heading of headings) {
      if (heading.level > prevLevel + 1 && prevLevel !== 0) {
        issues.push(`Heading level skip: H${prevLevel} to H${heading.level}`)
        suggestions.push(`Consider adding H${prevLevel + 1} before "${heading.text}"`)
      }
      prevLevel = heading.level
    }

    // Check for enough headings
    const h2Count = headings.filter(h => h.level === 2).length
    if (h2Count < 3) {
      suggestions.push('Consider adding more H2 subheadings to break up content')
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions,
    }
  }

  /**
   * Calculate keyword density in content
   */
  private calculateKeywordDensity(
    content: string,
    keyword: string
  ): { percentage: number; analysis: string } {
    // Remove markdown formatting for accurate word count
    const plainText = content
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*|__/g, '')
      .replace(/\*|_/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/`[^`]+`/g, '')
      .toLowerCase()

    const words = plainText.split(/\s+/).filter(w => w.length > 0)
    const totalWords = words.length

    // Count keyword occurrences (case-insensitive, whole word)
    const keywordLower = keyword.toLowerCase()
    const keywordWords = keywordLower.split(/\s+/)
    let keywordCount = 0

    if (keywordWords.length === 1) {
      // Single word keyword
      keywordCount = words.filter(w => w.includes(keywordLower)).length
    } else {
      // Multi-word keyword - look for phrase
      const textLower = plainText
      let pos = 0
      while ((pos = textLower.indexOf(keywordLower, pos)) !== -1) {
        keywordCount++
        pos += keywordLower.length
      }
    }

    const percentage = totalWords > 0 ? (keywordCount / totalWords) * 100 : 0
    const roundedPercentage = Math.round(percentage * 100) / 100

    let analysis: string
    if (roundedPercentage < 0.5) {
      analysis = 'Keyword density is too low. Consider adding more natural mentions of the keyword.'
    } else if (roundedPercentage > 2.5) {
      analysis = 'Keyword density is too high. This may appear as keyword stuffing. Consider reducing usage.'
    } else {
      analysis = 'Keyword density is within the optimal range (0.5-2.5%).'
    }

    return { percentage: roundedPercentage, analysis }
  }


  /**
   * Get existing published pages for internal link suggestions
   */
  private async getExistingPages(
    client: AgentContext['client'],
    log: AgentContext['log']
  ): Promise<ExistingPage[]> {
    try {
      const pageRepo = new PageRepository(client)
      const { pages } = await pageRepo.list({
        status: 'published',
        limit: 50,
        includeDeleted: false,
      })

      return pages.map(p => ({
        title: p.title,
        path: p.full_path,
        description: p.description,
      }))
    } catch (error) {
      log('warn', 'Failed to fetch existing pages for internal linking', error)
      return []
    }
  }

  /**
   * Generate Article schema markup (JSON-LD)
   */
  private generateArticleSchema(
    article: WriterOutput,
    keyword: string
  ): Record<string, unknown> {
    const now = new Date().toISOString()

    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description: article.excerpt,
      keywords: keyword,
      wordCount: article.wordCount,
      datePublished: now,
      dateModified: now,
      author: {
        '@type': 'Organization',
        name: 'Cost of Landscaping',
      },
      publisher: {
        '@type': 'Organization',
        name: 'Cost of Landscaping',
        logo: {
          '@type': 'ImageObject',
          url: 'https://costoflandscaping.com/logo.png',
        },
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': `https://costoflandscaping.com/${article.slug}`,
      },
    }
  }

  /**
   * Build the user prompt for LLM optimization
   */
  private buildUserPrompt(
    keyword: string,
    article: WriterOutput,
    headings: HeadingInfo[],
    headingAnalysis: { isValid: boolean; issues: string[]; suggestions: string[] },
    keywordDensity: { percentage: number; analysis: string },
    existingPages: ExistingPage[],
    research?: ResearchOutput
  ): string {
    const sections: string[] = []

    sections.push(`## Target Keyword: "${keyword}"`)
    sections.push('')

    sections.push('## Article to Optimize')
    sections.push(`Title: ${article.title}`)
    sections.push(`Word Count: ${article.wordCount}`)
    sections.push(`Excerpt: ${article.excerpt}`)
    sections.push('')

    sections.push('## Current Heading Structure')
    for (const h of headings) {
      sections.push(`${'  '.repeat(h.level - 1)}H${h.level}: ${h.text}`)
    }
    sections.push('')

    sections.push('## Heading Analysis (Pre-computed)')
    sections.push(`Valid: ${headingAnalysis.isValid}`)
    if (headingAnalysis.issues.length > 0) {
      sections.push('Issues:')
      headingAnalysis.issues.forEach(i => sections.push(`- ${i}`))
    }
    if (headingAnalysis.suggestions.length > 0) {
      sections.push('Suggestions:')
      headingAnalysis.suggestions.forEach(s => sections.push(`- ${s}`))
    }
    sections.push('')

    sections.push('## Keyword Density (Pre-computed)')
    sections.push(`Density: ${keywordDensity.percentage}%`)
    sections.push(`Analysis: ${keywordDensity.analysis}`)
    sections.push('')

    if (existingPages.length > 0) {
      sections.push('## Existing Site Pages (for internal linking)')
      for (const page of existingPages.slice(0, 20)) {
        sections.push(`- ${page.title}: ${page.path}`)
        if (page.description) {
          sections.push(`  Description: ${page.description.substring(0, 100)}...`)
        }
      }
      sections.push('')
    }

    if (research) {
      sections.push('## Research Context')
      if (research.relatedKeywords.length > 0) {
        sections.push(`Related Keywords: ${research.relatedKeywords.slice(0, 10).join(', ')}`)
      }
      sections.push('')
    }

    sections.push('## Your Task')
    sections.push('⚠️ CRITICAL: metaTitle MUST be ≤60 characters - COUNT CAREFULLY!')
    sections.push('1. Create an optimized meta title (HARD LIMIT: 60 chars max) with the keyword')
    sections.push('   - Good example: "landscape Costs Charleston 2025 | Pricing" (42 chars)')
    sections.push('   - Bad example: "Cost of Landscape Pros Charleston SC 2025 | Pricing Guide" (TOO LONG!)')
    sections.push('2. Create a compelling meta description (max 160 chars) with CTA')
    sections.push('3. Use the pre-computed heading analysis in your response')
    sections.push('4. Use the pre-computed keyword density in your response')
    sections.push('5. Suggest 2-5 internal links from the existing pages list')
    sections.push('6. Calculate an overall optimization score (0-100)')
    sections.push('')
    sections.push('## REQUIRED JSON FIELD NAMES (use camelCase exactly)')
    sections.push('- "metaTitle" (NOT meta_title) - ⚠️ MUST BE ≤60 CHARACTERS')
    sections.push('- "metaDescription" (NOT meta_description)')
    sections.push('- "headingAnalysis" with "isValid", "issues", "suggestions"')
    sections.push('- "keywordDensity" with "percentage", "analysis"')
    sections.push('- "internalLinks" array with "anchorText", "suggestedPath", "reason"')
    sections.push('- "optimizationScore" (integer 0-100)')
    sections.push('')
    sections.push('Respond ONLY with valid JSON. Do NOT wrap in markdown code blocks.')

    return sections.join('\n')
  }
}

// =====================================================
// REGISTER AGENT
// =====================================================

// Register agent on module load
const seoAgent = new SEOAgent()
AgentRegistry.register(seoAgent)

export { seoAgent }
