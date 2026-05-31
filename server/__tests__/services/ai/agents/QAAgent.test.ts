/**
 * QA Agent Unit Tests
 *
 * Tests the QAAgent with mocked LLM provider.
 * Validates input validation, output schema compliance, reading level calculation,
 * prohibited pattern detection, scoring logic, and eval recording.
 *
 * @see BAM-313 Batch 4.5: Testing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { QAAgent } from '../../../../services/ai/agents/QAAgent'
import type { AgentContext, QAAgentInput } from '../../../../services/ai/AIAgent'
import type { ILLMProvider, TokenUsage } from '../../../../services/ai/LLMProvider'
import type { QAOutput, WriterOutput, SEOOutput } from '../../../../schemas/ai.schemas'

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
  excerpt: 'Learn about concrete driveway costs.',
  wordCount: 80,
  headings: [
    { level: 2, text: 'Average Costs' },
    { level: 2, text: 'Factors That Affect Price' },
    { level: 3, text: 'Labor Costs' },
  ],
}

const mockSEOOutput: SEOOutput = {
  metaTitle: 'Concrete Driveway Cost 2024: Pricing Guide',
  metaDescription: 'Learn concrete driveway costs from $4-$15/sqft.',
  headingAnalysis: { isValid: true, issues: [], suggestions: [] },
  keywordDensity: { percentage: 2.0, analysis: 'Optimal' },
  schemaMarkup: { '@type': 'Article' },
  internalLinks: [],
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

const mockTokenUsage: TokenUsage = { inputTokens: 2000, outputTokens: 800, totalTokens: 2800 }

// =====================================================
// MOCK LLM PROVIDER
// =====================================================

function createMockLLMProvider(qaOutput: QAOutput = mockQAOutput): ILLMProvider {
  return {
    providerType: 'anthropic',
    complete: vi.fn(),
    stream: vi.fn(),
    generateText: vi.fn(),
    generateJSON: vi.fn().mockResolvedValue({
      data: qaOutput,
      usage: mockTokenUsage,
      estimatedCostUsd: 0.025,
    }),
    generateJSONWithToolUse: vi.fn().mockResolvedValue({
      data: qaOutput,
      usage: mockTokenUsage,
      estimatedCostUsd: 0.025,
    }),
    estimateTokens: vi.fn().mockReturnValue(2000),
    calculateCost: vi.fn().mockReturnValue(0.025),
  }
}

// =====================================================
// MOCK CONTEXT
// =====================================================

function createMockContext(llmProvider?: ILLMProvider): AgentContext {
  return {
    client: {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'eval-1' }, error: null }),
          }),
        }),
      }),
    } as unknown as AgentContext['client'],
    llmProvider: llmProvider || createMockLLMProvider(),
    job: {
      id: 'job-123',
      keyword: 'concrete driveway cost',
      status: 'processing',
      current_agent: 'qa',
      current_iteration: 1,
      max_iterations: 3,
      total_tokens_used: 0,
      estimated_cost_usd: 0,
      settings: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as AgentContext['job'],
    persona: {
      id: 'persona-qa',
      agent_type: 'qa',
      name: 'QA Agent',
      system_prompt: 'You are a content quality analyst.',
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

describe('QAAgent', () => {
  let agent: QAAgent
  let mockContext: AgentContext

  beforeEach(() => {
    agent = new QAAgent()
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
      expect(agent.agentType).toBe('qa')
    })

    it('should have correct name', () => {
      expect(agent.name).toBe('QA Agent')
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
    it('should accept valid input with keyword, article, and iteration', () => {
      const input: QAAgentInput = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        seoData: mockSEOOutput,
        iteration: 1,
      }
      expect(agent.validateInput(input)).toBe(true)
    })

    it('should accept input without seoData', () => {
      const input = { keyword: 'test', article: mockWriterOutput, iteration: 1 }
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
      expect(agent.validateInput({ keyword: '', article: mockWriterOutput, iteration: 1 })).toBe(false)
    })

    it('should reject missing keyword', () => {
      expect(agent.validateInput({ article: mockWriterOutput, iteration: 1 })).toBe(false)
    })

    it('should reject missing article', () => {
      expect(agent.validateInput({ keyword: 'test', iteration: 1 })).toBe(false)
    })

    it('should reject missing iteration', () => {
      expect(agent.validateInput({ keyword: 'test', article: mockWriterOutput })).toBe(false)
    })
  })

  // =====================================================
  // EXECUTION TESTS
  // =====================================================

  describe('execute', () => {
    it('should successfully execute and return valid output', async () => {
      const input: QAAgentInput = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        seoData: mockSEOOutput,
        iteration: 1,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.success).toBe(true)
      expect(result.output).toBeDefined()
      expect(result.output?.overallScore).toBeGreaterThanOrEqual(0)
      expect(result.output?.overallScore).toBeLessThanOrEqual(100)
    })

    it('should return token usage from LLM provider', async () => {
      const input: QAAgentInput = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        seoData: mockSEOOutput,
        iteration: 1,
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

      const input: QAAgentInput = {
        keyword: 'test',
        article: mockWriterOutput,
        seoData: mockSEOOutput,
        iteration: 1,
      }

      const result = await agent.execute(input, errorContext)

      expect(result.success).toBe(false)
      expect(result.error).toContain('API rate limit exceeded')
    })

    it('should call log function with appropriate messages', async () => {
      const input: QAAgentInput = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        iteration: 1,
      }

      await agent.execute(input, mockContext)

      expect(mockContext.log).toHaveBeenCalledWith('info', expect.stringContaining('Starting QA Agent'))
    })

    it('should call onProgress callback during execution', async () => {
      const input: QAAgentInput = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        iteration: 1,
      }

      await agent.execute(input, mockContext)

      expect(mockContext.onProgress).toHaveBeenCalled()
    })
  })

  // =====================================================
  // QA SCORING LOGIC TESTS
  // =====================================================

  describe('scoring logic', () => {
    it('should return passed=true when score >= 70', async () => {
      const passingOutput: QAOutput = {
        ...mockQAOutput,
        overallScore: 85,
        passed: true,
      }
      const provider = createMockLLMProvider(passingOutput)
      const context = createMockContext(provider)

      const input: QAAgentInput = {
        keyword: 'test',
        article: mockWriterOutput,
        iteration: 1,
      }

      const result = await agent.execute(input, context)

      expect(result.success).toBe(true)
      expect(result.output?.passed).toBe(true)
      expect(result.continueToNext).toBe(true)
    })

    it('should return passed=false and feedback when score < 70', async () => {
      // Dimension scores that result in weighted average < 70
      // Plus adding critical issues that apply penalties
      const failingOutput: QAOutput = {
        passed: false,
        overallScore: 40,
        dimensionScores: {
          readability: 50,
          seo: 50,
          accuracy: 50,
          engagement: 50,
          brandVoice: 50,
        },
        issues: [
          { category: 'readability', severity: 'critical', description: 'Major issue', suggestion: 'Fix it' },
          { category: 'seo', severity: 'critical', description: 'Critical SEO problem', suggestion: 'Fix SEO' },
        ],
        feedback: 'Content needs significant improvement.',
      }
      const provider = createMockLLMProvider(failingOutput)
      const context = createMockContext(provider)

      const input: QAAgentInput = {
        keyword: 'test',
        article: mockWriterOutput,
        iteration: 1,
      }

      const result = await agent.execute(input, context)

      expect(result.success).toBe(true)
      expect(result.output?.passed).toBe(false)
      expect(result.continueToNext).toBe(false)
      expect(result.feedback).toBeDefined()
    })
  })

  // =====================================================
  // PROHIBITED PATTERN DETECTION TESTS
  // =====================================================

  describe('prohibited pattern detection', () => {
    it('should detect emojis in content', async () => {
      const articleWithEmoji: WriterOutput = {
        ...mockWriterOutput,
        content: '# Great Content 🎉\n\nThis is a test with emoji.',
      }
      const input: QAAgentInput = {
        keyword: 'test',
        article: articleWithEmoji,
        iteration: 1,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.success).toBe(true)
      const emojiIssue = result.output?.issues.find(i => i.description.includes('emoji'))
      expect(emojiIssue).toBeDefined()
      expect(emojiIssue?.severity).toBe('critical')
    })

    it('should detect emdashes in content', async () => {
      const articleWithEmdash: WriterOutput = {
        ...mockWriterOutput,
        content: '# Content\n\nThis is a test—with an emdash.',
      }
      const input: QAAgentInput = {
        keyword: 'test',
        article: articleWithEmdash,
        iteration: 1,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.success).toBe(true)
      const emdashIssue = result.output?.issues.find(i => i.description.includes('emdash'))
      expect(emdashIssue).toBeDefined()
      expect(emdashIssue?.severity).toBe('high')
    })

    it('should detect sensational words in content', async () => {
      const articleWithSensational: WriterOutput = {
        ...mockWriterOutput,
        content: '# Amazing Content\n\nThis incredible guide is unbelievable.',
      }
      const input: QAAgentInput = {
        keyword: 'test',
        article: articleWithSensational,
        iteration: 1,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.success).toBe(true)
      const sensationalIssue = result.output?.issues.find(i =>
        i.description.toLowerCase().includes('sensational')
      )
      expect(sensationalIssue).toBeDefined()
      expect(sensationalIssue?.severity).toBe('medium')
    })
  })

  // =====================================================
  // OUTPUT SCHEMA COMPLIANCE TESTS
  // =====================================================

  describe('output schema compliance', () => {
    it('should produce output with all required fields', async () => {
      const input: QAAgentInput = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        seoData: mockSEOOutput,
        iteration: 1,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.success).toBe(true)
      const output = result.output!
      expect(output).toHaveProperty('passed')
      expect(output).toHaveProperty('overallScore')
      expect(output).toHaveProperty('dimensionScores')
      expect(output).toHaveProperty('issues')
      expect(output).toHaveProperty('feedback')
    })

    it('should have all 5 dimension scores', async () => {
      const input: QAAgentInput = {
        keyword: 'test',
        article: mockWriterOutput,
        iteration: 1,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.success).toBe(true)
      const dims = result.output!.dimensionScores
      expect(dims).toHaveProperty('readability')
      expect(dims).toHaveProperty('seo')
      expect(dims).toHaveProperty('accuracy')
      expect(dims).toHaveProperty('engagement')
      expect(dims).toHaveProperty('brandVoice')
    })

    it('should have valid score ranges', async () => {
      const input: QAAgentInput = {
        keyword: 'test',
        article: mockWriterOutput,
        iteration: 1,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.success).toBe(true)
      const output = result.output!
      expect(output.overallScore).toBeGreaterThanOrEqual(0)
      expect(output.overallScore).toBeLessThanOrEqual(100)
      Object.values(output.dimensionScores).forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0)
        expect(score).toBeLessThanOrEqual(100)
      })
    })
  })
})

