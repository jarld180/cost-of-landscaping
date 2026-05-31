/**
 * OpenAI Image Service Unit Tests
 *
 * Tests the OpenAIImageService for DALL-E 3 image generation and GPT-4o-mini prompt generation.
 * Uses mocked OpenAI SDK to validate API calls, error handling, and cost calculation.
 *
 * @see DALL-E 3 Image Generation Plan - Task 4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TOKEN_COSTS, DALLE3_COST_PER_IMAGE } from '../../../schemas/ai.schemas'

// =====================================================
// TEST DATA
// =====================================================

const mockImageResponse = {
  created: 1234567890,
  data: [
    {
      url: 'https://oaidalleapiprodscus.blob.core.windows.net/test-image.png',
      revised_prompt: 'A revised version of the original prompt with more detail',
    },
  ],
}

const mockPromptGenerationResponse = {
  id: 'chatcmpl-123',
  object: 'chat.completion',
  created: 1234567890,
  model: 'gpt-4o-mini',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: null,
        parsed: {
          prompts: [
            {
              headingIndex: 0,
              prompt: 'A photorealistic image of a concrete driveway being poured',
              altText: 'Concrete driveway installation in progress',
            },
            {
              headingIndex: 2,
              prompt: 'A stamped concrete patio with decorative patterns',
              altText: 'Decorative stamped concrete patio design',
            },
          ],
        },
        refusal: null,
      },
      finish_reason: 'stop',
    },
  ],
  usage: {
    prompt_tokens: 500,
    completion_tokens: 150,
    total_tokens: 650,
  },
}

// =====================================================
// MOCK OPENAI SDK
// =====================================================

const mockImagesGenerate = vi.fn()
const mockChatCompletionsParse = vi.fn()

vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      images = {
        generate: mockImagesGenerate,
      }

      chat = {
        completions: {
          parse: mockChatCompletionsParse,
        },
      }
    },
  }
})

// Mock zodResponseFormat helper
vi.mock('openai/helpers/zod', () => ({
  zodResponseFormat: vi.fn((schema, name) => ({
    type: 'json_schema',
    json_schema: { name, schema },
  })),
}))

// =====================================================
// TEST SUITE
// =====================================================

describe('OpenAIImageService', () => {
  let OpenAIImageService: typeof import('../../../services/ai/OpenAIImageService').OpenAIImageService
  let service: InstanceType<typeof OpenAIImageService>

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.stubEnv('OPENAI_API_KEY', 'test-api-key')

    // Dynamic import to ensure mock is applied
    const module = await import('../../../services/ai/OpenAIImageService')
    OpenAIImageService = module.OpenAIImageService
    service = new OpenAIImageService('test-api-key')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  // =====================================================
  // CONSTRUCTOR TESTS
  // =====================================================

  describe('constructor', () => {
    it('should throw error if OPENAI_API_KEY is not set', async () => {
      vi.unstubAllEnvs()
      vi.stubEnv('OPENAI_API_KEY', '')

      // Re-import to get fresh module
      vi.resetModules()
      const module = await import('../../../services/ai/OpenAIImageService')

      expect(() => new module.OpenAIImageService('')).toThrow(
        'OPENAI_API_KEY is required'
      )
    })

    it('should create OpenAI client when API key is set', () => {
      expect(service).toBeDefined()
    })
  })

  // =====================================================
  // GENERATE IMAGE TESTS
  // =====================================================

  describe('generateImage', () => {
    it('should call DALL-E 3 with correct parameters', async () => {
      mockImagesGenerate.mockResolvedValue(mockImageResponse)

       await service.generateImage('A concrete driveway', 'natural', 'dall-e-3')

      expect(mockImagesGenerate).toHaveBeenCalledWith({
        model: 'dall-e-3',
        prompt: 'A concrete driveway',
        n: 1,
        size: '1792x1024',
        quality: 'standard',
        style: 'natural',
      })
    })

    it('should return success result with URL and revised prompt', async () => {
      mockImagesGenerate.mockResolvedValue(mockImageResponse)

       const result = await service.generateImage('A concrete driveway', 'natural', 'dall-e-3')

       expect(result).toEqual({
         ok: true,
         url: 'https://oaidalleapiprodscus.blob.core.windows.net/test-image.png',
         revisedPrompt: 'A revised version of the original prompt with more detail',
       })
    })

    it('should use original prompt if revised_prompt is not returned', async () => {
      const responseWithoutRevised = {
        ...mockImageResponse,
        data: [{ url: 'https://example.com/image.png' }],
      }
      mockImagesGenerate.mockResolvedValue(responseWithoutRevised)

       const result = await service.generateImage('Original prompt', 'vivid', 'dall-e-3')

       expect(result).toEqual({
         ok: true,
         url: 'https://example.com/image.png',
         revisedPrompt: 'Original prompt',
       })
    })

    it('should support vivid style', async () => {
      mockImagesGenerate.mockResolvedValue(mockImageResponse)

       await service.generateImage('A colorful image', 'vivid', 'dall-e-3')

       expect(mockImagesGenerate).toHaveBeenCalledWith(
         expect.objectContaining({ style: 'vivid' })
       )
    })

    it('should handle rate limit error (429) and return error union', async () => {
      const rateLimitError = new Error('Rate limit exceeded')
      Object.assign(rateLimitError, { status: 429 })
      mockImagesGenerate.mockRejectedValue(rateLimitError)

       const result = await service.generateImage('Test prompt', 'natural', 'dall-e-3')

       expect(result).toEqual({
         ok: false,
         kind: 'rate_limit',
         message: expect.stringContaining('Rate limit'),
       })
    })

    it('should handle content policy rejection', async () => {
      const contentPolicyError = new Error('Your request was rejected as a result of our safety system. Your prompt may contain content that is not allowed by our content policy.')
      Object.assign(contentPolicyError, { status: 400 })
      mockImagesGenerate.mockRejectedValue(contentPolicyError)

       const result = await service.generateImage('Inappropriate content', 'natural', 'dall-e-3')

       expect(result).toEqual({
         ok: false,
         kind: 'content_policy',
         message: expect.stringContaining('content policy'),
       })
    })

    it('should handle invalid prompt error (400 without content policy)', async () => {
      const badRequestError = new Error('Invalid prompt format')
      Object.assign(badRequestError, { status: 400 })
      mockImagesGenerate.mockRejectedValue(badRequestError)

       const result = await service.generateImage('Bad prompt', 'natural', 'dall-e-3')

       expect(result).toEqual({
         ok: false,
         kind: 'invalid_prompt',
         message: expect.stringContaining('Invalid prompt'),
       })
    })

    it('should handle server error (5xx)', async () => {
      const serverError = new Error('Internal server error')
      Object.assign(serverError, { status: 500 })
      mockImagesGenerate.mockRejectedValue(serverError)

       const result = await service.generateImage('Test prompt', 'natural', 'dall-e-3')

       expect(result).toEqual({
         ok: false,
         kind: 'server_error',
         message: expect.stringContaining('server error'),
       })
    })

    it('should handle unknown errors', async () => {
      const unknownError = new Error('Something unexpected happened')
      mockImagesGenerate.mockRejectedValue(unknownError)

       const result = await service.generateImage('Test prompt', 'natural', 'dall-e-3')

       expect(result).toEqual({
         ok: false,
         kind: 'unknown',
         message: expect.stringContaining('unexpected'),
       })
     })
   })

   // =====================================================
   // MODEL SELECTION TESTS
   // =====================================================

   describe('model selection', () => {
     it('should call DALL-E 2 API without style or quality params', async () => {
       mockImagesGenerate.mockResolvedValueOnce(mockImageResponse)
       await service.generateImage('test prompt', 'vivid', 'dall-e-2')

       expect(mockImagesGenerate).toHaveBeenCalledWith({
         model: 'dall-e-2',
         prompt: 'test prompt',
         n: 1,
         size: '1024x1024',
         // NO style, NO quality - DALL-E 2 doesn't support them
       })
     })

     it('should call DALL-E 3 API with style and quality params', async () => {
       mockImagesGenerate.mockResolvedValueOnce(mockImageResponse)
       await service.generateImage('test prompt', 'vivid', 'dall-e-3')

       expect(mockImagesGenerate).toHaveBeenCalledWith({
         model: 'dall-e-3',
         prompt: 'test prompt',
         n: 1,
         size: '1792x1024',
         quality: 'standard',
         style: 'vivid',
       })
     })
   })

   // =====================================================
   // GENERATE PROMPTS TESTS
   // =====================================================

  describe('generatePrompts', () => {
    const testHeadings = [
      { index: 0, text: 'Introduction to Concrete Driveways', level: 2 },
      { index: 1, text: 'Cost Factors', level: 2 },
      { index: 2, text: 'Decorative Options', level: 3 },
    ]

    const testContext = {
      keyword: 'concrete driveway cost',
      articleTitle: 'How Much Does a Concrete Driveway Cost?',
      articleExcerpt: 'Learn about concrete driveway costs, factors affecting price, and decorative options.',
    }

    const testOptions = {
      systemPrompt: 'You are an expert at creating image prompts for construction articles.',
      temperature: 0.7,
    }

    it('should call GPT-4o-mini with correct parameters', async () => {
      mockChatCompletionsParse.mockResolvedValue(mockPromptGenerationResponse)

      await service.generatePrompts(testHeadings, testContext, testOptions)

      expect(mockChatCompletionsParse).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o-mini',
          temperature: 0.7,
        })
      )
    })

    it('should use zodResponseFormat for structured output', async () => {
      const { zodResponseFormat } = await import('openai/helpers/zod')
      mockChatCompletionsParse.mockResolvedValue(mockPromptGenerationResponse)

      await service.generatePrompts(testHeadings, testContext, testOptions)

      expect(zodResponseFormat).toHaveBeenCalled()
      expect(mockChatCompletionsParse).toHaveBeenCalledWith(
        expect.objectContaining({
          response_format: expect.objectContaining({
            type: 'json_schema',
          }),
        })
      )
    })

    it('should return prompts with correct structure', async () => {
      mockChatCompletionsParse.mockResolvedValue(mockPromptGenerationResponse)

      const result = await service.generatePrompts(testHeadings, testContext, testOptions)

      expect(result.prompts).toHaveLength(2)
      expect(result.prompts[0]).toEqual({
        headingIndex: 0,
        prompt: 'A photorealistic image of a concrete driveway being poured',
        altText: 'Concrete driveway installation in progress',
      })
    })

    it('should calculate tokens used correctly', async () => {
      mockChatCompletionsParse.mockResolvedValue(mockPromptGenerationResponse)

      const result = await service.generatePrompts(testHeadings, testContext, testOptions)

      expect(result.tokensUsed).toBe(650) // total_tokens from mock
    })

    it('should calculate cost correctly using TOKEN_COSTS', async () => {
      mockChatCompletionsParse.mockResolvedValue(mockPromptGenerationResponse)

      const result = await service.generatePrompts(testHeadings, testContext, testOptions)

      // GPT-4o-mini: $0.15/1M input, $0.6/1M output
      const expectedInputCost = (500 / 1_000_000) * TOKEN_COSTS.openai['gpt-4o-mini'].input
      const expectedOutputCost = (150 / 1_000_000) * TOKEN_COSTS.openai['gpt-4o-mini'].output
      const expectedTotal = expectedInputCost + expectedOutputCost

      expect(result.cost).toBeCloseTo(expectedTotal, 10)
    })

    it('should include system prompt in messages', async () => {
      mockChatCompletionsParse.mockResolvedValue(mockPromptGenerationResponse)

      await service.generatePrompts(testHeadings, testContext, testOptions)

      expect(mockChatCompletionsParse).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('expert at creating image prompts'),
            }),
          ]),
        })
      )
    })

    it('should include article context in user message', async () => {
      mockChatCompletionsParse.mockResolvedValue(mockPromptGenerationResponse)

      await service.generatePrompts(testHeadings, testContext, testOptions)

      expect(mockChatCompletionsParse).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('concrete driveway cost'),
            }),
          ]),
        })
      )
    })

    it('should handle missing usage data gracefully', async () => {
      const responseWithoutUsage = {
        ...mockPromptGenerationResponse,
        usage: undefined,
      }
      mockChatCompletionsParse.mockResolvedValue(responseWithoutUsage)

      const result = await service.generatePrompts(testHeadings, testContext, testOptions)

      expect(result.tokensUsed).toBe(0)
      expect(result.cost).toBe(0)
    })

     it('should handle API errors gracefully', async () => {
       const apiError = new Error('API error')
       mockChatCompletionsParse.mockRejectedValue(apiError)

       await expect(
         service.generatePrompts(testHeadings, testContext, testOptions)
       ).rejects.toThrow('API error')
     })

     it('should use provided model in API call', async () => {
       mockChatCompletionsParse.mockResolvedValue(mockPromptGenerationResponse)

       await service.generatePrompts(
         [{ index: 0, text: 'Test Heading', level: 2 }],
         { keyword: 'test', articleTitle: 'Test', articleExcerpt: 'Test excerpt' },
         { systemPrompt: 'Test prompt', temperature: 0.7, model: 'gpt-4o' }
       )

       expect(mockChatCompletionsParse.mock.calls[0][0].model).toBe('gpt-4o')
     })

     it('should default to gpt-4o-mini when model not provided', async () => {
       mockChatCompletionsParse.mockResolvedValue(mockPromptGenerationResponse)

       await service.generatePrompts(
         [{ index: 0, text: 'Test Heading', level: 2 }],
         { keyword: 'test', articleTitle: 'Test', articleExcerpt: 'Test excerpt' },
         { systemPrompt: 'Test prompt', temperature: 0.7 }
       )

       expect(mockChatCompletionsParse.mock.calls[0][0].model).toBe('gpt-4o-mini')
     })

     it('should calculate cost using provided model pricing', async () => {
       mockChatCompletionsParse.mockResolvedValue(mockPromptGenerationResponse)

       const result = await service.generatePrompts(
         [{ index: 0, text: 'Test Heading', level: 2 }],
         { keyword: 'test', articleTitle: 'Test', articleExcerpt: 'Test excerpt' },
         { systemPrompt: 'Test prompt', temperature: 0.7, model: 'gpt-4o' }
       )

       // gpt-4o costs: input=2.5, output=10.0 per 1M tokens
       // mockPromptGenerationResponse has: prompt_tokens=500, completion_tokens=150
       const expectedCost = (500 / 1_000_000) * 2.5 + (150 / 1_000_000) * 10.0
       expect(result.cost).toBeCloseTo(expectedCost, 5)
     })
   })

  // =====================================================
  // COST CONSTANTS TESTS
  // =====================================================

   describe('cost constants', () => {
     it('should use correct DALL-E 3 cost per image', () => {
       expect(DALLE3_COST_PER_IMAGE).toBe(0.08)
     })

     it('should have GPT-4o-mini costs in TOKEN_COSTS', () => {
       expect(TOKEN_COSTS.openai['gpt-4o-mini']).toEqual({
         input: 0.15,
         output: 0.6,
       })
     })
   })

   // =====================================================
   // HELICONE INTEGRATION TESTS
   // =====================================================

   describe('Helicone integration', () => {
     it('should create service without Helicone key (backward compatible)', async () => {
       const module = await import('../../../services/ai/OpenAIImageService')
       const svc = new module.OpenAIImageService('test-api-key')
       expect(svc).toBeDefined()
     })

     it('should create service with Helicone key', async () => {
       const module = await import('../../../services/ai/OpenAIImageService')
       const svc = new module.OpenAIImageService('test-api-key', 'helicone-key')
       expect(svc).toBeDefined()
     })
   })
})
