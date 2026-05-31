import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import type { AgentContext } from '../../../../services/ai/AIAgent'
import type { ILLMProvider } from '../../../../services/ai/LLMProvider'
import type {
  WriterOutput,
  AIArticleJobSettings,
} from '../../../../schemas/ai.schemas'

const mockGeneratePrompts = vi.fn()
const mockGenerateImage = vi.fn()
const mockProcessImage = vi.fn()

vi.mock('../../../../services/ai/OpenAIImageService', () => {
  return {
    OpenAIImageService: class MockOpenAIImageService {
      generatePrompts = mockGeneratePrompts
      generateImage = mockGenerateImage
    },
  }
})

vi.mock('../../../../services/ai/ImageProcessingService', () => {
  return {
    ImageProcessingService: class MockImageProcessingService {
      processImage = mockProcessImage
    },
  }
})

const mockWriterOutput: WriterOutput = {
  title: 'How Much Does a Concrete Driveway Cost',
  slug: 'concrete-driveway-cost',
  content: `# How Much Does a Concrete Driveway Cost

A concrete driveway is a great investment for your home.

## Introduction

This is the introduction section.

## Average Costs

The typical concrete driveway cost ranges from four to fifteen dollars per square foot.

## Factors That Affect Price

The size of your driveway directly impacts the total cost.

## FAQ

Common questions about concrete driveways.

## Conclusion

In conclusion, concrete driveways are worth the investment.`,
  excerpt: 'Learn about concrete driveway costs from $4-$15 per square foot.',
  wordCount: 850,
  headings: [
    { level: 2, text: 'Introduction' },
    { level: 2, text: 'Average Costs' },
    { level: 2, text: 'Factors That Affect Price' },
    { level: 2, text: 'FAQ' },
    { level: 2, text: 'Conclusion' },
  ],
}

const mockWriterOutputWithH3: WriterOutput = {
  ...mockWriterOutput,
  headings: [
    { level: 2, text: 'Introduction' },
    { level: 2, text: 'Average Costs' },
    { level: 3, text: 'Labor Costs' },
    { level: 2, text: 'Factors That Affect Price' },
    { level: 3, text: 'Material Costs' },
    { level: 2, text: 'Conclusion' },
  ],
}

const mockSettings: AIArticleJobSettings = {
  autoPost: false,
  targetWordCount: 1000,
  maxIterations: 3,
  template: 'article',
  generateImages: true,
  maxImages: 3,
  imageStyle: 'natural',
  imageModel: 'dall-e-3',
}

function createMockLLMProvider(): ILLMProvider {
  return {
    providerType: 'anthropic',
    complete: vi.fn(),
    stream: vi.fn(),
    generateText: vi.fn(),
    generateJSON: vi.fn(),
    generateJSONWithToolUse: vi.fn(),
    estimateTokens: vi.fn().mockReturnValue(0),
    calculateCost: vi.fn().mockReturnValue(0),
  }
}

function createMockSupabaseClient() {
  const mockUpload = vi.fn().mockResolvedValue({ data: { path: 'test/path.webp' }, error: null })
  const mockGetPublicUrl = vi.fn().mockReturnValue({
    data: { publicUrl: 'https://storage.example.com/test/path.webp' },
  })

  return {
    storage: {
      from: vi.fn().mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      }),
    },
    _mockUpload: mockUpload,
    _mockGetPublicUrl: mockGetPublicUrl,
  }
}

