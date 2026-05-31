/**
 * AI Schemas Unit Tests
 *
 * Tests for image generation schemas and related types.
 * Validates schema structure, validation rules, and type exports.
 *
 * @see DALL-E 3 Image Generation Feature
 */

import { describe, it, expect } from 'vitest'
import {
  AI_AGENT_TYPES,
  AGENT_PIPELINE_ORDER,
  DEFAULT_MODELS,
  DALLE3_COST_PER_IMAGE,
  TOKEN_COSTS,
  aiArticleJobSettingsSchema,
  generatedImageSchema,
  imageGeneratorOutputSchema,
  aiFinalOutputSchema,
  type AIAgentType,
  type GeneratedImage,
  type ImageGeneratorOutput,
  type AIFinalOutput,
} from '../../../schemas/ai.schemas'

// =====================================================
// AI_AGENT_TYPES TESTS
// =====================================================

describe('AI_AGENT_TYPES', () => {
  it('should include image_generator as valid agent type', () => {
    expect(AI_AGENT_TYPES).toContain('image_generator')
  })

  it('should have all expected agent types', () => {
    expect(AI_AGENT_TYPES).toEqual([
      'research',
      'outline',
      'writer',
      'seo',
      'qa',
      'project_manager',
      'image_generator',
    ])
  })

  it('should allow image_generator as AIAgentType', () => {
    const agentType: AIAgentType = 'image_generator'
    expect(agentType).toBe('image_generator')
  })
})

// =====================================================
// AGENT_PIPELINE_ORDER TESTS
// =====================================================

describe('AGENT_PIPELINE_ORDER', () => {
  it('should NOT include image_generator (post-pipeline agent)', () => {
    expect(AGENT_PIPELINE_ORDER).not.toContain('image_generator')
  })

  it('should maintain original pipeline order', () => {
    expect(AGENT_PIPELINE_ORDER).toEqual([
      'research',
      'writer',
      'seo',
      'qa',
      'project_manager',
    ])
  })
})

// =====================================================
// DEFAULT_MODELS TESTS
// =====================================================

describe('DEFAULT_MODELS', () => {
  it('should have entry for image_generator', () => {
    expect(DEFAULT_MODELS.image_generator).toBeDefined()
  })

  it('should use gpt-4o-mini for image_generator', () => {
    expect(DEFAULT_MODELS.image_generator).toEqual({
      provider: 'openai',
      model: 'gpt-4o-mini',
    })
  })
})

// =====================================================
// CONSTANTS TESTS
// =====================================================

describe('DALLE3_COST_PER_IMAGE', () => {
  it('should be 0.08 USD per image', () => {
    expect(DALLE3_COST_PER_IMAGE).toBe(0.08)
  })
})

describe('TOKEN_COSTS', () => {
  it('should have gpt-4o-mini costs', () => {
    expect(TOKEN_COSTS.openai['gpt-4o-mini']).toBeDefined()
    expect(TOKEN_COSTS.openai['gpt-4o-mini'].input).toBe(0.15)
    expect(TOKEN_COSTS.openai['gpt-4o-mini'].output).toBe(0.6)
  })
})

// =====================================================
// aiArticleJobSettingsSchema TESTS
// =====================================================

describe('aiArticleJobSettingsSchema', () => {
  it('should validate settings with image generation fields', () => {
    const settings = {
      generateImages: true,
      maxImages: 5,
      imageStyle: 'vivid' as const,
    }
    const result = aiArticleJobSettingsSchema.safeParse(settings)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.generateImages).toBe(true)
      expect(result.data.maxImages).toBe(5)
      expect(result.data.imageStyle).toBe('vivid')
    }
  })

  it('should use defaults for image fields', () => {
    const settings = {}
    const result = aiArticleJobSettingsSchema.safeParse(settings)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.generateImages).toBe(false)
      expect(result.data.maxImages).toBe(3)
      expect(result.data.imageStyle).toBe('natural')
    }
  })

  it('should reject maxImages > 10', () => {
    const settings = { maxImages: 15 }
    const result = aiArticleJobSettingsSchema.safeParse(settings)
    expect(result.success).toBe(false)
  })

  it('should reject maxImages < 0', () => {
    const settings = { maxImages: -1 }
    const result = aiArticleJobSettingsSchema.safeParse(settings)
    expect(result.success).toBe(false)
  })

  it('should reject invalid imageStyle', () => {
    const settings = { imageStyle: 'invalid' }
    const result = aiArticleJobSettingsSchema.safeParse(settings)
    expect(result.success).toBe(false)
  })

  it('should accept image_generator in personaOverrides when all agents specified', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000'
    const settings = {
      personaOverrides: {
        research: uuid,
        outline: uuid,
        writer: uuid,
        seo: uuid,
        qa: uuid,
        project_manager: uuid,
        image_generator: uuid,
      },
    }
    const result = aiArticleJobSettingsSchema.safeParse(settings)
    expect(result.success).toBe(true)
  })

  it('should accept image_generator in skipAgents', () => {
    const settings = {
      skipAgents: ['image_generator' as const],
    }
    const result = aiArticleJobSettingsSchema.safeParse(settings)
    expect(result.success).toBe(true)
  })
})

// =====================================================
// generatedImageSchema TESTS
// =====================================================

