/**
 * Writer Agent Unit Tests
 *
 * Tests the WriterAgent with mocked LLM provider.
 * Validates input validation, output schema compliance, and error handling.
 *
 * @see BAM-312 Batch 3.3: Testing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WriterAgent } from '../../../../services/ai/agents/WriterAgent'
import type { AgentContext, WriterAgentInput } from '../../../../services/ai/AIAgent'
import type { ILLMProvider, TokenUsage } from '../../../../services/ai/LLMProvider'
import type { WriterOutput, ResearchOutput, OutlineOutput } from '../../../../schemas/ai.schemas'

// =====================================================
// MOCK DATA
// =====================================================

const mockResearchOutput: ResearchOutput = {
  keyword: 'concrete driveway cost',
  keywordData: {
    searchVolume: 8500,
    difficulty: 42,
    intent: 'commercial',
    cpc: 6.50,
  },
  competitors: [
    { url: 'https://example.com/cost-guide', title: 'Concrete Driveway Cost Guide 2024', wordCount: 2500 },
    { url: 'https://example2.com/pricing', title: 'How Much Does a Concrete Driveway Cost?', wordCount: 1800 },
  ],
  relatedKeywords: ['concrete driveway price', 'cost to pour concrete driveway', 'concrete driveway installation cost'],
  paaQuestions: ['How much does a concrete driveway cost per square foot?', 'Is a concrete driveway worth it?'],
  recommendedWordCount: 2000,
  contentGaps: ['Answer: How much does a concrete driveway cost per square foot?'],
  exaData: null,
}

const mockWriterOutput: WriterOutput = {
  title: 'Concrete Driveway Cost: Complete 2024 Guide',
  slug: 'concrete-driveway-cost-guide-2024',
  content: '## Introduction\n\nPlanning to install a concrete driveway? Understanding the costs involved...\n\n## Average Costs\n\nThe typical cost ranges from $4 to $15 per square foot...',
  excerpt: 'Learn the true cost of a concrete driveway in 2024, with pricing per square foot and factors that affect your final bill.',
  wordCount: 2050,
  headings: [
    { level: 2, text: 'Introduction' },
    { level: 2, text: 'Average Costs' },
  ],
}

const mockTokenUsage: TokenUsage = {
  inputTokens: 1500,
  outputTokens: 3200,
  totalTokens: 4700,
}

const mockOutlineOutput: OutlineOutput = {
  sections: [
    {
      level: 2,
      title: 'Introduction',
      targetWordCount: 300,
      keyPoints: ['Define concrete driveway', 'Importance of cost planning'],
      paaQuestionsToAnswer: ['What is a concrete driveway?'],
      secondaryKeywordsToInclude: ['driveway installation', 'concrete surface'],
    },
    {
      level: 2,
      title: 'Average Costs',
      targetWordCount: 500,
      keyPoints: ['Cost per square foot', 'Regional variations'],
      paaQuestionsToAnswer: ['How much does a concrete driveway cost per square foot?'],
      secondaryKeywordsToInclude: ['cost per square foot', 'driveway pricing'],
    },
    {
      level: 3,
      title: 'Factors Affecting Price',
      targetWordCount: 400,
      keyPoints: ['Size', 'Location', 'Labor costs'],
      secondaryKeywordsToInclude: ['labor costs', 'material prices'],
    },
  ],
  totalTargetWordCount: 2000,
  strategicNotes: 'Focus on practical cost breakdown and regional variations',
}

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
      data: mockWriterOutput,
      usage: mockTokenUsage,
      estimatedCostUsd: 0.0525,
    }),
    generateJSONWithToolUse: vi.fn().mockResolvedValue({
      data: mockWriterOutput,
      usage: mockTokenUsage,
      estimatedCostUsd: 0.0525,
    }),
    estimateTokens: vi.fn().mockReturnValue(1000),
    calculateCost: vi.fn().mockReturnValue(0.0525),
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
      current_agent: 'writer',
      current_iteration: 1,
      max_iterations: 3,
      total_tokens_used: 0,
      estimated_cost_usd: 0,
      settings: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as AgentContext['job'],
    persona: {
      id: 'persona-writer',
      agent_type: 'writer',
      name: 'Writer Agent',
      system_prompt: 'You are an expert SEO content writer.',
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      temperature: 0.7,
      max_tokens: 8000,
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

describe('WriterAgent', () => {
  let agent: WriterAgent
  let mockContext: AgentContext

  beforeEach(() => {
    agent = new WriterAgent()
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
      expect(agent.agentType).toBe('writer')
    })

    it('should have correct name', () => {
      expect(agent.name).toBe('Writer Agent')
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
    it('should accept valid input with all required fields', () => {
      const input: WriterAgentInput = {
        keyword: 'concrete driveway cost',
        researchData: mockResearchOutput,
        targetWordCount: 2000,
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
      expect(agent.validateInput({
        keyword: '',
        researchData: mockResearchOutput,
        targetWordCount: 2000,
      })).toBe(false)
    })

    it('should reject missing keyword', () => {
      expect(agent.validateInput({
        researchData: mockResearchOutput,
        targetWordCount: 2000,
      })).toBe(false)
    })

    it('should reject zero targetWordCount', () => {
      expect(agent.validateInput({
        keyword: 'test keyword',
        researchData: mockResearchOutput,
        targetWordCount: 0,
      })).toBe(false)
    })

    it('should reject negative targetWordCount', () => {
      expect(agent.validateInput({
        keyword: 'test keyword',
        researchData: mockResearchOutput,
        targetWordCount: -100,
      })).toBe(false)
    })

    it('should reject missing researchData', () => {
      expect(agent.validateInput({
        keyword: 'test keyword',
        targetWordCount: 2000,
      })).toBe(false)
    })
  })

  // =====================================================
  // OUTPUT SCHEMA TESTS
  // =====================================================

  describe('getOutputSchema', () => {
    it('should return a valid JSON schema', () => {
      const schema = agent.getOutputSchema()

      expect(schema).toBeDefined()
      expect(typeof schema).toBe('object')
      expect(schema).toHaveProperty('$schema')
    })
  })

  // =====================================================
  // EXECUTION TESTS
  // =====================================================

  describe('execute', () => {
    it('should successfully execute and return valid output', async () => {
      const input: WriterAgentInput = {
        keyword: 'concrete driveway cost',
        researchData: mockResearchOutput,
        targetWordCount: 2000,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.success).toBe(true)
      expect(result.output).toBeDefined()
      expect(result.output?.title).toBe(mockWriterOutput.title)
      expect(result.output?.slug).toBe(mockWriterOutput.slug)
      expect(result.output?.wordCount).toBe(mockWriterOutput.wordCount)
    })

    it('should call LLM provider with correct parameters', async () => {
      const input: WriterAgentInput = {
        keyword: 'concrete driveway cost',
        researchData: mockResearchOutput,
        targetWordCount: 2000,
      }

      await agent.execute(input, mockContext)

      expect(mockContext.llmProvider.generateJSONWithToolUse).toHaveBeenCalledTimes(1)
      expect(mockContext.llmProvider.generateJSONWithToolUse).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-20250514',
          temperature: 0.7,
          maxTokens: 8000,
        })
      )
    })

    it('should include keyword in the prompt', async () => {
      const input: WriterAgentInput = {
        keyword: 'concrete driveway cost',
        researchData: mockResearchOutput,
        targetWordCount: 2000,
      }

      await agent.execute(input, mockContext)

      const generateJSONCall = (mockContext.llmProvider.generateJSONWithToolUse as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(generateJSONCall.prompt).toContain('concrete driveway cost')
    })

    it('should include research data in the prompt', async () => {
      const input: WriterAgentInput = {
        keyword: 'concrete driveway cost',
        researchData: mockResearchOutput,
        targetWordCount: 2000,
      }

      await agent.execute(input, mockContext)

      const generateJSONCall = (mockContext.llmProvider.generateJSONWithToolUse as ReturnType<typeof vi.fn>).mock.calls[0][0]
      // Should include PAA questions
      expect(generateJSONCall.prompt).toContain('How much does a concrete driveway cost per square foot?')
      // Should include related keywords
      expect(generateJSONCall.prompt).toContain('concrete driveway price')
    })

    it('should call progress callback during execution', async () => {
      const input: WriterAgentInput = {
        keyword: 'concrete driveway cost',
        researchData: mockResearchOutput,
        targetWordCount: 2000,
      }

      await agent.execute(input, mockContext)

      expect(mockContext.onProgress).toHaveBeenCalled()
    })

    it('should log execution progress', async () => {
      const input: WriterAgentInput = {
        keyword: 'concrete driveway cost',
        researchData: mockResearchOutput,
        targetWordCount: 2000,
      }

      await agent.execute(input, mockContext)

      expect(mockContext.log).toHaveBeenCalledWith('info', expect.stringContaining('Starting Writer Agent'))
      expect(mockContext.log).toHaveBeenCalledWith('info', expect.stringContaining('Article generated successfully'))
    })

    it('should include target word count in the prompt', async () => {
      const input: WriterAgentInput = {
        keyword: 'concrete driveway cost',
        researchData: mockResearchOutput,
        targetWordCount: 2500,
      }

      await agent.execute(input, mockContext)

      const generateJSONCall = (mockContext.llmProvider.generateJSONWithToolUse as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(generateJSONCall.prompt).toContain('2500')
    })

    it('should return token usage from LLM provider', async () => {
      const input: WriterAgentInput = {
        keyword: 'concrete driveway cost',
        researchData: mockResearchOutput,
        targetWordCount: 2000,
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

      const input: WriterAgentInput = {
        keyword: 'concrete driveway cost',
        researchData: mockResearchOutput,
        targetWordCount: 2000,
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

      const input: WriterAgentInput = {
        keyword: 'test',
        researchData: mockResearchOutput,
        targetWordCount: 2000,
      }

      const result = await agent.execute(input, errorContext)

      expect(result.success).toBe(false)
      expect(result.output).toBeNull()
    })

     it('should set continueToNext to true on success', async () => {
       const input: WriterAgentInput = {
         keyword: 'concrete driveway cost',
         researchData: mockResearchOutput,
         targetWordCount: 2000,
       }

       const result = await agent.execute(input, mockContext)

       expect(result.success).toBe(true)
       expect(result.continueToNext).toBe(true)
     })

     // =====================================================
     // NEW TESTS: Outline, Context, Secondary Keywords
     // =====================================================

     it('uses outline for content structure when provided', async () => {
       const input: WriterAgentInput = {
         keyword: 'concrete driveway cost',
         researchData: mockResearchOutput,
         targetWordCount: 2000,
         outline: mockOutlineOutput,
       }

       await agent.execute(input, mockContext)

       const generateJSONCall = (mockContext.llmProvider.generateJSONWithToolUse as ReturnType<typeof vi.fn>).mock.calls[0][0]
       // Should include outline sections in the prompt
       expect(generateJSONCall.prompt).toContain('Introduction')
       expect(generateJSONCall.prompt).toContain('Average Costs')
       expect(generateJSONCall.prompt).toContain('Factors Affecting Price')
     })

     it('incorporates articleContext in introduction when provided', async () => {
       const articleContext = 'This article is part of our comprehensive concrete cost guide series.'
       const input: WriterAgentInput = {
         keyword: 'concrete driveway cost',
         researchData: mockResearchOutput,
         targetWordCount: 2000,
         articleContext,
       }

       await agent.execute(input, mockContext)

       const generateJSONCall = (mockContext.llmProvider.generateJSONWithToolUse as ReturnType<typeof vi.fn>).mock.calls[0][0]
       // Should include article context in the prompt
       expect(generateJSONCall.prompt).toContain('comprehensive concrete cost guide series')
     })

     it('naturally includes secondary keywords when provided', async () => {
       const secondaryKeywords = ['driveway installation', 'concrete surface', 'cost per square foot']
       const input: WriterAgentInput = {
         keyword: 'concrete driveway cost',
         researchData: mockResearchOutput,
         targetWordCount: 2000,
         secondaryKeywords,
       }

       await agent.execute(input, mockContext)

       const generateJSONCall = (mockContext.llmProvider.generateJSONWithToolUse as ReturnType<typeof vi.fn>).mock.calls[0][0]
       // Should include secondary keywords in the prompt
       expect(generateJSONCall.prompt).toContain('driveway installation')
       expect(generateJSONCall.prompt).toContain('concrete surface')
       expect(generateJSONCall.prompt).toContain('cost per square foot')
     })

     it('works without outline for backward compatibility', async () => {
       const input: WriterAgentInput = {
         keyword: 'concrete driveway cost',
         researchData: mockResearchOutput,
         targetWordCount: 2000,
         // outline is undefined
       }

       const result = await agent.execute(input, mockContext)

       // Should still succeed without outline
       expect(result.success).toBe(true)
       expect(result.output).toBeDefined()
     })

     it('works without articleContext for backward compatibility', async () => {
       const input: WriterAgentInput = {
         keyword: 'concrete driveway cost',
         researchData: mockResearchOutput,
         targetWordCount: 2000,
         // articleContext is undefined
       }

       const result = await agent.execute(input, mockContext)

       // Should still succeed without articleContext
       expect(result.success).toBe(true)
       expect(result.output).toBeDefined()
     })

     it('works without secondaryKeywords for backward compatibility', async () => {
       const input: WriterAgentInput = {
         keyword: 'concrete driveway cost',
         researchData: mockResearchOutput,
         targetWordCount: 2000,
         // secondaryKeywords is undefined
       }

       const result = await agent.execute(input, mockContext)

       // Should still succeed without secondaryKeywords
       expect(result.success).toBe(true)
       expect(result.output).toBeDefined()
     })
   })

  // =====================================================
  // OUTPUT SCHEMA COMPLIANCE TESTS
  // =====================================================

  describe('output schema compliance', () => {
    it('should produce output matching writerOutputSchema structure', async () => {
      const input: WriterAgentInput = {
        keyword: 'concrete driveway cost',
        researchData: mockResearchOutput,
        targetWordCount: 2000,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.success).toBe(true)

      const output = result.output!
      // Verify required fields exist
      expect(output).toHaveProperty('title')
      expect(output).toHaveProperty('slug')
      expect(output).toHaveProperty('content')
      expect(output).toHaveProperty('excerpt')
      expect(output).toHaveProperty('wordCount')
      expect(output).toHaveProperty('headings')
    })

    it('should have valid field types', async () => {
      const input: WriterAgentInput = {
        keyword: 'concrete driveway cost',
        researchData: mockResearchOutput,
        targetWordCount: 2000,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.success).toBe(true)

      const output = result.output!
      expect(typeof output.title).toBe('string')
      expect(typeof output.slug).toBe('string')
      expect(typeof output.content).toBe('string')
      expect(typeof output.excerpt).toBe('string')
      expect(typeof output.wordCount).toBe('number')
      expect(Array.isArray(output.headings)).toBe(true)
    })

    it('should have valid headings structure', async () => {
      const input: WriterAgentInput = {
        keyword: 'concrete driveway cost',
        researchData: mockResearchOutput,
        targetWordCount: 2000,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.success).toBe(true)

      const headings = result.output!.headings
      expect(headings.length).toBeGreaterThan(0)

      const firstHeading = headings[0]
      expect(firstHeading).toHaveProperty('level')
      expect(firstHeading).toHaveProperty('text')
      expect(typeof firstHeading.level).toBe('number')
      expect(typeof firstHeading.text).toBe('string')
    })
  })
})

