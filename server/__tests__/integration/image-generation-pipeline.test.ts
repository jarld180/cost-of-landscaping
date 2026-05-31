/**
 * Image Generation Pipeline Integration Tests
 *
 * Tests the full image generation pipeline integration with the AI article workflow.
 * Verifies that images are generated, processed, and stored correctly when enabled,
 * and that the pipeline handles partial failures gracefully.
 *
 * @see BAM-XXX AI Image Generation Feature
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { AgentContext, AgentResult } from '../../services/ai/AIAgent'
import type { ILLMProvider, TokenUsage } from '../../services/ai/LLMProvider'
import type {
  WriterOutput,
  AIArticleJobSettings,
  ImageGeneratorOutput,
  GeneratedImage,
} from '../../schemas/ai.schemas'

// =====================================================
// MOCK SETUP
// =====================================================

const mockGeneratePrompts = vi.fn()
const mockGenerateImage = vi.fn()
const mockProcessImage = vi.fn()

vi.mock('../../services/ai/OpenAIImageService', () => {
  return {
    OpenAIImageService: class MockOpenAIImageService {
      generatePrompts = mockGeneratePrompts
      generateImage = mockGenerateImage
    },
  }
})

vi.mock('../../services/ai/ImageProcessingService', () => {
  return {
    ImageProcessingService: class MockImageProcessingService {
      processImage = mockProcessImage
    },
  }
})

// =====================================================
// MOCK DATA
// =====================================================

const mockTokenUsage: TokenUsage = { inputTokens: 1000, outputTokens: 500, totalTokens: 1500 }

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

const mockSettingsWithImages: AIArticleJobSettings = {
  autoPost: false,
  targetWordCount: 1000,
  maxIterations: 3,
  template: 'article',
  generateImages: true,
  maxImages: 3,
  imageStyle: 'natural',
  imageModel: 'dall-e-3',
}

const mockSettingsWithoutImages: AIArticleJobSettings = {
  autoPost: false,
  targetWordCount: 1000,
  maxIterations: 3,
  template: 'article',
  generateImages: false,
  maxImages: 3,
  imageStyle: 'natural',
  imageModel: 'dall-e-3',
}

// =====================================================
// MOCK FACTORIES
// =====================================================

function createMockLLMProvider(): ILLMProvider {
  return {
    providerType: 'anthropic',
    complete: vi.fn(),
    stream: vi.fn(),
    generateText: vi.fn(),
    generateJSON: vi.fn().mockResolvedValue({
      data: {},
      usage: mockTokenUsage,
      estimatedCostUsd: 0.01,
    }),
    generateJSONWithToolUse: vi.fn().mockResolvedValue({
      data: {},
      usage: mockTokenUsage,
      estimatedCostUsd: 0.01,
    }),
    estimateTokens: vi.fn().mockReturnValue(1000),
    calculateCost: vi.fn().mockReturnValue(0.01),
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
    from: vi.fn().mockImplementation(() => {
      const chain: Record<string, unknown> = {}
      const methods = ['select', 'insert', 'update', 'eq', 'is', 'in', 'order', 'limit', 'range', 'single', 'maybeSingle']
      methods.forEach(method => {
        if (method === 'single' || method === 'maybeSingle') {
          chain[method] = vi.fn().mockResolvedValue({ data: null, error: null })
        } else {
          chain[method] = vi.fn().mockReturnValue(chain)
        }
      })
      return chain
    }),
    _mockUpload: mockUpload,
    _mockGetPublicUrl: mockGetPublicUrl,
  }
}

function createMockContext(settings: AIArticleJobSettings): AgentContext {
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
      settings,
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
  }
}

function setupSuccessfulImageGeneration() {
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
}

function setupPartialImageFailure() {
  mockGeneratePrompts.mockResolvedValue({
    prompts: [
      { headingIndex: 1, prompt: 'Prompt 1', altText: 'Alt 1' },
      { headingIndex: 2, prompt: 'Prompt 2', altText: 'Alt 2' },
      { headingIndex: 3, prompt: 'Prompt 3', altText: 'Alt 3' },
    ],
    tokensUsed: 500,
    cost: 0.001,
  })

  // First image succeeds
  mockGenerateImage
    .mockResolvedValueOnce({
      ok: true,
      url: 'https://dalle.example.com/image1.png',
      revisedPrompt: 'Prompt 1 revised',
    })
    // Second image fails with content policy
    .mockResolvedValueOnce({
      ok: false,
      kind: 'content_policy',
      message: 'Content policy violation',
    })
    // Third image succeeds
    .mockResolvedValueOnce({
      ok: true,
      url: 'https://dalle.example.com/image3.png',
      revisedPrompt: 'Prompt 3 revised',
    })

  mockProcessImage.mockResolvedValue({
    ok: true,
    data: {
      original: { buffer: Buffer.from('original'), width: 1792, height: 1024, size: 50000 },
      thumbnail: { buffer: Buffer.from('thumbnail'), width: 510, height: 285, size: 10000 },
      pngBuffer: Buffer.from('png-data'),
    },
  })
}

// =====================================================
// TEST SUITE
// =====================================================

describe('Image Generation Pipeline Integration', () => {
  let ImageGeneratorAgent: typeof import('../../../services/ai/agents/ImageGeneratorAgent').ImageGeneratorAgent
  let agent: InstanceType<typeof ImageGeneratorAgent>

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.stubEnv('OPENAI_API_KEY', 'test-api-key')

    const module = await import('../../services/ai/agents/ImageGeneratorAgent')
    ImageGeneratorAgent = module.ImageGeneratorAgent
    agent = new ImageGeneratorAgent()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  // =====================================================
  // FULL PIPELINE WITH IMAGES ENABLED
  // =====================================================

  describe('full pipeline with images enabled', () => {
    it('should complete full pipeline with generateImages=true', async () => {
      setupSuccessfulImageGeneration()
      const context = createMockContext(mockSettingsWithImages)

      const input = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        settings: mockSettingsWithImages,
      }

      const result = await agent.execute(input, context)

      expect(result.success).toBe(true)
      expect(result.continueToNext).toBe(true)
      expect(result.output).toBeDefined()
      expect(result.output?.totalImages).toBeGreaterThan(0)
      expect(result.output?.successfulImages).toBeGreaterThan(0)
    })

    it('should generate prompts for eligible H2 headings', async () => {
      setupSuccessfulImageGeneration()
      const context = createMockContext(mockSettingsWithImages)

      const input = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        settings: mockSettingsWithImages,
      }

      await agent.execute(input, context)

      expect(mockGeneratePrompts).toHaveBeenCalled()
      const callArgs = mockGeneratePrompts.mock.calls[0][0]
      // Should skip Introduction, FAQ, and Conclusion
      expect(callArgs.every((h: { text: string }) =>
        !['introduction', 'faq', 'conclusion'].includes(h.text.toLowerCase())
      )).toBe(true)
    })

    it('should upload images to Supabase storage', async () => {
      setupSuccessfulImageGeneration()
      const context = createMockContext(mockSettingsWithImages)
      const mockClient = context.client as unknown as ReturnType<typeof createMockSupabaseClient>

      const input = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        settings: mockSettingsWithImages,
      }

      await agent.execute(input, context)

      expect(mockClient.storage.from).toHaveBeenCalledWith('page-images')
      expect(mockClient._mockUpload).toHaveBeenCalled()
    })

    it('should return images with correct structure', async () => {
      setupSuccessfulImageGeneration()
      const context = createMockContext(mockSettingsWithImages)

      const input = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        settings: mockSettingsWithImages,
      }

      const result = await agent.execute(input, context)

      const successfulImages = result.output?.images.filter(img => img.status === 'success') ?? []
      for (const img of successfulImages) {
        expect(img.headingIndex).toBeDefined()
        expect(img.headingText).toBeTruthy()
        expect(img.imageAlt).toBeTruthy()
        expect(img.prompt).toBeTruthy()
        expect(img.imageUrl).toContain('https://')
        expect(img.thumbnailUrl).toContain('https://')
        expect(img.imagePath).toBeTruthy()
        expect(img.thumbnailPath).toBeTruthy()
      }
    })

    it('should calculate total cost correctly', async () => {
      setupSuccessfulImageGeneration()
      const context = createMockContext(mockSettingsWithImages)

      const input = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        settings: mockSettingsWithImages,
      }

      const result = await agent.execute(input, context)

      expect(result.output?.totalCost).toBeGreaterThan(0)
      expect(result.output?.promptCost).toBeGreaterThan(0)
      // Total cost should include prompt cost + image generation costs
      expect(result.output?.totalCost).toBeGreaterThanOrEqual(result.output?.promptCost ?? 0)
    })
  })

  // =====================================================
  // PIPELINE WITH IMAGES DISABLED
  // =====================================================

  describe('pipeline with images disabled', () => {
    it('should skip image generation when generateImages=false', async () => {
      const context = createMockContext(mockSettingsWithoutImages)

      const input = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        settings: mockSettingsWithoutImages,
      }

      const result = await agent.execute(input, context)

      expect(result.success).toBe(true)
      expect(result.continueToNext).toBe(true)
      expect(result.output?.images).toHaveLength(0)
      expect(result.output?.totalImages).toBe(0)
      expect(result.output?.successfulImages).toBe(0)
      expect(result.output?.failedImages).toBe(0)
      expect(mockGeneratePrompts).not.toHaveBeenCalled()
      expect(mockGenerateImage).not.toHaveBeenCalled()
    })

    it('should return zero cost when images disabled', async () => {
      const context = createMockContext(mockSettingsWithoutImages)

      const input = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        settings: mockSettingsWithoutImages,
      }

      const result = await agent.execute(input, context)

      expect(result.output?.totalCost).toBe(0)
      expect(result.output?.promptCost).toBe(0)
    })

    it('should skip when maxImages is 0', async () => {
      const settingsZeroImages: AIArticleJobSettings = {
        ...mockSettingsWithImages,
        maxImages: 0,
        imageModel: 'dall-e-3',
      }
      const context = createMockContext(settingsZeroImages)

      const input = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        settings: settingsZeroImages,
      }

      const result = await agent.execute(input, context)

      expect(result.success).toBe(true)
      expect(result.output?.images).toHaveLength(0)
      expect(mockGeneratePrompts).not.toHaveBeenCalled()
    })

    it('should skip when OPENAI_API_KEY is missing', async () => {
      vi.stubEnv('OPENAI_API_KEY', '')
      const context = createMockContext(mockSettingsWithImages)

      const input = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        settings: mockSettingsWithImages,
      }

      const result = await agent.execute(input, context)

      expect(result.success).toBe(true)
      expect(result.output?.images).toHaveLength(0)
      expect(context.log).toHaveBeenCalledWith('warn', expect.stringContaining('OPENAI_API_KEY'))
    })
  })

  // =====================================================
  // PARTIAL IMAGE FAILURE
  // =====================================================

  describe('partial image failure handling', () => {
    it('should continue pipeline when some images fail', async () => {
      setupPartialImageFailure()
      const context = createMockContext(mockSettingsWithImages)

      const input = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        settings: mockSettingsWithImages,
      }

      const result = await agent.execute(input, context)

      expect(result.success).toBe(true)
      expect(result.continueToNext).toBe(true)
      // Pipeline should not be blocked by partial failures
    })

    it('should track successful and failed image counts', async () => {
      setupPartialImageFailure()
      const context = createMockContext(mockSettingsWithImages)

      const input = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        settings: mockSettingsWithImages,
      }

      const result = await agent.execute(input, context)

      expect(result.output?.successfulImages).toBe(2)
      expect(result.output?.failedImages).toBe(1)
      expect(result.output?.totalImages).toBe(3)
    })

    it('should include both successful and failed images in output', async () => {
      setupPartialImageFailure()
      const context = createMockContext(mockSettingsWithImages)

      const input = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        settings: mockSettingsWithImages,
      }

      const result = await agent.execute(input, context)

      const successfulImages = result.output?.images.filter(img => img.status === 'success') ?? []
      const failedImages = result.output?.images.filter(img => img.status === 'failed') ?? []

      expect(successfulImages.length).toBe(2)
      expect(failedImages.length).toBe(1)
    })

    it('should include error message for failed images', async () => {
      setupPartialImageFailure()
      const context = createMockContext(mockSettingsWithImages)

      const input = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        settings: mockSettingsWithImages,
      }

      const result = await agent.execute(input, context)

      const failedImages = result.output?.images.filter(img => img.status === 'failed') ?? []
      expect(failedImages[0].errorMessage).toBeTruthy()
      expect(failedImages[0].errorMessage).toContain('Content policy')
    })

    it('should only charge for successful images', async () => {
      setupPartialImageFailure()
      const context = createMockContext(mockSettingsWithImages)

      const input = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        settings: mockSettingsWithImages,
      }

      const result = await agent.execute(input, context)

      // Cost should reflect only 2 successful images, not 3
      // DALL-E 3 cost is $0.08 per image + prompt cost
      const expectedImageCost = 2 * 0.08 // 2 successful images
      const promptCost = result.output?.promptCost ?? 0
      expect(result.output?.totalCost).toBeCloseTo(expectedImageCost + promptCost, 2)
    })

    it('should succeed even when all images fail', async () => {
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

      const context = createMockContext(mockSettingsWithImages)

      const input = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        settings: mockSettingsWithImages,
      }

      const result = await agent.execute(input, context)

      expect(result.success).toBe(true)
      expect(result.continueToNext).toBe(true)
      expect(result.output?.successfulImages).toBe(0)
      expect(result.output?.failedImages).toBeGreaterThan(0)
    })

    it('should handle image processing failures gracefully', async () => {
      mockGeneratePrompts.mockResolvedValue({
        prompts: [
          { headingIndex: 1, prompt: 'Prompt 1', altText: 'Alt 1' },
        ],
        tokensUsed: 500,
        cost: 0.001,
      })

      mockGenerateImage.mockResolvedValue({
        ok: true,
        url: 'https://dalle.example.com/image.png',
        revisedPrompt: 'Revised prompt',
      })

      mockProcessImage.mockResolvedValue({
        ok: false,
        kind: 'conversion_failed',
        message: 'Sharp conversion failed',
      })

      const context = createMockContext(mockSettingsWithImages)

      const input = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        settings: mockSettingsWithImages,
      }

      const result = await agent.execute(input, context)

      expect(result.success).toBe(true)
      expect(result.output?.images.every(img => img.status === 'failed')).toBe(true)
    })

    it('should handle upload failures gracefully', async () => {
      setupSuccessfulImageGeneration()
      const context = createMockContext(mockSettingsWithImages)
      const mockClient = context.client as unknown as ReturnType<typeof createMockSupabaseClient>
      mockClient._mockUpload.mockResolvedValue({ data: null, error: { message: 'Upload failed' } })

      const input = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        settings: mockSettingsWithImages,
      }

      const result = await agent.execute(input, context)

      expect(result.success).toBe(true)
      expect(result.output?.images.every(img => img.status === 'failed')).toBe(true)
    })
  })

  // =====================================================
  // PAGE METADATA AIIMAGES POPULATION
  // =====================================================

  describe('page.metadata.template.aiImages population', () => {
    it('should return output suitable for page metadata', async () => {
      setupSuccessfulImageGeneration()
      const context = createMockContext(mockSettingsWithImages)

      const input = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        settings: mockSettingsWithImages,
      }

      const result = await agent.execute(input, context)

      // The output should be structured for storage in page.metadata.template.aiImages
      const output = result.output as ImageGeneratorOutput
      expect(output).toBeDefined()
      expect(Array.isArray(output.images)).toBe(true)
      expect(typeof output.totalCost).toBe('number')
      expect(typeof output.totalImages).toBe('number')
      expect(typeof output.successfulImages).toBe('number')
      expect(typeof output.failedImages).toBe('number')
    })

    it('should include all required fields for each image', async () => {
      setupSuccessfulImageGeneration()
      const context = createMockContext(mockSettingsWithImages)

      const input = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        settings: mockSettingsWithImages,
      }

      const result = await agent.execute(input, context)

      const successfulImages = result.output?.images.filter(img => img.status === 'success') ?? []

      for (const image of successfulImages) {
        // Required fields for page metadata
        expect(image.headingIndex).toBeDefined()
        expect(typeof image.headingIndex).toBe('number')
        expect(image.headingText).toBeTruthy()
        expect(image.imageAlt).toBeTruthy()
        expect(image.imageUrl).toBeTruthy()
        expect(image.thumbnailUrl).toBeTruthy()
        expect(image.imagePath).toBeTruthy()
        expect(image.thumbnailPath).toBeTruthy()
        expect(image.status).toBe('success')
      }
    })

    it('should map images to correct heading indices', async () => {
      setupSuccessfulImageGeneration()
      const context = createMockContext(mockSettingsWithImages)

      const input = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        settings: mockSettingsWithImages,
      }

      const result = await agent.execute(input, context)

      // Verify heading indices correspond to original article headings
      const successfulImages = result.output?.images.filter(img => img.status === 'success') ?? []

      for (const image of successfulImages) {
        const headingIndex = image.headingIndex
        expect(headingIndex).toBeGreaterThanOrEqual(0)
        expect(headingIndex).toBeLessThan(mockWriterOutput.headings.length)
      }
    })

    it('should preserve heading text for content insertion', async () => {
      setupSuccessfulImageGeneration()
      const context = createMockContext(mockSettingsWithImages)

      const input = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        settings: mockSettingsWithImages,
      }

      const result = await agent.execute(input, context)

      const successfulImages = result.output?.images.filter(img => img.status === 'success') ?? []

      for (const image of successfulImages) {
        // Heading text should match one of the article headings
        const matchingHeading = mockWriterOutput.headings.find(h => h.text === image.headingText)
        expect(matchingHeading).toBeDefined()
      }
    })

    it('should provide alt text for accessibility', async () => {
      setupSuccessfulImageGeneration()
      const context = createMockContext(mockSettingsWithImages)

      const input = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        settings: mockSettingsWithImages,
      }

      const result = await agent.execute(input, context)

      const successfulImages = result.output?.images.filter(img => img.status === 'success') ?? []

      for (const image of successfulImages) {
        expect(image.imageAlt).toBeTruthy()
        expect(image.imageAlt.length).toBeGreaterThan(5) // Meaningful alt text
      }
    })

    it('should include storage paths for image management', async () => {
      setupSuccessfulImageGeneration()
      const context = createMockContext(mockSettingsWithImages)

      const input = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        settings: mockSettingsWithImages,
      }

      const result = await agent.execute(input, context)

      const successfulImages = result.output?.images.filter(img => img.status === 'success') ?? []

      for (const image of successfulImages) {
        // Paths should follow the expected format: YYYY/MM/slug-h2-index-hash.webp
        expect(image.imagePath).toMatch(/^\d{4}\/\d{2}\/[\w-]+-h2-\d+-[a-f0-9]{6}\.webp$/)
        expect(image.thumbnailPath).toMatch(/^\d{4}\/\d{2}\/[\w-]+-h2-\d+-[a-f0-9]{6}-thumb\.webp$/)
      }
    })

    it('should track token usage for cost attribution', async () => {
      setupSuccessfulImageGeneration()
      const context = createMockContext(mockSettingsWithImages)

      const input = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        settings: mockSettingsWithImages,
      }

      const result = await agent.execute(input, context)

      expect(result.output?.promptTokens).toBeGreaterThanOrEqual(0)
      expect(result.output?.completionTokens).toBeGreaterThanOrEqual(0)
    })
  })

  // =====================================================
  // EDGE CASES
  // =====================================================

  describe('edge cases', () => {
    it('should handle article with no eligible headings', async () => {
      const articleNoEligibleHeadings: WriterOutput = {
        ...mockWriterOutput,
        headings: [
          { level: 2, text: 'Introduction' },
          { level: 2, text: 'FAQ' },
          { level: 2, text: 'Conclusion' },
        ],
      }

      const context = createMockContext(mockSettingsWithImages)

      const input = {
        keyword: 'concrete driveway cost',
        article: articleNoEligibleHeadings,
        settings: mockSettingsWithImages,
      }

      const result = await agent.execute(input, context)

      expect(result.success).toBe(true)
      expect(result.output?.images).toHaveLength(0)
      expect(mockGeneratePrompts).not.toHaveBeenCalled()
    })

    it('should handle article with only H3 headings', async () => {
      const articleOnlyH3: WriterOutput = {
        ...mockWriterOutput,
        headings: [
          { level: 3, text: 'Subsection One' },
          { level: 3, text: 'Subsection Two' },
        ],
      }

      const context = createMockContext(mockSettingsWithImages)

      const input = {
        keyword: 'concrete driveway cost',
        article: articleOnlyH3,
        settings: mockSettingsWithImages,
      }

      const result = await agent.execute(input, context)

      expect(result.success).toBe(true)
      expect(result.output?.images).toHaveLength(0)
    })

    it('should respect maxImages limit', async () => {
      const settingsLimitedImages: AIArticleJobSettings = {
        ...mockSettingsWithImages,
        maxImages: 1,
        imageModel: 'dall-e-3',
      }

      mockGeneratePrompts.mockResolvedValue({
        prompts: [
          { headingIndex: 1, prompt: 'Single prompt', altText: 'Single alt' },
        ],
        tokensUsed: 250,
        cost: 0.0005,
      })

      mockGenerateImage.mockResolvedValue({
        ok: true,
        url: 'https://dalle.example.com/image.png',
        revisedPrompt: 'Revised',
      })

      mockProcessImage.mockResolvedValue({
        ok: true,
        data: {
          original: { buffer: Buffer.from('original'), width: 1792, height: 1024, size: 50000 },
          thumbnail: { buffer: Buffer.from('thumbnail'), width: 510, height: 285, size: 10000 },
          pngBuffer: Buffer.from('png-data'),
        },
      })

      const context = createMockContext(settingsLimitedImages)

      const input = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        settings: settingsLimitedImages,
      }

      await agent.execute(input, context)

      // Should only request 1 prompt
      expect(mockGeneratePrompts).toHaveBeenCalled()
      const callArgs = mockGeneratePrompts.mock.calls[0][0]
      expect(callArgs.length).toBeLessThanOrEqual(1)
    })

    it('should handle prompt generation failure gracefully', async () => {
      mockGeneratePrompts.mockRejectedValue(new Error('OpenAI API error'))

      const context = createMockContext(mockSettingsWithImages)

      const input = {
        keyword: 'concrete driveway cost',
        article: mockWriterOutput,
        settings: mockSettingsWithImages,
      }

      const result = await agent.execute(input, context)

      expect(result.success).toBe(true)
      expect(result.continueToNext).toBe(true)
      expect(result.output?.images).toHaveLength(0)
    })
  })
})
