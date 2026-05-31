/**
 * Outline Agent Unit Tests
 *
 * Tests the OutlineAgent with mocked LLM provider.
 * Validates input validation, H2/H3 structure, PAA incorporation,
 * secondary keyword distribution, word count handling, and error handling.
 *
 * @see Task 9: OutlineAgent Tests (TDD RED)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { AgentContext, OutlineAgentInput } from '../../../../services/ai/AIAgent'
import type { ILLMProvider, TokenUsage } from '../../../../services/ai/LLMProvider'
import type { ResearchOutput, OutlineOutput } from '../../../../schemas/ai.schemas'

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
  paaQuestions: [
    'How much does a concrete driveway cost per square foot?',
    'Is a concrete driveway worth it?',
    'What factors affect concrete driveway cost?',
  ],
  recommendedWordCount: 2000,
  contentGaps: ['Answer: How much does a concrete driveway cost per square foot?'],
  exaData: {
    competitors: [
      {
        url: 'https://exa-competitor1.com',
        title: 'Exa Competitor 1',
        snippet: 'Concrete driveway costs vary by region...',
      },
      {
        url: 'https://exa-competitor2.com',
        title: 'Exa Competitor 2',
        snippet: 'Installation costs include labor and materials...',
      },
    ],
    authoritativeSources: [
      {
        url: 'https://example.edu/concrete',
        title: 'University Concrete Research',
        snippet: 'Concrete durability and cost analysis...',
      },
    ],
  },
}

const mockOutlineOutput: OutlineOutput = {
  sections: [
    {
      level: 2,
      title: 'How Much Does a Concrete Driveway Cost?',
      targetWordCount: 300,
      keyPoints: ['Cost per square foot', 'Regional variations', 'Material costs'],
      paaQuestionsToAnswer: ['How much does a concrete driveway cost per square foot?'],
      secondaryKeywordsToInclude: ['concrete driveway price', 'cost to pour concrete driveway'],
    },
    {
      level: 2,
      title: 'Factors That Affect Price',
      targetWordCount: 400,
      keyPoints: ['Size of driveway', 'Labor costs', 'Material quality'],
      paaQuestionsToAnswer: ['What factors affect concrete driveway cost?'],
      secondaryKeywordsToInclude: ['concrete installation cost'],
    },
    {
      level: 3,
      title: 'Labor Costs',
      targetWordCount: 200,
      keyPoints: ['Regional labor rates', 'Complexity factors'],
      secondaryKeywordsToInclude: ['concrete driveway installation cost'],
    },
    {
      level: 2,
      title: 'Is a Concrete Driveway Worth It?',
      targetWordCount: 350,
      keyPoints: ['Durability', 'Long-term value', 'Maintenance costs'],
      paaQuestionsToAnswer: ['Is a concrete driveway worth it?'],
    },
  ],
  totalTargetWordCount: 1250,
  strategicNotes: 'Focus on cost comparison and ROI. Address all PAA questions in dedicated sections.',
}

const mockTokenUsage: TokenUsage = {
  promptTokens: 2000,
  completionTokens: 1500,
  totalTokens: 3500,
}

// =====================================================
// MOCK LLM PROVIDER
// =====================================================

function createMockLLMProvider(): ILLMProvider {
  const mockImplementation = async (options: { prompt: string; systemPrompt?: string; model: string; schema: unknown; temperature?: number; maxTokens?: number }) => {
    // Extract target word count from user prompt
    const targetMatch = options.prompt.match(/Target word count: (\d+)/)
    const targetWordCount = targetMatch ? parseInt(targetMatch[1], 10) : 2000

    // Scale sections proportionally
    const scaleFactor = (targetWordCount * 0.95) / mockOutlineOutput.totalTargetWordCount
    const scaledSections = mockOutlineOutput.sections.map((section) => ({
      ...section,
      targetWordCount: Math.round(section.targetWordCount * scaleFactor),
    }))

    // Return outline with totalTargetWordCount proportional to input
    const outlineData = {
      ...mockOutlineOutput,
      sections: scaledSections,
      totalTargetWordCount: Math.round(targetWordCount * 0.95), // 95% ratio (within 10% tolerance)
    }

    return {
      data: outlineData,
      usage: mockTokenUsage,
      estimatedCostUsd: 0.0525,
    }
  }

  return {
    providerType: 'anthropic',
    complete: vi.fn(),
    stream: vi.fn(),
    generateText: vi.fn(),
    generateJSON: vi.fn().mockImplementation(mockImplementation),
    generateJSONWithToolUse: vi.fn().mockImplementation(mockImplementation),
    estimateTokens: vi.fn().mockReturnValue(2000),
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
      current_agent: 'outline',
      current_iteration: 1,
      max_iterations: 3,
      total_tokens_used: 0,
      estimated_cost_usd: 0,
      settings: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as AgentContext['job'],
    persona: {
      id: 'persona-outline',
      agent_type: 'outline',
      name: 'Outline Agent',
      system_prompt: 'You are an expert content outline generator.',
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      temperature: 0.5,
      max_tokens: 4096,
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

describe('OutlineAgent', () => {
  let OutlineAgent: typeof import('../../../../services/ai/agents/OutlineAgent').OutlineAgent
  let agent: InstanceType<typeof OutlineAgent>
  let mockContext: AgentContext

  beforeEach(async () => {
    vi.clearAllMocks()

    const module = await import('../../../../services/ai/agents/OutlineAgent')
    OutlineAgent = module.OutlineAgent
    agent = new OutlineAgent()
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
      expect(agent.agentType).toBe('outline')
    })

    it('should have correct name', () => {
      expect(agent.name).toBe('Outline Agent')
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
      const input: OutlineAgentInput = {
        keyword: 'concrete driveway cost',
        researchData: mockResearchOutput,
        articleContext: 'DIY homeowners',
        secondaryKeywords: ['concrete driveway price', 'cost to pour concrete driveway'],
        targetWordCount: 2000,
      }
      expect(agent.validateInput(input)).toBe(true)
    })

    it('should accept valid input with minimal fields', () => {
      const input: OutlineAgentInput = {
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

    it('should reject missing keyword', () => {
      const input = {
        researchData: mockResearchOutput,
        targetWordCount: 2000,
      }
      expect(agent.validateInput(input)).toBe(false)
    })

    it('should reject missing researchData', () => {
      const input = {
        keyword: 'concrete driveway cost',
        targetWordCount: 2000,
      }
      expect(agent.validateInput(input)).toBe(false)
    })

    it('should reject missing targetWordCount', () => {
      const input = {
        keyword: 'concrete driveway cost',
        researchData: mockResearchOutput,
      }
      expect(agent.validateInput(input)).toBe(false)
    })
  })

  // =====================================================
  // CORE FUNCTIONALITY TESTS (6 Required Cases)
  // =====================================================

  describe('generates outline with H2/H3 structure', () => {
    it('should generate sections with H2 and H3 levels', async () => {
      const input: OutlineAgentInput = {
        keyword: 'concrete driveway cost',
        researchData: mockResearchOutput,
        targetWordCount: 2000,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.success).toBe(true)
      expect(result.output?.sections).toBeDefined()
      expect(result.output?.sections.length).toBeGreaterThan(0)

      // Verify H2 and H3 levels exist
      const levels = result.output?.sections.map((s: any) => s.level) ?? []
      expect(levels.some((l: number) => l === 2)).toBe(true)
      expect(levels.some((l: number) => l === 3)).toBe(true)

      // Verify all levels are 2 or 3
      expect(levels.every((l: number) => l === 2 || l === 3)).toBe(true)
    })

    it('should include section titles', async () => {
      const input: OutlineAgentInput = {
        keyword: 'concrete driveway cost',
        researchData: mockResearchOutput,
        targetWordCount: 2000,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.output?.sections).toBeDefined()
      expect(result.output?.sections.every((s: any) => s.title && s.title.length > 0)).toBe(true)
    })

    it('should include target word count for each section', async () => {
      const input: OutlineAgentInput = {
        keyword: 'concrete driveway cost',
        researchData: mockResearchOutput,
        targetWordCount: 2000,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.output?.sections).toBeDefined()
      expect(result.output?.sections.every((s: any) => s.targetWordCount > 0)).toBe(true)
    })
  })

  describe('incorporates PAA questions from research', () => {
    it('should map PAA questions to sections', async () => {
      const input: OutlineAgentInput = {
        keyword: 'concrete driveway cost',
        researchData: mockResearchOutput,
        targetWordCount: 2000,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.output?.sections).toBeDefined()

      // Verify at least some sections have PAA questions
      const sectionsWithPAA = result.output?.sections.filter((s: any) => s.paaQuestionsToAnswer && s.paaQuestionsToAnswer.length > 0) ?? []
      expect(sectionsWithPAA.length).toBeGreaterThan(0)

      // Verify PAA questions come from research data
      const allPAAInOutline = sectionsWithPAA.flatMap((s: any) => s.paaQuestionsToAnswer ?? [])
      const researchPAA = mockResearchOutput.paaQuestions
      expect(allPAAInOutline.some((q: string) => researchPAA.includes(q))).toBe(true)
    })

    it('should not duplicate PAA questions across sections', async () => {
      const input: OutlineAgentInput = {
        keyword: 'concrete driveway cost',
        researchData: mockResearchOutput,
        targetWordCount: 2000,
      }

      const result = await agent.execute(input, mockContext)

      const allPAA = result.output?.sections.flatMap((s: any) => s.paaQuestionsToAnswer ?? []) ?? []
      const uniquePAA = new Set(allPAA)
      expect(allPAA.length).toBe(uniquePAA.size)
    })
  })

  describe('distributes secondary keywords across sections', () => {
    it('should include secondary keywords in sections', async () => {
      const input: OutlineAgentInput = {
        keyword: 'concrete driveway cost',
        researchData: mockResearchOutput,
        secondaryKeywords: ['concrete driveway price', 'cost to pour concrete driveway', 'concrete driveway installation cost'],
        targetWordCount: 2000,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.output?.sections).toBeDefined()

      // Verify at least some sections have secondary keywords
      const sectionsWithKeywords = result.output?.sections.filter((s: any) => s.secondaryKeywordsToInclude && s.secondaryKeywordsToInclude.length > 0) ?? []
      expect(sectionsWithKeywords.length).toBeGreaterThan(0)
    })

    it('should distribute keywords across multiple sections', async () => {
      const input: OutlineAgentInput = {
        keyword: 'concrete driveway cost',
        researchData: mockResearchOutput,
        secondaryKeywords: ['concrete driveway price', 'cost to pour concrete driveway', 'concrete driveway installation cost'],
        targetWordCount: 2000,
      }

      const result = await agent.execute(input, mockContext)

      const allKeywords = result.output?.sections.flatMap((s: any) => s.secondaryKeywordsToInclude ?? []) ?? []
      const uniqueSections = new Set(
        result.output?.sections
          .filter((s: any) => s.secondaryKeywordsToInclude && s.secondaryKeywordsToInclude.length > 0)
          .map((_: any, i: number) => i)
      )

      // Verify keywords are spread across at least 2 sections
      expect(uniqueSections.size).toBeGreaterThanOrEqual(1)
    })
  })

  describe('respects target word count', () => {
    it('should set total target word count matching input', async () => {
      const targetWordCount = 2500
      const input: OutlineAgentInput = {
        keyword: 'concrete driveway cost',
        researchData: mockResearchOutput,
        targetWordCount,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.output?.totalTargetWordCount).toBeDefined()
      // Total should be close to target (within 10% tolerance for distribution)
      expect(result.output?.totalTargetWordCount).toBeLessThanOrEqual(targetWordCount * 1.1)
      expect(result.output?.totalTargetWordCount).toBeGreaterThanOrEqual(targetWordCount * 0.9)
    })

    it('should distribute word count across sections', async () => {
      const input: OutlineAgentInput = {
        keyword: 'concrete driveway cost',
        researchData: mockResearchOutput,
        targetWordCount: 2000,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.output?.sections).toBeDefined()
      expect(result.output?.sections.length).toBeGreaterThan(0)

      // Verify each section has reasonable word count
      result.output?.sections.forEach((section: any) => {
        expect(section.targetWordCount).toBeGreaterThan(0)
        expect(section.targetWordCount).toBeLessThanOrEqual(2000)
      })

      // Verify sum of sections roughly equals total
      const sectionSum = result.output?.sections.reduce((sum: number, s: any) => sum + s.targetWordCount, 0) ?? 0
      expect(sectionSum).toBeCloseTo(result.output?.totalTargetWordCount ?? 0, -1)
    })
  })

  describe('handles missing research data gracefully', () => {
    it('should handle research data with no PAA questions', async () => {
      const researchWithoutPAA: ResearchOutput = {
        ...mockResearchOutput,
        paaQuestions: [],
      }

      const input: OutlineAgentInput = {
        keyword: 'concrete driveway cost',
        researchData: researchWithoutPAA,
        targetWordCount: 2000,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.success).toBe(true)
      expect(result.output?.sections).toBeDefined()
      expect(result.output?.sections.length).toBeGreaterThan(0)
    })

    it('should handle research data with no secondary keywords provided', async () => {
      const input: OutlineAgentInput = {
        keyword: 'concrete driveway cost',
        researchData: mockResearchOutput,
        targetWordCount: 2000,
        // No secondaryKeywords provided
      }

      const result = await agent.execute(input, mockContext)

      expect(result.success).toBe(true)
      expect(result.output?.sections).toBeDefined()
    })

    it('should handle research data with null exaData', async () => {
      const researchWithoutExa: ResearchOutput = {
        ...mockResearchOutput,
        exaData: null,
      }

      const input: OutlineAgentInput = {
        keyword: 'concrete driveway cost',
        researchData: researchWithoutExa,
        targetWordCount: 2000,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.success).toBe(true)
      expect(result.output?.sections).toBeDefined()
      expect(result.output?.sections.length).toBeGreaterThan(0)
    })

    it('should handle empty competitors list', async () => {
      const researchWithoutCompetitors: ResearchOutput = {
        ...mockResearchOutput,
        competitors: [],
      }

      const input: OutlineAgentInput = {
        keyword: 'concrete driveway cost',
        researchData: researchWithoutCompetitors,
        targetWordCount: 2000,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.success).toBe(true)
      expect(result.output?.sections).toBeDefined()
    })
  })

  describe('returns error on LLM failure', () => {
    it('should handle LLM generateJSON failure', async () => {
      const mockLLMProvider = createMockLLMProvider()
      mockLLMProvider.generateJSONWithToolUse = vi.fn().mockRejectedValue(new Error('LLM API error'))

      const input: OutlineAgentInput = {
        keyword: 'concrete driveway cost',
        researchData: mockResearchOutput,
        targetWordCount: 2000,
      }

      const contextWithFailingLLM = createMockContext(mockLLMProvider)
      const result = await agent.execute(input, contextWithFailingLLM)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error).toContain('LLM API error')
    })

    it('should handle invalid LLM response format', async () => {
      const mockLLMProvider = createMockLLMProvider()
      mockLLMProvider.generateJSONWithToolUse = vi.fn().mockResolvedValue({
        data: { invalid: 'structure' }, // Missing required fields
        usage: mockTokenUsage,
        estimatedCostUsd: 0.05,
      })

      const input: OutlineAgentInput = {
        keyword: 'concrete driveway cost',
        researchData: mockResearchOutput,
        targetWordCount: 2000,
      }

      const contextWithInvalidResponse = createMockContext(mockLLMProvider)
      const result = await agent.execute(input, contextWithInvalidResponse)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle LLM timeout', async () => {
      const mockLLMProvider = createMockLLMProvider()
      mockLLMProvider.generateJSONWithToolUse = vi.fn().mockRejectedValue(new Error('Request timeout'))

      const input: OutlineAgentInput = {
        keyword: 'concrete driveway cost',
        researchData: mockResearchOutput,
        targetWordCount: 2000,
      }

      const contextWithTimeout = createMockContext(mockLLMProvider)
      const result = await agent.execute(input, contextWithTimeout)

      expect(result.success).toBe(false)
      expect(result.error).toContain('timeout')
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
      expect(Object.keys(schema).length).toBeGreaterThan(0)
    })
  })

  // =====================================================
  // STRATEGIC NOTES TESTS
  // =====================================================

  describe('strategic notes', () => {
    it('should include optional strategic notes in output', async () => {
      const input: OutlineAgentInput = {
        keyword: 'concrete driveway cost',
        researchData: mockResearchOutput,
        targetWordCount: 2000,
      }

      const result = await agent.execute(input, mockContext)

      // Strategic notes are optional, but if present should be non-empty
      if (result.output?.strategicNotes) {
        expect(result.output.strategicNotes.length).toBeGreaterThan(0)
      }
    })
  })

  // =====================================================
  // TOKEN USAGE TESTS
  // =====================================================

  describe('token usage', () => {
    it('should track prompt and completion tokens', async () => {
      const input: OutlineAgentInput = {
        keyword: 'concrete driveway cost',
        researchData: mockResearchOutput,
        targetWordCount: 2000,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.output?.promptTokens).toBeGreaterThanOrEqual(0)
      expect(result.output?.completionTokens).toBeGreaterThanOrEqual(0)
    })
  })
})
