/**
 * SEO Agent Unit Tests
 *
 * Tests the SEOAgent with mocked LLM provider and page repository.
 * Validates input validation, output schema compliance, heading analysis,
 * keyword density calculation, and error handling.
 *
 * @see BAM-313 Batch 4.1: SEO Agent Implementation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SEOAgent } from '../../../../services/ai/agents/SEOAgent'
import { PageRepository } from '../../../../repositories/PageRepository'
import type { AgentContext, SEOAgentInput } from '../../../../services/ai/AIAgent'
import type { ILLMProvider, TokenUsage } from '../../../../services/ai/LLMProvider'
import type { SEOOutput, WriterOutput, ResearchOutput } from '../../../../schemas/ai.schemas'

// =====================================================
// MOCK DATA
// =====================================================

const mockWriterOutput: WriterOutput = {
  title: 'How Much Does a Concrete Driveway Cost in 2024',
  slug: 'concrete-driveway-cost',
  content: `# How Much Does a Concrete Driveway Cost in 2024

A concrete driveway is a great investment for your home. The cost of a concrete driveway varies.

## Average Concrete Driveway Costs

The typical concrete driveway cost ranges from $4 to $15 per square foot.

## Factors That Affect Price

### Size and Thickness
The size of your concrete driveway directly impacts the total cost.

### Labor Costs
Labor costs for concrete work typically range from $2 to $6 per square foot.

## Is a Concrete Driveway Worth It?

Yes, concrete driveways offer excellent durability and can last 30 years or more.`,
  excerpt: 'Learn about concrete driveway costs and factors affecting price.',
  wordCount: 150,
  headings: [
    { level: 2, text: 'Average Concrete Driveway Costs' },
    { level: 2, text: 'Factors That Affect Price' },
    { level: 3, text: 'Size and Thickness' },
    { level: 3, text: 'Labor Costs' },
    { level: 2, text: 'Is a Concrete Driveway Worth It?' },
  ],
}

const mockResearchOutput: ResearchOutput = {
  keyword: 'concrete driveway cost',
  keywordData: { searchVolume: 8500, difficulty: 42, intent: 'commercial', cpc: 6.50 },
  competitors: [{ url: 'https://example.com/cost', title: 'Cost Guide', wordCount: 2500 }],
  relatedKeywords: ['concrete driveway price', 'driveway installation cost'],
  paaQuestions: ['How much does a concrete driveway cost per square foot?'],
  recommendedWordCount: 2000,
  contentGaps: [],
  exaData: null,
}

const mockSEOOutput: SEOOutput = {
  metaTitle: 'Concrete Driveway Cost 2024: Complete Pricing Guide',
  metaDescription: 'Learn concrete driveway costs from $4-$15/sqft. Get pricing tips!',
  headingAnalysis: { isValid: true, issues: [], suggestions: [] },
  keywordDensity: { percentage: 2.0, analysis: 'Optimal range.' },
  schemaMarkup: { '@type': 'Article' },
  internalLinks: [{ anchorText: 'contractors', suggestedPath: '/contractors', reason: 'Relevant' }],
  optimizationScore: 85,
}

const mockTokenUsage: TokenUsage = { inputTokens: 1500, outputTokens: 500, totalTokens: 2000 }

// =====================================================
// MOCK LLM PROVIDER
// =====================================================

function createMockLLMProvider(): ILLMProvider {
  return {
    providerType: 'anthropic',
    complete: vi.fn(),
    stream: vi.fn(),
    generateText: vi.fn(),
    generateJSON: vi.fn().mockResolvedValue({
      data: mockSEOOutput,
      usage: mockTokenUsage,
      estimatedCostUsd: 0.015,
    }),
    generateJSONWithToolUse: vi.fn().mockResolvedValue({
      data: mockSEOOutput,
      usage: mockTokenUsage,
      estimatedCostUsd: 0.015,
    }),
    estimateTokens: vi.fn().mockReturnValue(1000),
    calculateCost: vi.fn().mockReturnValue(0.015),
  }
}

// =====================================================
// MOCK CONTEXT
// =====================================================

function createMockContext(llmProvider?: ILLMProvider): AgentContext {
  return {
    client: {} as AgentContext['client'],
    llmProvider: llmProvider || createMockLLMProvider(),
    job: {
      id: 'job-123',
      keyword: 'concrete driveway cost',
      status: 'processing',
      current_agent: 'seo',
      current_iteration: 1,
      max_iterations: 3,
      total_tokens_used: 0,
      estimated_cost_usd: 0,
      settings: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as AgentContext['job'],
    persona: {
      id: 'persona-seo',
      agent_type: 'seo',
      name: 'SEO Agent',
      system_prompt: 'You are an expert SEO analyst.',
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      temperature: 0.5,
      max_tokens: 4000,
      is_default: true,
      is_enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as AgentContext['persona'],
    iteration: 1,
    log: vi.fn(),
    onProgress: vi.fn(),
  }
}

// =====================================================
// TEST SUITE
// =====================================================

describe('SEOAgent', () => {
  let agent: SEOAgent
  let mockContext: AgentContext

  beforeEach(() => {
    agent = new SEOAgent()
    mockContext = createMockContext()
    vi.spyOn(PageRepository.prototype, 'list').mockResolvedValue({ pages: [], total: 0 })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // =====================================================
  // METADATA TESTS
  // =====================================================

  describe('metadata', () => {
    it('should have correct agent type', () => {
      expect(agent.agentType).toBe('seo')
    })

    it('should have correct name', () => {
      expect(agent.name).toBe('SEO Agent')
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
    it('should accept valid input with keyword and article', () => {
      const input: SEOAgentInput = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        researchData: mockResearchOutput,
      }
      expect(agent.validateInput(input)).toBe(true)
    })

    it('should accept input without researchData', () => {
      const input = { keyword: 'concrete driveway cost', article: mockWriterOutput }
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
      expect(agent.validateInput({ keyword: '', article: mockWriterOutput })).toBe(false)
    })

    it('should reject missing keyword', () => {
      expect(agent.validateInput({ article: mockWriterOutput })).toBe(false)
    })

    it('should reject missing article', () => {
      expect(agent.validateInput({ keyword: 'test keyword' })).toBe(false)
    })
  })

  // =====================================================
  // EXECUTION TESTS
  // =====================================================

  describe('execute', () => {
    it('should successfully execute and return valid output', async () => {
      const input: SEOAgentInput = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        researchData: mockResearchOutput,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.success).toBe(true)
      expect(result.output).toBeDefined()
      expect(result.output?.metaTitle).toBeDefined()
      expect(result.output?.metaDescription).toBeDefined()
      expect(result.output?.optimizationScore).toBeGreaterThanOrEqual(0)
      expect(result.output?.optimizationScore).toBeLessThanOrEqual(100)
    })

    it('should return token usage from LLM provider', async () => {
      const input: SEOAgentInput = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        researchData: mockResearchOutput,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.usage).toEqual(mockTokenUsage)
    })

    it('should handle LLM provider errors gracefully', async () => {
      const errorProvider = createMockLLMProvider()
      ;(errorProvider.generateJSONWithToolUse as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('API rate limit exceeded')
      )
      const errorContext = createMockContext(errorProvider)

      const input: SEOAgentInput = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        researchData: mockResearchOutput,
      }

      const result = await agent.execute(input, errorContext)

      expect(result.success).toBe(false)
      expect(result.error).toContain('API rate limit exceeded')
    })

    it('should return failure result with null output when LLM fails', async () => {
      const errorProvider = createMockLLMProvider()
      ;(errorProvider.generateJSONWithToolUse as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network error')
      )
      const errorContext = createMockContext(errorProvider)

      const input: SEOAgentInput = {
        keyword: 'test',
        article: mockWriterOutput,
        researchData: mockResearchOutput,
      }

      const result = await agent.execute(input, errorContext)

      expect(result.success).toBe(false)
      expect(result.output).toBeNull()
    })

    it('should call log function with appropriate messages', async () => {
      const input: SEOAgentInput = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        researchData: mockResearchOutput,
      }

      await agent.execute(input, mockContext)

      expect(mockContext.log).toHaveBeenCalledWith('info', expect.stringContaining('Starting SEO Agent'))
    })

    it('should call onProgress callback during execution', async () => {
      const input: SEOAgentInput = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        researchData: mockResearchOutput,
      }

      await agent.execute(input, mockContext)

      expect(mockContext.onProgress).toHaveBeenCalled()
    })
  })

  // =====================================================
  // OUTPUT SCHEMA COMPLIANCE TESTS
  // =====================================================

  describe('output schema compliance', () => {
    it('should produce output matching seoOutputSchema structure', async () => {
      const input: SEOAgentInput = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        researchData: mockResearchOutput,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.success).toBe(true)
      const output = result.output!
      expect(output).toHaveProperty('metaTitle')
      expect(output).toHaveProperty('metaDescription')
      expect(output).toHaveProperty('headingAnalysis')
      expect(output).toHaveProperty('keywordDensity')
      expect(output).toHaveProperty('schemaMarkup')
      expect(output).toHaveProperty('internalLinks')
      expect(output).toHaveProperty('optimizationScore')
    })

    it('should have valid field types', async () => {
      const input: SEOAgentInput = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        researchData: mockResearchOutput,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.success).toBe(true)
      const output = result.output!
      expect(typeof output.metaTitle).toBe('string')
      expect(typeof output.metaDescription).toBe('string')
      expect(typeof output.optimizationScore).toBe('number')
      expect(typeof output.headingAnalysis).toBe('object')
      expect(typeof output.keywordDensity).toBe('object')
      expect(typeof output.schemaMarkup).toBe('object')
      expect(Array.isArray(output.internalLinks)).toBe(true)
    })
  })
})

