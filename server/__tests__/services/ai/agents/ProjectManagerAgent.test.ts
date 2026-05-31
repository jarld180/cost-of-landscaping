/**
 * Project Manager Agent Unit Tests
 *
 * Tests the ProjectManagerAgent for final article assembly.
 * Validates input validation, output schema compliance, slug generation,
 * validation logic, and recommendation generation.
 *
 * @see BAM-314 Batch 5.2: Final Article Structuring
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ProjectManagerAgent } from '../../../../services/ai/agents/ProjectManagerAgent'
import type { AgentContext, ProjectManagerAgentInput } from '../../../../services/ai/AIAgent'
import type { ILLMProvider, TokenUsage } from '../../../../services/ai/LLMProvider'
import type {
  WriterOutput,
  SEOOutput,
  QAOutput,
  AIArticleJobSettings,
} from '../../../../schemas/ai.schemas'

// =====================================================
// MOCK DATA
// =====================================================

const mockWriterOutput: WriterOutput = {
  title: 'How Much Does a Concrete Driveway Cost',
  slug: 'concrete-driveway-cost',
  content: `# How Much Does a Concrete Driveway Cost

A concrete driveway is a great investment for your home. The cost varies by region.

## Average Costs

The typical concrete driveway cost ranges from four to fifteen dollars per square foot.

## Factors That Affect Price

The size of your driveway directly impacts the total cost.

### Labor Costs

Labor costs for concrete work typically range from two to six dollars per square foot.`,
  excerpt: 'Learn about concrete driveway costs from $4-$15 per square foot.',
  wordCount: 850,
  headings: [
    { level: 2, text: 'Average Costs' },
    { level: 2, text: 'Factors That Affect Price' },
    { level: 3, text: 'Labor Costs' },
  ],
}

const mockSEOOutput: SEOOutput = {
  metaTitle: 'Concrete Driveway Cost 2024: Complete Pricing Guide',
  metaDescription: 'Learn concrete driveway costs from $4-$15/sqft. Get expert tips on saving money.',
  headingAnalysis: { isValid: true, issues: [], suggestions: [] },
  keywordDensity: { percentage: 2.0, analysis: 'Optimal' },
  schemaMarkup: {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'How Much Does a Concrete Driveway Cost',
  },
  internalLinks: [
    { anchorText: 'concrete costs', suggestedPath: '/concrete-costs', reason: 'Related topic' },
  ],
  optimizationScore: 85,
}

const mockQAOutput: QAOutput = {
  passed: true,
  overallScore: 85,
  dimensionScores: {
    readability: 90,
    seo: 85,
    accuracy: 80,
    engagement: 85,
    brandVoice: 90,
  },
  issues: [],
  feedback: 'Content meets quality standards.',
}

const mockSettings: AIArticleJobSettings = {
  autoPost: false,
  targetWordCount: 1000,
  maxIterations: 3,
  template: 'article',
  imageModel: 'dall-e-3',
}

const mockTokenUsage: TokenUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 }

// =====================================================
// MOCK LLM PROVIDER
// =====================================================

function createMockLLMProvider(): ILLMProvider {
  return {
    providerType: 'anthropic',
    complete: vi.fn(),
    stream: vi.fn(),
    generateText: vi.fn(),
    generateJSON: vi.fn(),
    estimateTokens: vi.fn().mockReturnValue(0),
    calculateCost: vi.fn().mockReturnValue(0),
  }
}

// =====================================================
// MOCK CONTEXT
// =====================================================

function createMockContext(): AgentContext {
  return {
    client: {} as AgentContext['client'],
    llmProvider: createMockLLMProvider(),
    job: {
      id: 'job-123',
      keyword: 'concrete driveway cost',
      status: 'processing',
      current_agent: 'project_manager',
      current_iteration: 1,
      max_iterations: 3,
      total_tokens_used: 5000,
      estimated_cost_usd: 0.05,
      settings: mockSettings,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as AgentContext['job'],
    persona: {
      id: 'persona-pm',
      agent_type: 'project_manager',
      name: 'Project Manager Agent',
      system_prompt: 'You are a project manager.',
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      temperature: 0.3,
      max_tokens: 4000,
      is_default: true,
      is_enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as AgentContext['persona'],
    iteration: 1,
    stepId: 'step-123',
    log: vi.fn(),
    onProgress: vi.fn(),
  }
}

// =====================================================
// TEST SUITE
// =====================================================

describe('ProjectManagerAgent', () => {
  let agent: ProjectManagerAgent
  let mockContext: AgentContext

  beforeEach(() => {
    agent = new ProjectManagerAgent()
    mockContext = createMockContext()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // =====================================================
  // METADATA TESTS
  // =====================================================

  describe('metadata', () => {
    it('should have correct agent type', () => {
      expect(agent.agentType).toBe('project_manager')
    })

    it('should have correct name', () => {
      expect(agent.name).toBe('Project Manager Agent')
    })

    it('should have a description', () => {
      expect(agent.description).toBeTruthy()
      expect(agent.description.length).toBeGreaterThan(10)
    })
  })

  // =====================================================
  // INPUT VALIDATION TESTS
  // =====================================================

  describe('validateInput', () => {
    it('should accept valid input with all fields', () => {
      const input: ProjectManagerAgentInput = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        seoData: mockSEOOutput,
        qaData: mockQAOutput,
        settings: mockSettings,
      }
      expect(agent.validateInput(input)).toBe(true)
    })

    it('should accept input without optional seoData and qaData', () => {
      const input = {
        keyword: 'test',
        article: mockWriterOutput,
        settings: mockSettings,
      }
      expect(agent.validateInput(input)).toBe(true)
    })

    it('should reject null input', () => {
      expect(agent.validateInput(null)).toBe(false)
    })

    it('should reject undefined input', () => {
      expect(agent.validateInput(undefined)).toBe(false)
    })

    it('should reject non-object input', () => {
      expect(agent.validateInput('string')).toBe(false)
      expect(agent.validateInput(123)).toBe(false)
    })

    it('should reject empty keyword', () => {
      expect(agent.validateInput({ keyword: '', article: mockWriterOutput, settings: {} })).toBe(false)
    })

    it('should reject missing keyword', () => {
      expect(agent.validateInput({ article: mockWriterOutput, settings: {} })).toBe(false)
    })

    it('should reject missing article', () => {
      expect(agent.validateInput({ keyword: 'test', settings: {} })).toBe(false)
    })

    it('should reject missing settings', () => {
      expect(agent.validateInput({ keyword: 'test', article: mockWriterOutput })).toBe(false)
    })
  })

  // =====================================================
  // EXECUTION TESTS
  // =====================================================

  describe('execute', () => {
    it('should successfully execute and return valid output', async () => {
      const input: ProjectManagerAgentInput = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        seoData: mockSEOOutput,
        qaData: mockQAOutput,
        settings: mockSettings,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.success).toBe(true)
      expect(result.output).toBeDefined()
      expect(result.output?.readyForPublish).toBe(true)
    })

    it('should return zero token usage (deterministic assembly)', async () => {
      const input: ProjectManagerAgentInput = {
        keyword: 'test',
        article: mockWriterOutput,
        seoData: mockSEOOutput,
        qaData: mockQAOutput,
        settings: mockSettings,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.usage).toEqual(mockTokenUsage)
    })

    it('should call log function with appropriate messages', async () => {
      const input: ProjectManagerAgentInput = {
        keyword: 'test',
        article: mockWriterOutput,
        settings: mockSettings,
      }

      await agent.execute(input, mockContext)

      expect(mockContext.log).toHaveBeenCalledWith('info', expect.stringContaining('Starting Project Manager'))
    })

    it('should call onProgress callback during execution', async () => {
      const input: ProjectManagerAgentInput = {
        keyword: 'test',
        article: mockWriterOutput,
        settings: mockSettings,
      }

      await agent.execute(input, mockContext)

      expect(mockContext.onProgress).toHaveBeenCalled()
    })
  })

  // =====================================================
  // FINAL ARTICLE ASSEMBLY TESTS
  // =====================================================

  describe('finalArticle assembly', () => {
    it('should use writer title in final article', async () => {
      const input: ProjectManagerAgentInput = {
        keyword: 'test',
        article: mockWriterOutput,
        seoData: mockSEOOutput,
        settings: mockSettings,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.output?.finalArticle.title).toBe(mockWriterOutput.title)
    })

    it('should use writer slug in final article', async () => {
      const input: ProjectManagerAgentInput = {
        keyword: 'test',
        article: mockWriterOutput,
        seoData: mockSEOOutput,
        settings: mockSettings,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.output?.finalArticle.slug).toBe(mockWriterOutput.slug)
    })

    it('should generate slug from title when writer has no slug', async () => {
      const articleNoSlug = { ...mockWriterOutput, slug: undefined }
      const input: ProjectManagerAgentInput = {
        keyword: 'test',
        article: articleNoSlug,
        settings: mockSettings,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.output?.finalArticle.slug).toBe('how-much-does-a-concrete-driveway-cost')
    })

    it('should use SEO metaTitle when available', async () => {
      const input: ProjectManagerAgentInput = {
        keyword: 'test',
        article: mockWriterOutput,
        seoData: mockSEOOutput,
        settings: mockSettings,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.output?.finalArticle.metaTitle).toBe(mockSEOOutput.metaTitle)
    })

    it('should fallback to article title for metaTitle when no SEO data', async () => {
      const input: ProjectManagerAgentInput = {
        keyword: 'test',
        article: mockWriterOutput,
        settings: mockSettings,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.output?.finalArticle.metaTitle).toBe(mockWriterOutput.title.substring(0, 60))
    })

    it('should use SEO metaDescription when available', async () => {
      const input: ProjectManagerAgentInput = {
        keyword: 'test',
        article: mockWriterOutput,
        seoData: mockSEOOutput,
        settings: mockSettings,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.output?.finalArticle.metaDescription).toBe(mockSEOOutput.metaDescription)
    })

    it('should use SEO schemaMarkup when available', async () => {
      const input: ProjectManagerAgentInput = {
        keyword: 'test',
        article: mockWriterOutput,
        seoData: mockSEOOutput,
        settings: mockSettings,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.output?.finalArticle.schemaMarkup['@type']).toBe('Article')
    })

    it('should generate default schema when no SEO data', async () => {
      const input: ProjectManagerAgentInput = {
        keyword: 'test',
        article: mockWriterOutput,
        settings: mockSettings,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.output?.finalArticle.schemaMarkup['@context']).toBe('https://schema.org')
      expect(result.output?.finalArticle.schemaMarkup['@type']).toBe('Article')
    })

    it('should use template from settings', async () => {
      const input: ProjectManagerAgentInput = {
        keyword: 'test',
        article: mockWriterOutput,
        settings: { ...mockSettings, template: 'guide' },
      }

      const result = await agent.execute(input, mockContext)

      expect(result.output?.finalArticle.template).toBe('guide')
    })

    it('should default to article template when not specified', async () => {
      const input: ProjectManagerAgentInput = {
        keyword: 'test',
        article: mockWriterOutput,
        settings: {},
      }

      const result = await agent.execute(input, mockContext)

      expect(result.output?.finalArticle.template).toBe('article')
    })

    it('should set status to draft when autoPost is false', async () => {
      const input: ProjectManagerAgentInput = {
        keyword: 'test',
        article: mockWriterOutput,
        settings: { ...mockSettings, autoPost: false },
      }

      const result = await agent.execute(input, mockContext)

      expect(result.output?.finalArticle.status).toBe('draft')
    })

    it('should set status to published when autoPost is true', async () => {
      const input: ProjectManagerAgentInput = {
        keyword: 'test',
        article: mockWriterOutput,
        settings: { ...mockSettings, autoPost: true },
      }

      const result = await agent.execute(input, mockContext)

      expect(result.output?.finalArticle.status).toBe('published')
    })

    it('should set focusKeyword from input', async () => {
      const input: ProjectManagerAgentInput = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        settings: mockSettings,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.output?.finalArticle.focusKeyword).toBe('concrete driveway cost')
    })

    it('should include wordCount from writer output', async () => {
      const input: ProjectManagerAgentInput = {
        keyword: 'test',
        article: mockWriterOutput,
        settings: mockSettings,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.output?.finalArticle.wordCount).toBe(mockWriterOutput.wordCount)
    })
  })

  // =====================================================
  // VALIDATION LOGIC TESTS
  // =====================================================

  describe('validation logic', () => {
    it('should set readyForPublish true when no validation errors', async () => {
      const input: ProjectManagerAgentInput = {
        keyword: 'test',
        article: mockWriterOutput,
        seoData: mockSEOOutput,
        qaData: mockQAOutput,
        settings: mockSettings,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.output?.readyForPublish).toBe(true)
      expect(result.output?.validationErrors).toHaveLength(0)
    })

    it('should add validation error for missing title', async () => {
      const articleNoTitle = { ...mockWriterOutput, title: '' }
      const input: ProjectManagerAgentInput = {
        keyword: 'test',
        article: articleNoTitle,
        settings: mockSettings,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.output?.readyForPublish).toBe(false)
      expect(result.output?.validationErrors).toContain('Missing article title')
    })

    it('should add validation error for missing content', async () => {
      const articleNoContent = { ...mockWriterOutput, content: '' }
      const input: ProjectManagerAgentInput = {
        keyword: 'test',
        article: articleNoContent,
        settings: mockSettings,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.output?.readyForPublish).toBe(false)
      expect(result.output?.validationErrors).toContain('Missing article content')
    })

    it('should add validation error for short content', async () => {
      const articleShort = { ...mockWriterOutput, wordCount: 200 }
      const input: ProjectManagerAgentInput = {
        keyword: 'test',
        article: articleShort,
        settings: mockSettings,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.output?.readyForPublish).toBe(false)
      expect(result.output?.validationErrors.some(e => e.includes('too short'))).toBe(true)
    })

    it('should add validation error when QA fails', async () => {
      const failedQA: QAOutput = { ...mockQAOutput, passed: false, overallScore: 50 }
      const input: ProjectManagerAgentInput = {
        keyword: 'test',
        article: mockWriterOutput,
        qaData: failedQA,
        settings: mockSettings,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.output?.readyForPublish).toBe(false)
      expect(result.output?.validationErrors.some(e => e.includes('QA check failed'))).toBe(true)
    })

    it('should pass when QA is not provided', async () => {
      const input: ProjectManagerAgentInput = {
        keyword: 'test',
        article: mockWriterOutput,
        settings: mockSettings,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.output?.readyForPublish).toBe(true)
    })
  })

  // =====================================================
  // SUMMARY AND RECOMMENDATIONS TESTS
  // =====================================================

  describe('summary and recommendations', () => {
    it('should generate a summary', async () => {
      const input: ProjectManagerAgentInput = {
        keyword: 'test',
        article: mockWriterOutput,
        seoData: mockSEOOutput,
        qaData: mockQAOutput,
        settings: mockSettings,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.output?.summary).toBeTruthy()
      expect(result.output?.summary).toContain(mockWriterOutput.title)
    })

    it('should include SEO score in summary when available', async () => {
      const input: ProjectManagerAgentInput = {
        keyword: 'test',
        article: mockWriterOutput,
        seoData: mockSEOOutput,
        settings: mockSettings,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.output?.summary).toContain('SEO optimization score')
    })

    it('should include QA score in summary when available', async () => {
      const input: ProjectManagerAgentInput = {
        keyword: 'test',
        article: mockWriterOutput,
        qaData: mockQAOutput,
        settings: mockSettings,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.output?.summary).toContain('QA score')
    })

    it('should add recommendation when SEO score is low', async () => {
      const lowScoreSEO: SEOOutput = { ...mockSEOOutput, optimizationScore: 60 }
      const input: ProjectManagerAgentInput = {
        keyword: 'test',
        article: mockWriterOutput,
        seoData: lowScoreSEO,
        settings: mockSettings,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.output?.recommendations?.some(r => r.includes('SEO'))).toBe(true)
    })

    it('should add recommendation for internal links', async () => {
      const input: ProjectManagerAgentInput = {
        keyword: 'test',
        article: mockWriterOutput,
        seoData: mockSEOOutput,
        settings: mockSettings,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.output?.recommendations?.some(r => r.includes('internal links'))).toBe(true)
    })

    it('should add recommendation when QA fails', async () => {
      const failedQA: QAOutput = { ...mockQAOutput, passed: false, overallScore: 50 }
      const input: ProjectManagerAgentInput = {
        keyword: 'test',
        article: mockWriterOutput,
        qaData: failedQA,
        settings: mockSettings,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.output?.recommendations?.some(r => r.includes('QA feedback'))).toBe(true)
    })

    it('should add recommendation for short articles', async () => {
      const shortArticle = { ...mockWriterOutput, wordCount: 400 }
      const input: ProjectManagerAgentInput = {
        keyword: 'test',
        article: shortArticle,
        settings: mockSettings,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.output?.recommendations?.some(r => r.includes('expanding'))).toBe(true)
    })
  })

  // =====================================================
  // OUTPUT SCHEMA TESTS
  // =====================================================

  describe('output schema', () => {
    it('should return a valid output schema', () => {
      const schema = agent.getOutputSchema()

      expect(schema).toBeDefined()
      expect(typeof schema).toBe('object')
      // zodToJsonSchema returns a JSON Schema object
      expect(Object.keys(schema).length).toBeGreaterThan(0)
    })
  })
})
