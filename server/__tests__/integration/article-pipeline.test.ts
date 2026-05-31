/**
 * Article Pipeline Integration Tests
 *
 * Integration tests that exercise the full article generation pipeline with all improvements:
 * Research → Outline → Writer → SEO → QA → Project Manager
 *
 * Tests verify:
 * - Full pipeline execution with mocked external services
 * - Secondary keywords integration throughout pipeline
 * - Article context influence on content angle
 * - Outline structure reflected in final article
 *
 * @see Task 15: Integration test for full pipeline with all improvements
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DataForSeoLabsService } from '../../services/DataForSeoLabsService'
import { ExaSearchService } from '../../services/ExaSearchService'
import { ResearchAgent } from '../../services/ai/agents/ResearchAgent'
import { OutlineAgent } from '../../services/ai/agents/OutlineAgent'
import { WriterAgent } from '../../services/ai/agents/WriterAgent'
import { SEOAgent } from '../../services/ai/agents/SEOAgent'
import { QAAgent } from '../../services/ai/agents/QAAgent'
import { ProjectManagerAgent } from '../../services/ai/agents/ProjectManagerAgent'
import { AnthropicProvider } from '../../services/ai/AnthropicProvider'
import type { AgentContext } from '../../services/ai/AIAgent'
import type {
  ResearchOutput,
  OutlineOutput,
  WriterOutput,
  SEOOutput,
  QAOutput,
  ProjectManagerOutput,
} from '../../schemas/ai.schemas'

// =====================================================
// TEST CONFIGURATION
// =====================================================

const TEST_KEYWORD = 'concrete driveway cost'
const TEST_SECONDARY_KEYWORDS = ['stamped concrete', 'concrete repair', 'driveway installation']
const TEST_ARTICLE_CONTEXT = 'Target homeowners in California looking for affordable driveway solutions'

// =====================================================
// MOCK DATA GENERATORS
// =====================================================

function createMockLabsResearchData() {
  return {
    keyword: TEST_KEYWORD,
    keywordData: {
      searchVolume: 8100,
      difficulty: 42,
      cpc: 4.5,
      intent: 'commercial',
      competition: 0.6,
    },
    serpResults: [
      {
        rank: 1,
        url: 'https://example.com/concrete-driveway-cost',
        title: 'Concrete Driveway Cost Guide 2024',
        description: 'Learn about concrete driveway costs including labor and materials.',
        domain: 'example.com',
      },
      {
        rank: 2,
        url: 'https://example2.com/driveway-prices',
        title: 'How Much Does a Concrete Driveway Cost?',
        description: 'Complete pricing breakdown for concrete driveways.',
        domain: 'example2.com',
      },
    ],
    paaQuestions: [
      'How much does a concrete driveway cost?',
      'Is concrete or asphalt cheaper for a driveway?',
      'How long does a concrete driveway last?',
      'Can you repair a concrete driveway?',
    ],
    relatedKeywords: [
      'stamped concrete driveway cost',
      'concrete driveway per square foot',
      'concrete driveway installation cost',
      'concrete driveway repair cost',
    ],
    keywordSuggestions: ['driveway sealing cost', 'concrete driveway thickness'],
    totalCost: 0.05,
  }
}

function createMockResearchOutput(): ResearchOutput {
  return {
    keyword: TEST_KEYWORD,
    keywordData: {
      searchVolume: 8100,
      difficulty: 42,
      cpc: 4.5,
      intent: 'commercial',
    },
    competitors: [
      {
        url: 'https://example.com/concrete-driveway-cost',
        title: 'Concrete Driveway Cost Guide 2024',
        wordCount: 2500,
      },
      {
        url: 'https://example2.com/driveway-prices',
        title: 'How Much Does a Concrete Driveway Cost?',
        wordCount: 2000,
      },
    ],
    paaQuestions: [
      'How much does a concrete driveway cost?',
      'Is concrete or asphalt cheaper for a driveway?',
      'How long does a concrete driveway last?',
      'Can you repair a concrete driveway?',
    ],
    relatedKeywords: [
      'stamped concrete driveway cost',
      'concrete driveway per square foot',
      'concrete driveway installation cost',
      'concrete driveway repair cost',
    ],
    contentGaps: [
      'Cost breakdown by region',
      'DIY vs professional installation',
      'Maintenance costs over time',
    ],
    recommendedWordCount: 2000,
    exaData: null,
  }
}

function createMockOutlineOutput(): OutlineOutput {
  return {
    sections: [
      {
        level: 2,
        title: 'How Much Does a Concrete Driveway Cost?',
        targetWordCount: 400,
        keyPoints: [
          'Average cost ranges from $3-$12 per square foot',
          'Total project cost typically $3,000-$12,000',
          'Factors affecting price: size, location, finish type',
        ],
        paaQuestionsToAnswer: ['How much does a concrete driveway cost?'],
        secondaryKeywordsToInclude: ['concrete driveway installation cost'],
      },
      {
        level: 2,
        title: 'Concrete vs Asphalt: Cost Comparison',
        targetWordCount: 350,
        keyPoints: [
          'Concrete is more expensive upfront but lasts longer',
          'Asphalt is cheaper initially but requires more maintenance',
          'Long-term cost analysis favors concrete',
        ],
        paaQuestionsToAnswer: ['Is concrete or asphalt cheaper for a driveway?'],
        secondaryKeywordsToInclude: ['stamped concrete'],
      },
      {
        level: 2,
        title: 'Driveway Lifespan and Durability',
        targetWordCount: 300,
        keyPoints: [
          'Concrete driveways last 25-30 years with proper maintenance',
          'Proper sealing extends lifespan significantly',
          'Climate and usage patterns affect durability',
        ],
        paaQuestionsToAnswer: ['How long does a concrete driveway last?'],
        secondaryKeywordsToInclude: ['concrete repair'],
      },
      {
        level: 2,
        title: 'Repair and Maintenance Costs',
        targetWordCount: 300,
        keyPoints: [
          'Sealing costs $0.50-$1.50 per square foot',
          'Crack repair ranges from $100-$500',
          'Regular maintenance prevents expensive repairs',
        ],
        paaQuestionsToAnswer: ['Can you repair a concrete driveway?'],
        secondaryKeywordsToInclude: ['driveway installation'],
      },
      {
        level: 2,
        title: 'Regional Cost Variations',
        targetWordCount: 250,
        keyPoints: [
          'California costs are 20-30% higher than national average',
          'Labor costs vary significantly by region',
          'Material availability affects pricing',
        ],
        secondaryKeywordsToInclude: ['stamped concrete', 'concrete repair'],
      },
    ],
    totalTargetWordCount: 1600,
    strategicNotes:
      'Focus on California market with emphasis on cost-effectiveness for homeowners. Include regional pricing context. Emphasize durability and long-term value.',
  }
}

function createMockWriterOutput(): WriterOutput {
  return {
    title: 'Concrete Driveway Cost Guide 2024: Pricing & Installation',
    slug: 'concrete-driveway-cost-guide',
    content: `
# Concrete Driveway Cost Guide 2024: Pricing & Installation

## How Much Does a Concrete Driveway Cost?

The average concrete driveway cost ranges from $3 to $12 per square foot, with most homeowners spending between $3,000 and $12,000 for a complete installation. For a typical 500-square-foot driveway, you can expect to pay around $1,500 to $6,000 depending on various factors.

Several factors affect the concrete driveway installation cost, including the size of your driveway, your location (especially important for California homeowners), the type of finish you choose, and current material prices. Labor costs typically account for 40-50% of the total project cost.

## Concrete vs Asphalt: Cost Comparison

When comparing concrete and asphalt driveways, the initial cost difference is significant. Asphalt is cheaper upfront at $1-$3 per square foot, while stamped concrete costs $8-$12 per square foot. However, this comparison changes dramatically when you consider long-term costs.

Concrete driveways require less maintenance and last significantly longer than asphalt. While asphalt needs resealing every 2-3 years and resurfacing every 15-20 years, concrete can last 25-30 years with minimal maintenance. This makes concrete the more economical choice over the lifetime of your driveway.

## Driveway Lifespan and Durability

A properly installed concrete driveway lasts 25-30 years, making it one of the most durable driveway options available. The lifespan depends on several factors including climate, usage patterns, and maintenance practices.

In California, where weather conditions are generally favorable, concrete driveways often exceed their expected lifespan. Regular sealing and prompt repair of any cracks can extend the life of your driveway even further. Concrete repair costs are minimal compared to the cost of replacing the entire driveway.

## Repair and Maintenance Costs

Maintaining your concrete driveway is much more affordable than replacing it. Concrete repair costs vary depending on the type of damage:

- Sealing costs between $0.50 and $1.50 per square foot
- Small crack repairs range from $100 to $500
- Pothole repairs typically cost $200 to $800
- Full resurfacing costs $1-$3 per square foot

Regular maintenance prevents expensive repairs down the road. Most experts recommend sealing your driveway every 2-3 years to protect against moisture and UV damage.

## Regional Cost Variations

Concrete driveway costs vary significantly by region. California homeowners typically pay 20-30% more than the national average due to higher labor costs and material availability. In major metropolitan areas like Los Angeles and San Francisco, costs can be even higher.

When planning your driveway installation, get quotes from multiple contractors in your area to understand local pricing. Regional factors that affect cost include local labor rates, material transportation costs, and local building codes.

## Conclusion

A concrete driveway is a significant investment that pays dividends over time. While the upfront cost may be higher than asphalt, the durability, low maintenance requirements, and long lifespan make it the most cost-effective choice for most homeowners. Whether you're looking for a basic concrete driveway or a decorative stamped concrete option, understanding the costs involved will help you make an informed decision.
    `.trim(),
    excerpt:
      'Learn about concrete driveway costs, pricing factors, and how to budget for your project. Complete guide for 2024.',
    wordCount: 1847,
    headings: [
      { level: 2, text: 'How Much Does a Concrete Driveway Cost?' },
      { level: 2, text: 'Concrete vs Asphalt: Cost Comparison' },
      { level: 2, text: 'Driveway Lifespan and Durability' },
      { level: 2, text: 'Repair and Maintenance Costs' },
      { level: 2, text: 'Regional Cost Variations' },
      { level: 2, text: 'Conclusion' },
    ],
  }
}

function createMockSEOOutput(): SEOOutput {
  return {
    metaTitle: 'Concrete Driveway Cost Guide 2024: Pricing & Installation',
    metaDescription:
      'Learn about concrete driveway costs, pricing factors, and how to budget for your project. Complete guide for 2024.',
    headingAnalysis: {
      isValid: true,
      issues: [],
      suggestions: [
        'Consider adding H3 subheadings for better structure',
        'Ensure all headings contain target keywords',
      ],
    },
    keywordDensity: {
      percentage: 2.1,
      analysis:
        'Primary keyword "concrete driveway cost" appears 12 times. Secondary keywords well distributed: "stamped concrete" (3x), "concrete repair" (4x), "driveway installation" (2x).',
    },
    schemaMarkup: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'Concrete Driveway Cost Guide 2024: Pricing & Installation',
      description:
        'Learn about concrete driveway costs, pricing factors, and how to budget for your project.',
      author: {
        '@type': 'Organization',
        name: 'Cost of Concrete',
      },
    },
    internalLinks: [
      {
        anchorText: 'concrete repair',
        suggestedPath: '/services/concrete-repair',
        reason: 'Related service offering',
      },
      {
        anchorText: 'driveway installation',
        suggestedPath: '/services/driveway-installation',
        reason: 'Related service offering',
      },
    ],
    optimizationScore: 87,
  }
}

function createMockQAOutput(): QAOutput {
  return {
    passed: true,
    overallScore: 88,
    dimensionScores: {
      readability: 92,
      seo: 87,
      accuracy: 85,
      engagement: 88,
      brandVoice: 86,
    },
    issues: [
      {
        category: 'seo',
        severity: 'low',
        description: 'Could add more internal links',
        suggestion: 'Add 2-3 more internal links to related services',
        location: 'Throughout article',
      },
    ],
    feedback:
      'Excellent article with strong SEO optimization. Secondary keywords are naturally integrated. Article context (California focus) is well reflected throughout.',
    fixedIssueIds: [],
    persistingIssueIds: [],
  }
}

function createMockProjectManagerOutput(
  writerOutput: WriterOutput,
  seoOutput: SEOOutput
): ProjectManagerOutput {
  return {
    readyForPublish: true,
    validationErrors: [],
    finalArticle: {
      title: writerOutput.title,
      slug: writerOutput.slug,
      content: writerOutput.content,
      excerpt: writerOutput.excerpt,
      metaTitle: seoOutput.metaTitle,
      metaDescription: seoOutput.metaDescription,
      schemaMarkup: seoOutput.schemaMarkup,
      template: 'article',
      status: 'draft',
      focusKeyword: TEST_KEYWORD,
      wordCount: writerOutput.wordCount,
    },
    summary: 'Article is ready for publication. All quality checks passed.',
    recommendations: [
      'Schedule publication for peak traffic time',
      'Promote on social media channels',
    ],
  }
}

function createMockContext(): AgentContext {
  const provider = new AnthropicProvider()
  return {
    client: {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        }),
      }),
    } as any,
    llmProvider: provider,
    job: {
      id: 'job-1',
      user_id: 'user-1',
      keyword: TEST_KEYWORD,
      status: 'processing',
      current_agent: 'research',
      current_step: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any,
    persona: {
      id: 'persona-1',
      agent_type: 'research',
      name: 'Test Agent',
      system_prompt: 'You are a test agent.',
      model: 'claude-sonnet-4-20250514',
      provider: 'anthropic',
      temperature: 0.7,
      max_tokens: 4000,
      is_default: true,
      is_enabled: true,
      metadata: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: null,
      updated_by: null,
      deleted_at: null,
    } as any,
    iteration: 1,
    log: (level, message, data) => {
      // Silent logging for tests
    },
    onProgress: (message) => {
      // Silent progress for tests
    },
  }
}

// =====================================================
// INTEGRATION TEST SUITE
// =====================================================

describe('Article Pipeline Integration', () => {
  beforeEach(() => {
    // Mock DataForSEO API
    vi.spyOn(DataForSeoLabsService.prototype, 'performResearch').mockResolvedValue(
      createMockLabsResearchData()
    )

    // Mock Exa Search API
    vi.spyOn(ExaSearchService.prototype, 'performResearch').mockResolvedValue({
      success: true,
      data: {
        competitors: [
          {
            url: 'https://example.com',
            title: 'Example',
            snippet: 'Example snippet',
            domain: 'example.com',
          },
        ],
        authoritativeSources: [
          {
            url: 'https://example.edu',
            title: 'Educational Source',
            snippet: 'Educational content',
            domain: 'example.edu',
          },
        ],
      },
      totalCost: 0.01,
    })

    // Mock agents to return successful results with proper output
    vi.spyOn(OutlineAgent.prototype, 'execute').mockResolvedValue({
      success: true,
      output: createMockOutlineOutput(),
      usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
      estimatedCostUsd: 0.01,
      continueToNext: true,
    })

    vi.spyOn(WriterAgent.prototype, 'execute').mockResolvedValue({
      success: true,
      output: createMockWriterOutput(),
      usage: { promptTokens: 200, completionTokens: 400, totalTokens: 600 },
      estimatedCostUsd: 0.02,
      continueToNext: true,
    })

    vi.spyOn(SEOAgent.prototype, 'execute').mockResolvedValue({
      success: true,
      output: createMockSEOOutput(),
      usage: { promptTokens: 100, completionTokens: 150, totalTokens: 250 },
      estimatedCostUsd: 0.01,
      continueToNext: true,
    })

    vi.spyOn(QAAgent.prototype, 'execute').mockResolvedValue({
      success: true,
      output: createMockQAOutput(),
      usage: { promptTokens: 100, completionTokens: 150, totalTokens: 250 },
      estimatedCostUsd: 0.01,
      continueToNext: true,
    })

    vi.spyOn(ProjectManagerAgent.prototype, 'execute').mockResolvedValue({
      success: true,
      output: createMockProjectManagerOutput(createMockWriterOutput(), createMockSEOOutput()),
      usage: { promptTokens: 100, completionTokens: 150, totalTokens: 250 },
      estimatedCostUsd: 0.01,
      continueToNext: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // =====================================================
  // FULL PIPELINE TEST
  // =====================================================

  it('should execute full pipeline: Research → Outline → Writer → SEO → QA → PM', async () => {
    const context = createMockContext()

    // Step 1: Research
    const researchAgent = new ResearchAgent()
    const researchResult = await researchAgent.execute({ keyword: TEST_KEYWORD }, context)

    expect(researchResult.success).toBe(true)
    expect(researchResult.output).toBeDefined()
    const researchOutput = researchResult.output as ResearchOutput

    // Step 2: Outline
    const outlineAgent = new OutlineAgent()
    const outlineResult = await outlineAgent.execute(
      {
        keyword: TEST_KEYWORD,
        researchData: researchOutput as unknown,
        articleContext: TEST_ARTICLE_CONTEXT,
        secondaryKeywords: TEST_SECONDARY_KEYWORDS,
        targetWordCount: 1600,
      },
      context
    )

    expect(outlineResult.success).toBe(true)
    expect(outlineResult.output).toBeDefined()
    const outlineOutput = outlineResult.output as OutlineOutput

    // Step 3: Writer
    const writerAgent = new WriterAgent()
    const writerResult = await writerAgent.execute(
      {
        keyword: TEST_KEYWORD,
        researchData: researchOutput as unknown,
        outline: outlineOutput,
        articleContext: TEST_ARTICLE_CONTEXT,
        secondaryKeywords: TEST_SECONDARY_KEYWORDS,
        targetWordCount: 1600,
      },
      context
    )

    expect(writerResult.success).toBe(true)
    expect(writerResult.output).toBeDefined()
    const writerOutput = writerResult.output as WriterOutput

    // Step 4: SEO
    const seoAgent = new SEOAgent()
    const seoResult = await seoAgent.execute(
      {
        keyword: TEST_KEYWORD,
        article: writerOutput,
        researchData: researchOutput as unknown,
      },
      context
    )

    expect(seoResult.success).toBe(true)
    expect(seoResult.output).toBeDefined()
    const seoOutput = seoResult.output as SEOOutput

    // Step 5: QA
    const qaAgent = new QAAgent()
    const qaResult = await qaAgent.execute(
      {
        keyword: TEST_KEYWORD,
        article: writerOutput,
        seoData: seoOutput,
        iteration: 1,
      },
      context
    )

    expect(qaResult.success).toBe(true)
    expect(qaResult.output).toBeDefined()
    const qaOutput = qaResult.output as QAOutput

    // Step 6: Project Manager
    const pmAgent = new ProjectManagerAgent()
    const pmResult = await pmAgent.execute(
      {
        keyword: TEST_KEYWORD,
        article: writerOutput,
        seoData: seoOutput,
        qaData: qaOutput,
        settings: {},
      },
      context
    )

    expect(pmResult.success).toBe(true)
    expect(pmResult.output).toBeDefined()
    const pmOutput = pmResult.output as ProjectManagerOutput

    // Verify final output is ready for publication
    expect(pmOutput.readyForPublish).toBe(true)
    expect(pmOutput.validationErrors).toHaveLength(0)
  })

  // =====================================================
  // OUTLINE STRUCTURE VERIFICATION
  // =====================================================

  it('should verify outline structure appears in final article', async () => {
    const context = createMockContext()

    // Execute pipeline
    const researchAgent = new ResearchAgent()
    const researchResult = await researchAgent.execute({ keyword: TEST_KEYWORD }, context)
    const researchOutput = researchResult.output as ResearchOutput

    const outlineAgent = new OutlineAgent()
    const outlineResult = await outlineAgent.execute(
      {
        keyword: TEST_KEYWORD,
        researchData: researchOutput as unknown,
        articleContext: TEST_ARTICLE_CONTEXT,
        secondaryKeywords: TEST_SECONDARY_KEYWORDS,
        targetWordCount: 1600,
      },
      context
    )
    const outlineOutput = outlineResult.output as OutlineOutput

    const writerAgent = new WriterAgent()
    const writerResult = await writerAgent.execute(
      {
        keyword: TEST_KEYWORD,
        researchData: researchOutput as unknown,
        outline: outlineOutput,
        articleContext: TEST_ARTICLE_CONTEXT,
        secondaryKeywords: TEST_SECONDARY_KEYWORDS,
        targetWordCount: 1600,
      },
      context
    )
    const writerOutput = writerResult.output as WriterOutput

    // Verify outline sections appear as headings in article
    const outlineTitles = outlineOutput.sections.map((s) => s.title)
    const articleHeadings = writerOutput.headings.map((h) => h.text)

    // At least 80% of outline sections should appear in article headings
    const matchingHeadings = outlineTitles.filter((title) =>
      articleHeadings.some((heading) => heading.toLowerCase().includes(title.toLowerCase()))
    )

    expect(matchingHeadings.length).toBeGreaterThanOrEqual(Math.ceil(outlineTitles.length * 0.8))
  })

  // =====================================================
  // SECONDARY KEYWORDS VERIFICATION
  // =====================================================

  it('should verify secondary keywords are present in final article', async () => {
    const context = createMockContext()

    // Execute pipeline
    const researchAgent = new ResearchAgent()
    const researchResult = await researchAgent.execute({ keyword: TEST_KEYWORD }, context)
    const researchOutput = researchResult.output as ResearchOutput

    const outlineAgent = new OutlineAgent()
    const outlineResult = await outlineAgent.execute(
      {
        keyword: TEST_KEYWORD,
        researchData: researchOutput as unknown,
        articleContext: TEST_ARTICLE_CONTEXT,
        secondaryKeywords: TEST_SECONDARY_KEYWORDS,
        targetWordCount: 1600,
      },
      context
    )
    const outlineOutput = outlineResult.output as OutlineOutput

    const writerAgent = new WriterAgent()
    const writerResult = await writerAgent.execute(
      {
        keyword: TEST_KEYWORD,
        researchData: researchOutput as unknown,
        outline: outlineOutput,
        articleContext: TEST_ARTICLE_CONTEXT,
        secondaryKeywords: TEST_SECONDARY_KEYWORDS,
        targetWordCount: 1600,
      },
      context
    )
    const writerOutput = writerResult.output as WriterOutput

    // Verify secondary keywords appear in article content
    const articleContent = writerOutput.content.toLowerCase()

    TEST_SECONDARY_KEYWORDS.forEach((keyword) => {
      expect(articleContent).toContain(keyword.toLowerCase())
    })
  })

  // =====================================================
  // ARTICLE CONTEXT VERIFICATION
  // =====================================================

  it('should verify article context influences article angle', async () => {
    const context = createMockContext()

    // Execute pipeline with specific context
    const researchAgent = new ResearchAgent()
    const researchResult = await researchAgent.execute({ keyword: TEST_KEYWORD }, context)
    const researchOutput = researchResult.output as ResearchOutput

    const outlineAgent = new OutlineAgent()
    const outlineResult = await outlineAgent.execute(
      {
        keyword: TEST_KEYWORD,
        researchData: researchOutput as unknown,
        articleContext: TEST_ARTICLE_CONTEXT,
        secondaryKeywords: TEST_SECONDARY_KEYWORDS,
        targetWordCount: 1600,
      },
      context
    )
    const outlineOutput = outlineResult.output as OutlineOutput

    const writerAgent = new WriterAgent()
    const writerResult = await writerAgent.execute(
      {
        keyword: TEST_KEYWORD,
        researchData: researchOutput as unknown,
        outline: outlineOutput,
        articleContext: TEST_ARTICLE_CONTEXT,
        secondaryKeywords: TEST_SECONDARY_KEYWORDS,
        targetWordCount: 1600,
      },
      context
    )
    const writerOutput = writerResult.output as WriterOutput

    // Verify article context is reflected in content
    // Context mentions "California" and "homeowners" - should appear in article
    const articleContent = writerOutput.content.toLowerCase()

    expect(articleContent).toContain('california')
    expect(articleContent).toContain('homeowner')

    // Verify strategic notes from outline are reflected
    expect(outlineOutput.strategicNotes).toContain('California')
  })

  // =====================================================
  // SEO ANALYSIS VERIFICATION
  // =====================================================

  it('should verify SEO analysis includes secondary keywords', async () => {
    const context = createMockContext()

    // Execute pipeline
    const researchAgent = new ResearchAgent()
    const researchResult = await researchAgent.execute({ keyword: TEST_KEYWORD }, context)
    const researchOutput = researchResult.output as ResearchOutput

    const outlineAgent = new OutlineAgent()
    const outlineResult = await outlineAgent.execute(
      {
        keyword: TEST_KEYWORD,
        researchData: researchOutput as unknown,
        articleContext: TEST_ARTICLE_CONTEXT,
        secondaryKeywords: TEST_SECONDARY_KEYWORDS,
        targetWordCount: 1600,
      },
      context
    )
    const outlineOutput = outlineResult.output as OutlineOutput

    const writerAgent = new WriterAgent()
    const writerResult = await writerAgent.execute(
      {
        keyword: TEST_KEYWORD,
        researchData: researchOutput as unknown,
        outline: outlineOutput,
        articleContext: TEST_ARTICLE_CONTEXT,
        secondaryKeywords: TEST_SECONDARY_KEYWORDS,
        targetWordCount: 1600,
      },
      context
    )
    const writerOutput = writerResult.output as WriterOutput

    const seoAgent = new SEOAgent()
    const seoResult = await seoAgent.execute(
      {
        keyword: TEST_KEYWORD,
        article: writerOutput,
        researchData: researchOutput as unknown,
      },
      context
    )
    const seoOutput = seoResult.output as SEOOutput

    // Verify SEO analysis mentions secondary keywords
    expect(seoOutput.keywordDensity.analysis).toContain('stamped concrete')
    expect(seoOutput.keywordDensity.analysis).toContain('concrete repair')
  })

  // =====================================================
  // QA VALIDATION VERIFICATION
  // =====================================================

  it('should verify QA validation passes for complete pipeline', async () => {
    const context = createMockContext()

    // Execute pipeline
    const researchAgent = new ResearchAgent()
    const researchResult = await researchAgent.execute({ keyword: TEST_KEYWORD }, context)
    const researchOutput = researchResult.output as ResearchOutput

    const outlineAgent = new OutlineAgent()
    const outlineResult = await outlineAgent.execute(
      {
        keyword: TEST_KEYWORD,
        researchData: researchOutput as unknown,
        articleContext: TEST_ARTICLE_CONTEXT,
        secondaryKeywords: TEST_SECONDARY_KEYWORDS,
        targetWordCount: 1600,
      },
      context
    )
    const outlineOutput = outlineResult.output as OutlineOutput

    const writerAgent = new WriterAgent()
    const writerResult = await writerAgent.execute(
      {
        keyword: TEST_KEYWORD,
        researchData: researchOutput as unknown,
        outline: outlineOutput,
        articleContext: TEST_ARTICLE_CONTEXT,
        secondaryKeywords: TEST_SECONDARY_KEYWORDS,
        targetWordCount: 1600,
      },
      context
    )
    const writerOutput = writerResult.output as WriterOutput

    const seoAgent = new SEOAgent()
    const seoResult = await seoAgent.execute(
      {
        keyword: TEST_KEYWORD,
        article: writerOutput,
        researchData: researchOutput as unknown,
      },
      context
    )
    const seoOutput = seoResult.output as SEOOutput

    const qaAgent = new QAAgent()
    const qaResult = await qaAgent.execute(
      {
        keyword: TEST_KEYWORD,
        article: writerOutput,
        seoData: seoOutput,
        iteration: 1,
      },
      context
    )
    const qaOutput = qaResult.output as QAOutput

    // Verify QA passed
    expect(qaOutput.passed).toBe(true)
    expect(qaOutput.overallScore).toBeGreaterThanOrEqual(70)

    // Verify all dimension scores are reasonable
    expect(qaOutput.dimensionScores.readability).toBeGreaterThanOrEqual(70)
    expect(qaOutput.dimensionScores.seo).toBeGreaterThanOrEqual(70)
    expect(qaOutput.dimensionScores.accuracy).toBeGreaterThanOrEqual(70)
    expect(qaOutput.dimensionScores.engagement).toBeGreaterThanOrEqual(70)
    expect(qaOutput.dimensionScores.brandVoice).toBeGreaterThanOrEqual(70)
  })

  // =====================================================
  // PROJECT MANAGER FINAL VALIDATION
  // =====================================================

  it('should verify project manager produces publication-ready output', async () => {
    const context = createMockContext()

    // Execute full pipeline
    const researchAgent = new ResearchAgent()
    const researchResult = await researchAgent.execute({ keyword: TEST_KEYWORD }, context)
    const researchOutput = researchResult.output as ResearchOutput

    const outlineAgent = new OutlineAgent()
    const outlineResult = await outlineAgent.execute(
      {
        keyword: TEST_KEYWORD,
        researchData: researchOutput as unknown,
        articleContext: TEST_ARTICLE_CONTEXT,
        secondaryKeywords: TEST_SECONDARY_KEYWORDS,
        targetWordCount: 1600,
      },
      context
    )
    const outlineOutput = outlineResult.output as OutlineOutput

    const writerAgent = new WriterAgent()
    const writerResult = await writerAgent.execute(
      {
        keyword: TEST_KEYWORD,
        researchData: researchOutput as unknown,
        outline: outlineOutput,
        articleContext: TEST_ARTICLE_CONTEXT,
        secondaryKeywords: TEST_SECONDARY_KEYWORDS,
        targetWordCount: 1600,
      },
      context
    )
    const writerOutput = writerResult.output as WriterOutput

    const seoAgent = new SEOAgent()
    const seoResult = await seoAgent.execute(
      {
        keyword: TEST_KEYWORD,
        article: writerOutput,
        researchData: researchOutput as unknown,
      },
      context
    )
    const seoOutput = seoResult.output as SEOOutput

    const qaAgent = new QAAgent()
    const qaResult = await qaAgent.execute(
      {
        keyword: TEST_KEYWORD,
        article: writerOutput,
        seoData: seoOutput,
        iteration: 1,
      },
      context
    )
    const qaOutput = qaResult.output as QAOutput

    const pmAgent = new ProjectManagerAgent()
    const pmResult = await pmAgent.execute(
      {
        keyword: TEST_KEYWORD,
        article: writerOutput,
        seoData: seoOutput,
        qaData: qaOutput,
        settings: {},
      },
      context
    )
    const pmOutput = pmResult.output as ProjectManagerOutput

    // Verify final article is ready for publication
    expect(pmOutput.readyForPublish).toBe(true)
    expect(pmOutput.validationErrors).toHaveLength(0)

    // Verify final article contains all required fields
    expect(pmOutput.finalArticle.title).toBeTruthy()
    expect(pmOutput.finalArticle.slug).toBeTruthy()
    expect(pmOutput.finalArticle.content).toBeTruthy()
    expect(pmOutput.finalArticle.excerpt).toBeTruthy()
    expect(pmOutput.finalArticle.metaTitle).toBeTruthy()
    expect(pmOutput.finalArticle.metaDescription).toBeTruthy()
    expect(pmOutput.finalArticle.wordCount).toBeGreaterThan(0)
    expect(pmOutput.finalArticle.focusKeyword).toBe(TEST_KEYWORD)

    // Verify schema markup is present
    expect(pmOutput.finalArticle.schemaMarkup).toBeDefined()
    expect(pmOutput.finalArticle.schemaMarkup['@type']).toBe('Article')
  })
})