function createMockContext(overrides?: Partial<AgentContext>): AgentContext {
   const mockClient = createMockSupabaseClient()
   return {
     client: mockClient as unknown as AgentContext['client'],
     llmProvider: createMockLLMProvider(),
     job: {
       id: 'job-123',
       keyword: 'concrete driveway cost',
       status: 'processing',
       current_agent: 'image_generator',
       current_iteration: 1,
       max_iterations: 3,
       total_tokens_used: 5000,
       estimated_cost_usd: 0.05,
       settings: mockSettings,
       created_at: new Date().toISOString(),
       updated_at: new Date().toISOString(),
     } as AgentContext['job'],
     persona: {
       id: 'persona-img',
       agent_type: 'image_generator',
       name: 'Image Generator Agent',
       system_prompt: 'You are an image prompt generator.',
       provider: 'openai',
       model: 'gpt-4o-mini',
       temperature: 0.7,
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
     openaiApiKey: 'test-api-key',
     ...overrides,
   }
 }

describe('ImageGeneratorAgent', () => {
  let ImageGeneratorAgent: typeof import('../../../../services/ai/agents/ImageGeneratorAgent').ImageGeneratorAgent
  let agent: InstanceType<typeof ImageGeneratorAgent>
  let mockContext: AgentContext

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.stubEnv('OPENAI_API_KEY', 'test-api-key')

    const module = await import('../../../../services/ai/agents/ImageGeneratorAgent')
    ImageGeneratorAgent = module.ImageGeneratorAgent
    agent = new ImageGeneratorAgent()
    mockContext = createMockContext()

    mockGeneratePrompts.mockResolvedValue({
      prompts: [
        { headingIndex: 1, prompt: 'A detailed image of concrete costs', altText: 'Concrete cost breakdown' },
        { headingIndex: 2, prompt: 'Factors affecting concrete price', altText: 'Price factors illustration' },
      ],
      tokensUsed: 500,
      cost: 0.001,
    })

    mockGenerateImage.mockResolvedValue({
      ok: true,
      url: 'https://dalle.example.com/image.png',
      revisedPrompt: 'A detailed image of concrete costs (revised)',
    })

    mockProcessImage.mockResolvedValue({
      ok: true,
      data: {
        original: { buffer: Buffer.from('original'), width: 1792, height: 1024, size: 50000 },
        thumbnail: { buffer: Buffer.from('thumbnail'), width: 510, height: 285, size: 10000 },
        pngBuffer: Buffer.from('png-data'),
      },
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('metadata', () => {
    it('should have correct agent type', () => {
      expect(agent.agentType).toBe('image_generator')
    })

    it('should have correct name', () => {
      expect(agent.name).toBe('Image Generator Agent')
    })

    it('should have a description', () => {
      expect(agent.description).toBeTruthy()
      expect(agent.description.length).toBeGreaterThan(10)
    })
  })

  describe('validateInput', () => {
    it('should accept valid input with all fields', () => {
      const input = {
        keyword: 'concrete driveway cost',
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
      expect(agent.validateInput({ keyword: '', article: mockWriterOutput, settings: mockSettings })).toBe(false)
    })

    it('should reject missing keyword', () => {
      expect(agent.validateInput({ article: mockWriterOutput, settings: mockSettings })).toBe(false)
    })

    it('should reject missing article', () => {
      expect(agent.validateInput({ keyword: 'test', settings: mockSettings })).toBe(false)
    })

    it('should reject missing settings', () => {
      expect(agent.validateInput({ keyword: 'test', article: mockWriterOutput })).toBe(false)
    })
  })

  describe('skip generation', () => {
    it('should skip generation when generateImages is false', async () => {
      const input = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        settings: { ...mockSettings, generateImages: false },
      }

      const result = await agent.execute(input, mockContext)

      expect(result.success).toBe(true)
      expect(result.output?.images).toHaveLength(0)
      expect(result.output?.totalImages).toBe(0)
      expect(mockGeneratePrompts).not.toHaveBeenCalled()
    })

    it('should skip generation when maxImages is 0', async () => {
      const input = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        settings: { ...mockSettings, maxImages: 0 },
      }

      const result = await agent.execute(input, mockContext)

      expect(result.success).toBe(true)
      expect(result.output?.images).toHaveLength(0)
      expect(mockGeneratePrompts).not.toHaveBeenCalled()
    })

     it('should return empty output when OPENAI_API_KEY is missing', async () => {
       const contextWithoutApiKey = createMockContext({ openaiApiKey: undefined })

       const input = {
         keyword: 'concrete driveway cost',
         article: mockWriterOutput,
         settings: mockSettings,
       }

       const result = await agent.execute(input, contextWithoutApiKey)

       expect(result.success).toBe(true)
       expect(result.output?.images).toHaveLength(0)
       expect(contextWithoutApiKey.log).toHaveBeenCalledWith('warn', expect.stringContaining('OpenAI API key not provided'))
     })
  })

  describe('H2 filtering', () => {
    it('should only process H2 headings', async () => {
      const input = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutputWithH3,
        settings: mockSettings,
      }

      await agent.execute(input, mockContext)

      expect(mockGeneratePrompts).toHaveBeenCalled()
      const callArgs = mockGeneratePrompts.mock.calls[0][0]
      expect(callArgs.every((h: { level: number }) => h.level === 2)).toBe(true)
    })
  })

  describe('skip list', () => {
    it('should skip headings matching skip list (case-insensitive)', async () => {
      const input = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        settings: mockSettings,
      }

      await agent.execute(input, mockContext)

      expect(mockGeneratePrompts).toHaveBeenCalled()
      const callArgs = mockGeneratePrompts.mock.calls[0][0]
      const headingTexts = callArgs.map((h: { text: string }) => h.text.toLowerCase())
      expect(headingTexts).not.toContain('introduction')
      expect(headingTexts).not.toContain('faq')
      expect(headingTexts).not.toContain('conclusion')
    })

    it('should skip "faqs" and "conclusions" (plural forms)', async () => {
      const articleWithPlurals: WriterOutput = {
        ...mockWriterOutput,
        headings: [
          { level: 2, text: 'Average Costs' },
          { level: 2, text: 'FAQs' },
          { level: 2, text: 'Conclusions' },
        ],
      }

      const input = {
        keyword: 'concrete driveway cost',
        article: articleWithPlurals,
        settings: mockSettings,
      }

      await agent.execute(input, mockContext)

      expect(mockGeneratePrompts).toHaveBeenCalled()
      const callArgs = mockGeneratePrompts.mock.calls[0][0]
      expect(callArgs).toHaveLength(1)
      expect(callArgs[0].text).toBe('Average Costs')
    })

    it('should skip "summary" heading', async () => {
      const articleWithSummary: WriterOutput = {
        ...mockWriterOutput,
        headings: [
          { level: 2, text: 'Average Costs' },
          { level: 2, text: 'Summary' },
        ],
      }

      const input = {
        keyword: 'concrete driveway cost',
        article: articleWithSummary,
        settings: mockSettings,
      }

      await agent.execute(input, mockContext)

      expect(mockGeneratePrompts).toHaveBeenCalled()
      const callArgs = mockGeneratePrompts.mock.calls[0][0]
      expect(callArgs).toHaveLength(1)
      expect(callArgs[0].text).toBe('Average Costs')
    })
  })

  describe('maxImages limit', () => {
    it('should respect maxImages limit with even selection', async () => {
      const articleManyHeadings: WriterOutput = {
        ...mockWriterOutput,
        headings: [
          { level: 2, text: 'Section One' },
          { level: 2, text: 'Section Two' },
          { level: 2, text: 'Section Three' },
          { level: 2, text: 'Section Four' },
          { level: 2, text: 'Section Five' },
          { level: 2, text: 'Section Six' },
        ],
      }

      const input = {
        keyword: 'concrete driveway cost',
        article: articleManyHeadings,
        settings: { ...mockSettings, maxImages: 2 },
      }

      await agent.execute(input, mockContext)

      expect(mockGeneratePrompts).toHaveBeenCalled()
      const callArgs = mockGeneratePrompts.mock.calls[0][0]
      expect(callArgs).toHaveLength(2)
      expect(callArgs[0].text).toBe('Section One')
      expect(callArgs[1].text).toBe('Section Four')
    })

    it('should use all headings when count is less than maxImages', async () => {
      const articleFewHeadings: WriterOutput = {
        ...mockWriterOutput,
        headings: [
          { level: 2, text: 'Section One' },
          { level: 2, text: 'Section Two' },
        ],
      }

      const input = {
        keyword: 'concrete driveway cost',
        article: articleFewHeadings,
        settings: { ...mockSettings, maxImages: 5 },
      }

      await agent.execute(input, mockContext)

      expect(mockGeneratePrompts).toHaveBeenCalled()
      const callArgs = mockGeneratePrompts.mock.calls[0][0]
      expect(callArgs).toHaveLength(2)
    })
  })

  describe('partial failure handling', () => {
    it('should return partial success when some images fail', async () => {
      mockGeneratePrompts.mockResolvedValue({
        prompts: [
          { headingIndex: 1, prompt: 'Prompt 1', altText: 'Alt 1' },
          { headingIndex: 2, prompt: 'Prompt 2', altText: 'Alt 2' },
        ],
        tokensUsed: 500,
        cost: 0.001,
      })

      mockGenerateImage
        .mockResolvedValueOnce({
          ok: true,
          url: 'https://dalle.example.com/image1.png',
          revisedPrompt: 'Prompt 1 revised',
        })
        .mockResolvedValueOnce({
          ok: false,
          kind: 'content_policy',
          message: 'Content policy violation',
        })

      const input = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        settings: mockSettings,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.success).toBe(true)
      expect(result.output?.successfulImages).toBe(1)
      expect(result.output?.failedImages).toBe(1)
      expect(result.output?.images.some(img => img.status === 'success')).toBe(true)
      expect(result.output?.images.some(img => img.status === 'failed')).toBe(true)
    })

    it('should return success with empty images when all fail', async () => {
      mockGeneratePrompts.mockResolvedValue({
        prompts: [
          { headingIndex: 1, prompt: 'Prompt 1', altText: 'Alt 1' },
        ],
        tokensUsed: 500,
        cost: 0.001,
      })

      mockGenerateImage.mockResolvedValue({
        ok: false,
        kind: 'server_error',
        message: 'Server error',
      })

      const input = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        settings: mockSettings,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.success).toBe(true)
      expect(result.output?.successfulImages).toBe(0)
      expect(result.output?.failedImages).toBeGreaterThan(0)
    })

    it('should handle image processing failures gracefully', async () => {
      mockProcessImage.mockResolvedValue({
        ok: false,
        kind: 'conversion_failed',
        message: 'Sharp conversion failed',
      })

      const input = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        settings: mockSettings,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.success).toBe(true)
      expect(result.output?.images.every(img => img.status === 'failed')).toBe(true)
    })

    it('should handle upload failures gracefully', async () => {
      const mockClient = mockContext.client as unknown as ReturnType<typeof createMockSupabaseClient>
      mockClient._mockUpload.mockResolvedValue({ data: null, error: { message: 'Upload failed' } })

      const input = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        settings: mockSettings,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.success).toBe(true)
      expect(result.output?.images.every(img => img.status === 'failed')).toBe(true)
    })
  })

  describe('cost calculation', () => {
    it('should calculate correct total cost', async () => {
      mockGeneratePrompts.mockResolvedValue({
        prompts: [
          { headingIndex: 1, prompt: 'Prompt 1', altText: 'Alt 1' },
          { headingIndex: 2, prompt: 'Prompt 2', altText: 'Alt 2' },
        ],
        tokensUsed: 500,
        cost: 0.001,
      })

      const input = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        settings: mockSettings,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.output?.totalCost).toBeCloseTo(0.161, 3)
      expect(result.output?.promptCost).toBeCloseTo(0.001, 3)
    })

    it('should only count successful images in cost', async () => {
      mockGeneratePrompts.mockResolvedValue({
        prompts: [
          { headingIndex: 1, prompt: 'Prompt 1', altText: 'Alt 1' },
          { headingIndex: 2, prompt: 'Prompt 2', altText: 'Alt 2' },
        ],
        tokensUsed: 500,
        cost: 0.001,
      })

      mockGenerateImage
        .mockResolvedValueOnce({
          ok: true,
          url: 'https://dalle.example.com/image1.png',
          revisedPrompt: 'Prompt 1 revised',
        })
        .mockResolvedValueOnce({
          ok: false,
          kind: 'content_policy',
          message: 'Content policy violation',
        })

      const input = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        settings: mockSettings,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.output?.totalCost).toBeCloseTo(0.081, 3)
    })
  })

  describe('Supabase upload', () => {
    it('should upload to page-images bucket', async () => {
      const input = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        settings: mockSettings,
      }

      await agent.execute(input, mockContext)

      const mockClient = mockContext.client as unknown as ReturnType<typeof createMockSupabaseClient>
      expect(mockClient.storage.from).toHaveBeenCalledWith('page-images')
    })

    it('should use correct storage path format', async () => {
      const input = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        settings: mockSettings,
      }

      await agent.execute(input, mockContext)

      const mockClient = mockContext.client as unknown as ReturnType<typeof createMockSupabaseClient>
      const uploadCalls = mockClient._mockUpload.mock.calls

      for (const call of uploadCalls) {
        const path = call[0] as string
        expect(path).toMatch(/^\d{4}\/\d{2}\/[\w-]+-h2-\d+-[a-f0-9]{6}(-thumb)?\.webp$/)
      }
    })

    it('should return both imageUrl and thumbnailUrl for successful images', async () => {
      const input = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        settings: mockSettings,
      }

      const result = await agent.execute(input, mockContext)

      const successfulImages = result.output?.images.filter(img => img.status === 'success') ?? []
      for (const img of successfulImages) {
        expect(img.imageUrl).toBeTruthy()
        expect(img.thumbnailUrl).toBeTruthy()
        expect(img.imageUrl).toContain('https://')
        expect(img.thumbnailUrl).toContain('https://')
      }
    })

    it('should use same hash for original and thumbnail', async () => {
      const input = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        settings: mockSettings,
      }

      await agent.execute(input, mockContext)

      const mockClient = mockContext.client as unknown as ReturnType<typeof createMockSupabaseClient>
      const uploadCalls = mockClient._mockUpload.mock.calls

      for (let i = 0; i < uploadCalls.length; i += 2) {
        const originalPath = uploadCalls[i][0] as string
        const thumbPath = uploadCalls[i + 1]?.[0] as string
        if (thumbPath) {
          const originalHash = originalPath.match(/-([a-f0-9]{6})\.webp$/)?.[1]
          const thumbHash = thumbPath.match(/-([a-f0-9]{6})-thumb\.webp$/)?.[1]
          expect(originalHash).toBe(thumbHash)
        }
      }
    })

    it('should use correct upload options', async () => {
      const input = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        settings: mockSettings,
      }

      await agent.execute(input, mockContext)

      const mockClient = mockContext.client as unknown as ReturnType<typeof createMockSupabaseClient>
      const uploadCalls = mockClient._mockUpload.mock.calls

      for (const call of uploadCalls) {
        const options = call[2] as { contentType: string; cacheControl: string; upsert: boolean }
        expect(options.contentType).toBe('image/webp')
        expect(options.cacheControl).toBe('31536000')
        expect(options.upsert).toBe(false)
      }
    })
  })

  describe('heading index', () => {
    it('should use original heading index (not filtered index)', async () => {
      const input = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        settings: mockSettings,
      }

      await agent.execute(input, mockContext)

      expect(mockGeneratePrompts).toHaveBeenCalled()
      const callArgs = mockGeneratePrompts.mock.calls[0][0]
      expect(callArgs.some((h: { index: number }) => h.index === 1)).toBe(true)
      expect(callArgs.some((h: { index: number }) => h.index === 2)).toBe(true)
    })
  })

  describe('output schema', () => {
    it('should return a valid output schema', () => {
      const schema = agent.getOutputSchema()

      expect(schema).toBeDefined()
      expect(typeof schema).toBe('object')
      expect(Object.keys(schema).length).toBeGreaterThan(0)
    })
  })

  describe('always returns success', () => {
    it('should always return success=true and continueToNext=true', async () => {
      const input = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        settings: mockSettings,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.success).toBe(true)
      expect(result.continueToNext).toBe(true)
    })

    it('should return success even when prompt generation fails', async () => {
      mockGeneratePrompts.mockRejectedValue(new Error('API error'))

      const input = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        settings: mockSettings,
      }

      const result = await agent.execute(input, mockContext)

      expect(result.success).toBe(true)
      expect(result.continueToNext).toBe(true)
      expect(result.output?.images).toHaveLength(0)
    })
  })

   describe('token usage', () => {
     it('should track prompt tokens and completion tokens', async () => {
       mockGeneratePrompts.mockResolvedValue({
         prompts: [{ headingIndex: 1, prompt: 'Prompt 1', altText: 'Alt 1' }],
         tokensUsed: 500,
         cost: 0.001,
       })

       const input = {
         keyword: 'concrete driveway cost',
         article: mockWriterOutput,
         settings: mockSettings,
       }

       const result = await agent.execute(input, mockContext)

       expect(result.output?.promptTokens).toBeGreaterThanOrEqual(0)
       expect(result.output?.completionTokens).toBeGreaterThanOrEqual(0)
    })
   })

   describe('persona configuration', () => {
     it('should pass persona.system_prompt to generatePrompts', async () => {
       const customPersona = { ...mockContext.persona, system_prompt: 'Custom system prompt for testing' }
       const ctx = createMockContext({ persona: customPersona as AgentContext['persona'] })

       const input = {
         keyword: 'concrete driveway cost',
         article: mockWriterOutput,
         settings: mockSettings,
       }

       await agent.execute(input, ctx)

       const options = mockGeneratePrompts.mock.calls[0][2]
       expect(options.systemPrompt).toBe('Custom system prompt for testing')
     })

     it('should pass persona.temperature to generatePrompts', async () => {
       const customPersona = { ...mockContext.persona, temperature: 0.9 }
       const ctx = createMockContext({ persona: customPersona as AgentContext['persona'] })

       const input = {
         keyword: 'concrete driveway cost',
         article: mockWriterOutput,
         settings: mockSettings,
       }

       await agent.execute(input, ctx)

       const options = mockGeneratePrompts.mock.calls[0][2]
       expect(options.temperature).toBe(0.9)
     })

     it('should pass persona.model to generatePrompts', async () => {
       const customPersona = { ...mockContext.persona, model: 'gpt-4o' }
       const ctx = createMockContext({ persona: customPersona as AgentContext['persona'] })

       const input = {
         keyword: 'concrete driveway cost',
         article: mockWriterOutput,
         settings: mockSettings,
       }

       await agent.execute(input, ctx)

       const options = mockGeneratePrompts.mock.calls[0][2]
       expect(options.model).toBe('gpt-4o')
     })

     it('should use default temperature when persona.temperature is null', async () => {
       const customPersona = { ...mockContext.persona, temperature: null }
       const ctx = createMockContext({ persona: customPersona as AgentContext['persona'] })

       const input = {
         keyword: 'concrete driveway cost',
         article: mockWriterOutput,
         settings: mockSettings,
       }

       await agent.execute(input, ctx)

       const options = mockGeneratePrompts.mock.calls[0][2]
       expect(options.temperature).toBe(0.7)
     })

     it('should log persona name and model being used', async () => {
       const input = {
         keyword: 'concrete driveway cost',
         article: mockWriterOutput,
         settings: mockSettings,
       }

       await agent.execute(input, mockContext)

       expect(mockContext.log).toHaveBeenCalledWith(
         'debug',
         expect.stringContaining('Image Generator Agent')
       )
       expect(mockContext.log).toHaveBeenCalledWith(
         'debug',
         expect.stringContaining('gpt-4o-mini')
       )
     })
   })

    describe('model-specific cost calculation', () => {
     it('should calculate cost correctly for DALL-E 2', async () => {
       const mockSettingsDalle2: AIArticleJobSettings = {
         ...mockSettings,
         imageModel: 'dall-e-2',
       }

       mockGeneratePrompts.mockResolvedValue({
         prompts: [{ headingIndex: 0, prompt: 'test' }],
         tokensUsed: 100,
         cost: 0.001,
       })

       mockGenerateImage.mockResolvedValue({
         ok: true,
         url: 'https://example.com/image.png',
         revisedPrompt: 'test',
       })

       const input = { keyword: 'test', article: mockWriterOutput, settings: mockSettingsDalle2 }
       const result = await agent.execute(input, mockContext)

       // Cost should be: 1 image * $0.02 + $0.001 prompt cost = $0.021
       expect(result.output?.totalCost).toBeCloseTo(0.021, 3)
     })

     it('should calculate cost correctly for DALL-E 3', async () => {
       const mockSettingsDalle3: AIArticleJobSettings = {
         ...mockSettings,
         imageModel: 'dall-e-3',
       }

       mockGeneratePrompts.mockResolvedValue({
         prompts: [{ headingIndex: 0, prompt: 'test' }],
         tokensUsed: 100,
         cost: 0.001,
       })

       mockGenerateImage.mockResolvedValue({
         ok: true,
         url: 'https://example.com/image.png',
         revisedPrompt: 'test',
       })

       const input = { keyword: 'test', article: mockWriterOutput, settings: mockSettingsDalle3 }
       const result = await agent.execute(input, mockContext)

       // Cost should be: 1 image * $0.08 + $0.001 prompt cost = $0.081
       expect(result.output?.totalCost).toBeCloseTo(0.081, 3)
     })

     it('should pass imageModel to service.generateImage()', async () => {
       const mockSettingsDalle2: AIArticleJobSettings = {
         ...mockSettings,
         imageModel: 'dall-e-2',
       }

       mockGeneratePrompts.mockResolvedValue({
         prompts: [{ headingIndex: 0, prompt: 'test' }],
         tokensUsed: 100,
         cost: 0.001,
       })

       mockGenerateImage.mockResolvedValue({
         ok: true,
         url: 'https://example.com/image.png',
         revisedPrompt: 'test',
       })

       const input = { keyword: 'test', article: mockWriterOutput, settings: mockSettingsDalle2 }
       await agent.execute(input, mockContext)

       // Verify third parameter is 'dall-e-2'
       expect(mockGenerateImage).toHaveBeenCalledWith(
         expect.any(String),
         'natural',
         'dall-e-2'
       )
     })
   })
})
