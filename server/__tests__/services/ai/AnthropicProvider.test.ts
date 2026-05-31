/**
 * Anthropic Provider Unit Tests
 *
 * Tests the AnthropicProvider with mocked Anthropic SDK.
 * Validates token tracking, cost calculation, and generateJSON functionality.
 *
 * API Response Structure (from Anthropic SDK docs):
 * - response.usage.input_tokens: number of input tokens
 * - response.usage.output_tokens: number of output tokens
 * - response.content[].type: 'text' for text blocks
 * - response.content[].text: the actual text content
 *
 * @see BAM-312 Batch 3.3: Testing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { z } from 'zod'
import { TOKEN_COSTS } from '../../../schemas/ai.schemas'

// =====================================================
// TEST DATA
// =====================================================

const mockTextResponse = {
  id: 'msg_123',
  type: 'message',
  role: 'assistant',
  content: [{ type: 'text', text: 'Hello, this is a test response.' }],
  model: 'claude-sonnet-4-20250514',
  stop_reason: 'end_turn',
  usage: {
    input_tokens: 100,
    output_tokens: 50,
  },
}

const mockJSONResponse = {
  id: 'msg_456',
  type: 'message',
  role: 'assistant',
  content: [{ type: 'text', text: '{"title": "Test Article", "count": 42}' }],
  model: 'claude-sonnet-4-20250514',
  stop_reason: 'end_turn',
  usage: {
    input_tokens: 200,
    output_tokens: 100,
  },
}

const testSchema = z.object({
  title: z.string(),
  count: z.number(),
})

// =====================================================
// MOCK ANTHROPIC SDK
// =====================================================

const mockCreate = vi.fn()
const mockStream = vi.fn()

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: mockCreate,
        stream: mockStream,
      }
    },
  }
})

// =====================================================
// TEST SUITE
// =====================================================

describe('AnthropicProvider', () => {
  // Import after mock is set up
  let AnthropicProvider: typeof import('../../../services/ai/AnthropicProvider').AnthropicProvider
  let provider: InstanceType<typeof AnthropicProvider>

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks()

    // Dynamic import to ensure mock is applied
    const module = await import('../../../services/ai/AnthropicProvider')
    AnthropicProvider = module.AnthropicProvider

    // Create provider with test API key
    provider = new AnthropicProvider('test-api-key')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // =====================================================
  // PROVIDER METADATA TESTS
  // =====================================================

  describe('metadata', () => {
    it('should have correct provider type', () => {
      expect(provider.providerType).toBe('anthropic')
    })
  })

  // =====================================================
  // HELICONE INTEGRATION TESTS
  // =====================================================

  describe('Helicone integration', () => {
    it('should create provider without Helicone key (backward compatible)', () => {
      const providerWithoutHelicone = new AnthropicProvider('test-api-key')
      expect(providerWithoutHelicone.providerType).toBe('anthropic')
    })

    it('should create provider with Helicone key', () => {
      const providerWithHelicone = new AnthropicProvider('test-api-key', 'helicone-key')
      expect(providerWithHelicone.providerType).toBe('anthropic')
    })
  })

  // =====================================================
  // TOKEN USAGE MAPPING TESTS
  // =====================================================

  describe('token usage mapping', () => {
    it('should correctly map Anthropic usage to TokenUsage format', async () => {
      mockCreate.mockResolvedValue(mockTextResponse)

      const response = await provider.complete({
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'claude-sonnet-4-20250514',
      })

      // Verify token mapping matches Anthropic API response structure
      expect(response.usage.promptTokens).toBe(100) // input_tokens
      expect(response.usage.completionTokens).toBe(50) // output_tokens
      expect(response.usage.totalTokens).toBe(150) // sum
    })

    it('should calculate total tokens as sum of input and output', async () => {
      const customResponse = {
        ...mockTextResponse,
        usage: { input_tokens: 500, output_tokens: 250 },
      }
      mockCreate.mockResolvedValue(customResponse)

      const response = await provider.complete({
        messages: [{ role: 'user', content: 'Test' }],
        model: 'claude-sonnet-4-20250514',
      })

      expect(response.usage.totalTokens).toBe(750)
    })
  })

  // =====================================================
  // COST CALCULATION TESTS
  // =====================================================

  describe('calculateCost', () => {
    it('should calculate cost correctly for claude-sonnet-4-20250514', () => {
      const usage = { promptTokens: 1000, completionTokens: 500, totalTokens: 1500 }
      const cost = provider.calculateCost('claude-sonnet-4-20250514', usage)

      // Claude Sonnet 4: $3/1M input, $15/1M output
      const expectedInputCost = (1000 / 1_000_000) * 3.0
      const expectedOutputCost = (500 / 1_000_000) * 15.0
      const expectedTotal = expectedInputCost + expectedOutputCost

      expect(cost).toBeCloseTo(expectedTotal, 10)
    })

    it('should calculate cost correctly for claude-opus-4-20250514', () => {
      const usage = { promptTokens: 1000, completionTokens: 500, totalTokens: 1500 }
      const cost = provider.calculateCost('claude-opus-4-20250514', usage)

      // Claude Opus 4: $15/1M input, $75/1M output
      const expectedInputCost = (1000 / 1_000_000) * 15.0
      const expectedOutputCost = (500 / 1_000_000) * 75.0
      const expectedTotal = expectedInputCost + expectedOutputCost

      expect(cost).toBeCloseTo(expectedTotal, 10)
    })

    it('should calculate cost correctly for claude-3-5-haiku-20241022', () => {
      const usage = { promptTokens: 1000, completionTokens: 500, totalTokens: 1500 }
      const cost = provider.calculateCost('claude-3-5-haiku-20241022', usage)

      // Claude 3.5 Haiku: $0.8/1M input, $4/1M output
      const expectedInputCost = (1000 / 1_000_000) * 0.8
      const expectedOutputCost = (500 / 1_000_000) * 4.0
      const expectedTotal = expectedInputCost + expectedOutputCost

      expect(cost).toBeCloseTo(expectedTotal, 10)
    })

    it('should return 0 for unknown model', () => {
      const usage = { promptTokens: 1000, completionTokens: 500, totalTokens: 1500 }
      const cost = provider.calculateCost('unknown-model', usage)

      expect(cost).toBe(0)
    })

    it('should handle large token counts correctly', () => {
      const usage = { promptTokens: 100000, completionTokens: 50000, totalTokens: 150000 }
      const cost = provider.calculateCost('claude-sonnet-4-20250514', usage)

      // Claude Sonnet 4: $3/1M input, $15/1M output
      const expectedInputCost = (100000 / 1_000_000) * 3.0 // $0.30
      const expectedOutputCost = (50000 / 1_000_000) * 15.0 // $0.75
      const expectedTotal = expectedInputCost + expectedOutputCost // $1.05

      expect(cost).toBeCloseTo(expectedTotal, 10)
    })
  })

  // =====================================================
  // ESTIMATE TOKENS TESTS
  // =====================================================

  describe('estimateTokens', () => {
    it('should estimate tokens based on character count', () => {
      const text = 'This is a test string with some words.'
      const estimate = provider.estimateTokens(text)

      // Rough estimation: ~4 characters per token
      const expectedEstimate = Math.ceil(text.length / 4)
      expect(estimate).toBe(expectedEstimate)
    })

    it('should handle empty string', () => {
      const estimate = provider.estimateTokens('')
      expect(estimate).toBe(0)
    })

    it('should handle long text', () => {
      const text = 'a'.repeat(1000)
      const estimate = provider.estimateTokens(text)

      expect(estimate).toBe(250) // 1000 / 4
    })
  })

  // =====================================================
  // GENERATE JSON TESTS
  // =====================================================

  describe('generateJSON', () => {
    it('should parse valid JSON response', async () => {
      mockCreate.mockResolvedValue(mockJSONResponse)

      const result = await provider.generateJSON({
        prompt: 'Generate a test object',
        model: 'claude-sonnet-4-20250514',
        schema: testSchema,
      })

      expect(result.data).toEqual({ title: 'Test Article', count: 42 })
    })

    it('should return token usage from response', async () => {
      mockCreate.mockResolvedValue(mockJSONResponse)

      const result = await provider.generateJSON({
        prompt: 'Generate a test object',
        model: 'claude-sonnet-4-20250514',
        schema: testSchema,
      })

      expect(result.usage.promptTokens).toBe(200)
      expect(result.usage.completionTokens).toBe(100)
      expect(result.usage.totalTokens).toBe(300)
    })

    it('should return estimated cost', async () => {
      mockCreate.mockResolvedValue(mockJSONResponse)

      const result = await provider.generateJSON({
        prompt: 'Generate a test object',
        model: 'claude-sonnet-4-20250514',
        schema: testSchema,
      })

      expect(result.estimatedCostUsd).toBeGreaterThan(0)
    })

    it('should handle JSON wrapped in markdown code blocks', async () => {
      const markdownResponse = {
        ...mockJSONResponse,
        content: [{ type: 'text', text: '```json\n{"title": "Markdown Test", "count": 99}\n```' }],
      }
      mockCreate.mockResolvedValue(markdownResponse)

      const result = await provider.generateJSON({
        prompt: 'Generate a test object',
        model: 'claude-sonnet-4-20250514',
        schema: testSchema,
      })

      expect(result.data).toEqual({ title: 'Markdown Test', count: 99 })
    })

    it('should handle JSON with trailing commas', async () => {
      const trailingCommaResponse = {
        ...mockJSONResponse,
        content: [{ type: 'text', text: '{"title": "Trailing Comma", "count": 77,}' }],
      }
      mockCreate.mockResolvedValue(trailingCommaResponse)

      const result = await provider.generateJSON({
        prompt: 'Generate a test object',
        model: 'claude-sonnet-4-20250514',
        schema: testSchema,
      })

      expect(result.data).toEqual({ title: 'Trailing Comma', count: 77 })
    })

    it('should throw error after max retries for invalid JSON', async () => {
      const invalidResponse = {
        ...mockJSONResponse,
        content: [{ type: 'text', text: 'This is not valid JSON at all' }],
      }
      mockCreate.mockResolvedValue(invalidResponse)

      await expect(
        provider.generateJSON({
          prompt: 'Generate a test object',
          model: 'claude-sonnet-4-20250514',
          schema: testSchema,
          maxRetries: 1,
        })
      ).rejects.toThrow()
    })

    it('should use lower temperature for JSON generation', async () => {
      mockCreate.mockResolvedValue(mockJSONResponse)

      await provider.generateJSON({
        prompt: 'Generate a test object',
        model: 'claude-sonnet-4-20250514',
        schema: testSchema,
      })

      // Verify temperature was set to 0.3 (lower for consistent JSON)
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.3,
        }),
        undefined
      )
    })
  })

  // =====================================================
  // COMPLETE METHOD TESTS
  // =====================================================

  describe('complete', () => {
    it('should extract text content from response', async () => {
      mockCreate.mockResolvedValue(mockTextResponse)

      const response = await provider.complete({
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'claude-sonnet-4-20250514',
      })

      expect(response.content).toBe('Hello, this is a test response.')
    })

    it('should return model from response', async () => {
      mockCreate.mockResolvedValue(mockTextResponse)

      const response = await provider.complete({
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'claude-sonnet-4-20250514',
      })

      expect(response.model).toBe('claude-sonnet-4-20250514')
    })

    it('should return stop reason from response', async () => {
      mockCreate.mockResolvedValue(mockTextResponse)

      const response = await provider.complete({
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'claude-sonnet-4-20250514',
      })

      expect(response.stopReason).toBe('end_turn')
    })

    it('should include estimated cost in response', async () => {
      mockCreate.mockResolvedValue(mockTextResponse)

      const response = await provider.complete({
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'claude-sonnet-4-20250514',
      })

      expect(response.estimatedCostUsd).toBeGreaterThan(0)
    })

    it('should handle multiple text blocks in response', async () => {
      const multiBlockResponse = {
        ...mockTextResponse,
        content: [
          { type: 'text', text: 'First part. ' },
          { type: 'text', text: 'Second part.' },
        ],
      }
      mockCreate.mockResolvedValue(multiBlockResponse)

      const response = await provider.complete({
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'claude-sonnet-4-20250514',
      })

      expect(response.content).toBe('First part. Second part.')
    })
  })
})

