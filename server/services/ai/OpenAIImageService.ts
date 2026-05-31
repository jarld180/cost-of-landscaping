import OpenAI from 'openai'
import { z } from 'zod'
import { zodResponseFormat } from 'openai/helpers/zod'
import { TOKEN_COSTS } from '../../schemas/ai.schemas'
import { withRetry, isRateLimitError } from '../../utils/retry'

export type GeneratedImageResult =
  | { ok: true; url: string; revisedPrompt: string }
  | { ok: false; kind: 'rate_limit' | 'content_policy' | 'invalid_prompt' | 'server_error' | 'unknown'; message: string }

export interface PromptOptions {
  systemPrompt: string
  temperature: number
  model?: string
}

export interface HeadingForPrompt {
  index: number
  text: string
  level: number
}

export interface PromptContext {
  keyword: string
  articleTitle: string
  articleExcerpt: string
}

export interface GeneratedPrompt {
  headingIndex: number
  prompt: string
  altText: string
}

export interface GeneratedPromptsResult {
  prompts: GeneratedPrompt[]
  tokensUsed: number
  cost: number
}

const generatedPromptsSchema = z.object({
  prompts: z.array(z.object({
    headingIndex: z.number().int(),
    prompt: z.string().max(1000),
    altText: z.string().max(125),
  })),
})

export class OpenAIImageService {
  private client: OpenAI

  constructor(apiKey: string, heliconeApiKey?: string) {
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required')
    }

    const clientOptions: ConstructorParameters<typeof OpenAI>[0] = { apiKey }

    if (heliconeApiKey) {
      clientOptions.baseURL = 'https://oai.helicone.ai/v1'
      clientOptions.defaultHeaders = {
        'Helicone-Auth': `Bearer ${heliconeApiKey}`,
      }
    }

    this.client = new OpenAI(clientOptions)
  }

  async generateImage(prompt: string, style: 'vivid' | 'natural', model: 'dall-e-2' | 'dall-e-3', agentName?: string): Promise<GeneratedImageResult> {
    try {
      const options = model === 'dall-e-2'
        ? { model, prompt, n: 1 as const, size: '1024x1024' as const }
        : { model, prompt, n: 1 as const, size: '1792x1024' as const, quality: 'standard' as const, style }

      const response = await withRetry(
        () => this.client.images.generate(options),
        {
          maxRetries: 3,
          isRetryable: (error) => {
            if (isRateLimitError(error)) return true
            if (error && typeof error === 'object' && 'status' in error) {
              const status = (error as { status: number }).status
              return status >= 500
            }
            return false
          },
        }
      )

      const imageData = response.data?.[0]
      if (!imageData?.url) {
        return { ok: false, kind: 'unknown', message: 'No image URL returned from DALL-E' }
      }

      return {
        ok: true,
        url: imageData.url,
        revisedPrompt: imageData.revised_prompt ?? prompt,
      }
    } catch (error) {
      return this.mapImageError(error)
    }
  }

  async generatePrompts(
    headings: HeadingForPrompt[],
    context: PromptContext,
    options: PromptOptions,
    agentName?: string
  ): Promise<GeneratedPromptsResult> {
    const headingsList = headings
      .map(h => `[${h.index}] (H${h.level}) ${h.text}`)
      .join('\n')

    const userMessage = `Generate image prompts for the following article headings.

Article: "${context.articleTitle}"
Keyword: ${context.keyword}
Excerpt: ${context.articleExcerpt}

Headings:
${headingsList}

For each heading that would benefit from an image, generate a detailed DALL-E 3 prompt and alt text.
Focus on headings where a visual would enhance understanding.`

    const model = options.model ?? 'gpt-4o-mini'

    const completion = await this.client.chat.completions.parse({
      model,
      messages: [
        { role: 'system', content: options.systemPrompt },
        { role: 'user', content: userMessage },
      ],
      response_format: zodResponseFormat(generatedPromptsSchema, 'prompts'),
      temperature: options.temperature,
    })

    const parsed = completion.choices[0]?.message?.parsed
    const prompts = parsed?.prompts ?? []

    const promptTokens = completion.usage?.prompt_tokens ?? 0
    const completionTokens = completion.usage?.completion_tokens ?? 0
    const tokensUsed = completion.usage?.total_tokens ?? 0

    const modelCosts = model in TOKEN_COSTS.openai
      ? TOKEN_COSTS.openai[model as keyof typeof TOKEN_COSTS.openai]
      : TOKEN_COSTS.openai['gpt-4o-mini']
    const inputCost = (promptTokens / 1_000_000) * modelCosts.input
    const outputCost = (completionTokens / 1_000_000) * modelCosts.output
    const cost = inputCost + outputCost

    return {
      prompts,
      tokensUsed,
      cost,
    }
  }

  private mapImageError(error: unknown): GeneratedImageResult {
    const message = error instanceof Error ? error.message : String(error)
    const status = error && typeof error === 'object' && 'status' in error
      ? (error as { status: number }).status
      : undefined

    if (status === 429 || isRateLimitError(error)) {
      return { ok: false, kind: 'rate_limit', message }
    }

    if (status === 400) {
      if (message.toLowerCase().includes('content policy')) {
        return { ok: false, kind: 'content_policy', message }
      }
      return { ok: false, kind: 'invalid_prompt', message }
    }

    if (status && status >= 500) {
      return { ok: false, kind: 'server_error', message }
    }

    return { ok: false, kind: 'unknown', message }
  }
}