describe('generatedImageSchema', () => {
  const validSuccessImage: GeneratedImage = {
    headingIndex: 0,
    headingText: 'Introduction',
    imageAlt: 'Concrete driveway installation',
    prompt: 'A professional photo of a concrete driveway being installed',
    status: 'success',
    imageUrl: 'https://example.com/image.png',
    thumbnailUrl: 'https://example.com/thumb.png',
    imagePath: '/images/generated/image.png',
    thumbnailPath: '/images/generated/thumb.png',
    revisedPrompt: 'A professional photograph showing...',
  }

  const validFailedImage = {
    headingIndex: 1,
    headingText: 'Cost Factors',
    imageAlt: 'Cost breakdown chart',
    prompt: 'A chart showing cost factors',
    status: 'failed' as const,
    errorMessage: 'Content policy violation',
  }

  const validSkippedImage = {
    headingIndex: 2,
    headingText: 'Conclusion',
    imageAlt: 'Summary image',
    prompt: 'A summary image',
    status: 'skipped' as const,
  }

  it('should validate successful image with URLs', () => {
    const result = generatedImageSchema.safeParse(validSuccessImage)
    expect(result.success).toBe(true)
  })

  it('should validate failed image without URLs', () => {
    const result = generatedImageSchema.safeParse(validFailedImage)
    expect(result.success).toBe(true)
  })

  it('should validate skipped image without URLs', () => {
    const result = generatedImageSchema.safeParse(validSkippedImage)
    expect(result.success).toBe(true)
  })

  it('should reject successful image without imageUrl', () => {
    const invalidImage = {
      ...validSuccessImage,
      imageUrl: undefined,
    }
    const result = generatedImageSchema.safeParse(invalidImage)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Successful images must have URLs')
    }
  })

  it('should reject successful image without thumbnailUrl', () => {
    const invalidImage = {
      ...validSuccessImage,
      thumbnailUrl: undefined,
    }
    const result = generatedImageSchema.safeParse(invalidImage)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Successful images must have URLs')
    }
  })

  it('should reject invalid URL format', () => {
    const invalidImage = {
      ...validSuccessImage,
      imageUrl: 'not-a-url',
    }
    const result = generatedImageSchema.safeParse(invalidImage)
    expect(result.success).toBe(false)
  })
})

// =====================================================
// imageGeneratorOutputSchema TESTS
// =====================================================

describe('imageGeneratorOutputSchema', () => {
  const validOutput: ImageGeneratorOutput = {
    images: [
      {
        headingIndex: 0,
        headingText: 'Introduction',
        imageAlt: 'Test image',
        prompt: 'Test prompt',
        status: 'success',
        imageUrl: 'https://example.com/image.png',
        thumbnailUrl: 'https://example.com/thumb.png',
      },
    ],
    totalCost: 0.08,
    totalImages: 1,
    successfulImages: 1,
    failedImages: 0,
    promptTokens: 100,
    completionTokens: 50,
    promptCost: 0.001,
  }

  it('should validate complete output structure', () => {
    const result = imageGeneratorOutputSchema.safeParse(validOutput)
    expect(result.success).toBe(true)
  })

  it('should require all numeric fields', () => {
    const invalidOutput = {
      images: [],
      totalCost: 0,
      // missing other required fields
    }
    const result = imageGeneratorOutputSchema.safeParse(invalidOutput)
    expect(result.success).toBe(false)
  })

  it('should validate empty images array', () => {
    const emptyOutput = {
      ...validOutput,
      images: [],
      totalImages: 0,
      successfulImages: 0,
    }
    const result = imageGeneratorOutputSchema.safeParse(emptyOutput)
    expect(result.success).toBe(true)
  })
})

// =====================================================
// aiFinalOutputSchema TESTS
// =====================================================

describe('aiFinalOutputSchema', () => {
  const validPMOutput = {
    readyForPublish: true,
    validationErrors: [],
    finalArticle: {
      title: 'Test Article',
      slug: 'test-article',
      content: 'Test content',
      excerpt: 'Test excerpt',
      metaTitle: 'Test Meta Title',
      metaDescription: 'Test meta description',
      schemaMarkup: {},
      template: 'article',
      status: 'draft' as const,
      wordCount: 500,
    },
    summary: 'Article completed successfully',
  }

  const validImageOutput: ImageGeneratorOutput = {
    images: [],
    totalCost: 0,
    totalImages: 0,
    successfulImages: 0,
    failedImages: 0,
    promptTokens: 0,
    completionTokens: 0,
    promptCost: 0,
  }

  it('should validate PM output with null imageGeneratorOutput', () => {
    const finalOutput: AIFinalOutput = {
      ...validPMOutput,
      imageGeneratorOutput: null,
    }
    const result = aiFinalOutputSchema.safeParse(finalOutput)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.imageGeneratorOutput).toBeNull()
    }
  })

  it('should validate PM output with imageGeneratorOutput', () => {
    const finalOutput: AIFinalOutput = {
      ...validPMOutput,
      imageGeneratorOutput: validImageOutput,
    }
    const result = aiFinalOutputSchema.safeParse(finalOutput)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.imageGeneratorOutput).toEqual(validImageOutput)
    }
  })

  it('should reject undefined imageGeneratorOutput (must be null)', () => {
    const finalOutput = {
      ...validPMOutput,
      // imageGeneratorOutput is undefined, not null
    }
    const result = aiFinalOutputSchema.safeParse(finalOutput)
    // With .nullable(), undefined should fail - the field is required but can be null
    expect(result.success).toBe(false)
  })

  it('should extend projectManagerOutputSchema fields', () => {
    const finalOutput: AIFinalOutput = {
      ...validPMOutput,
      imageGeneratorOutput: null,
    }
    const result = aiFinalOutputSchema.safeParse(finalOutput)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.readyForPublish).toBe(true)
      expect(result.data.finalArticle.title).toBe('Test Article')
    }
  })
})
