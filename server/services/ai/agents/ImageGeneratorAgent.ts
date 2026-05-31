import { createHash } from 'crypto'
import { z } from 'zod'
import { BaseAIAgent, type AgentContext, type AgentResult } from '../AIAgent'
import type { TokenUsage } from '../LLMProvider'
import {
  type AIAgentType,
  type WriterOutput,
  type AIArticleJobSettings,
  type ImageGeneratorOutput,
  type GeneratedImage,
  imageGeneratorOutputSchema,
  DALLE2_COST_PER_IMAGE,
  DALLE3_COST_PER_IMAGE,
} from '../../../schemas/ai.schemas'
import { OpenAIImageService, type HeadingForPrompt, type GeneratedPrompt } from '../OpenAIImageService'
import { ImageProcessingService } from '../ImageProcessingService'

export interface ImageGeneratorInput {
  keyword: string
  article: WriterOutput
  settings: Pick<AIArticleJobSettings, 'generateImages' | 'maxImages' | 'imageStyle' | 'imageModel'>
}

const SKIP_HEADINGS = ['conclusion', 'faq', 'summary', 'introduction', 'faqs', 'conclusions']

const IMAGE_PROMPT_SYSTEM = `You are an expert at creating DALL-E 3 image prompts for article illustrations.
Generate detailed, descriptive prompts that will create professional, relevant images.
Focus on landscape, visual elements that illustrate the heading's topic.
Avoid text in images. Use photorealistic or professional illustration styles.`

function shouldSkipHeading(text: string): boolean {
  return SKIP_HEADINGS.includes(text.trim().toLowerCase())
}

function selectHeadings<T>(eligible: T[], maxImages: number): T[] {
  if (maxImages <= 0) return []
  if (eligible.length <= maxImages) return eligible
  const step = eligible.length / maxImages
  const selected: T[] = []
  for (let i = 0; i < maxImages; i++) {
    selected.push(eligible[Math.floor(i * step)])
  }
  return selected
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

function createEmptyOutput(): ImageGeneratorOutput {
  return {
    images: [],
    totalCost: 0,
    totalImages: 0,
    successfulImages: 0,
    failedImages: 0,
    promptTokens: 0,
    completionTokens: 0,
    promptCost: 0,
  }
}

export class ImageGeneratorAgent extends BaseAIAgent<ImageGeneratorInput, ImageGeneratorOutput> {
  readonly agentType: AIAgentType = 'image_generator'
  readonly name = 'Image Generator Agent'
  readonly description = 'Generates DALL-E 3 images for article H2 headings'

  validateInput(input: unknown): input is ImageGeneratorInput {
    if (!input || typeof input !== 'object') return false
    const obj = input as Record<string, unknown>
    return (
      typeof obj.keyword === 'string' &&
      obj.keyword.length > 0 &&
      obj.article !== undefined &&
      obj.settings !== undefined
    )
  }

  getOutputSchema(): Record<string, unknown> {
    return z.toJSONSchema(imageGeneratorOutputSchema)
  }

   async execute(input: ImageGeneratorInput, context: AgentContext): Promise<AgentResult<ImageGeneratorOutput>> {
     const { keyword, article, settings } = input
     const { log, onProgress, client, persona } = context
     const emptyUsage: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 }

     log('info', `Starting Image Generator Agent for keyword: "${keyword}"`)
     log('debug', `Using persona: ${persona.name} (model: ${persona.model})`)
     onProgress?.('Image Generator Agent starting...')

    if (!settings.generateImages) {
      log('info', 'Image generation disabled in settings')
      return this.success(createEmptyOutput(), emptyUsage, true, 0)
    }

    if (settings.maxImages <= 0) {
      log('info', 'maxImages is 0, skipping image generation')
      return this.success(createEmptyOutput(), emptyUsage, true, 0)
    }

    const apiKey = context.openaiApiKey
    if (!apiKey) {
      log('warn', 'OpenAI API key not provided, skipping image generation')
      return this.success(createEmptyOutput(), emptyUsage, true, 0)
    }

    try {
      const openaiService = new OpenAIImageService(apiKey, context.heliconeApiKey)
      const imageProcessor = new ImageProcessingService()

      const h2Headings = article.headings
        .map((h, index) => ({ ...h, originalIndex: index }))
        .filter(h => h.level === 2)
        .filter(h => !shouldSkipHeading(h.text))

      if (h2Headings.length === 0) {
        log('info', 'No eligible H2 headings found for image generation')
        return this.success(createEmptyOutput(), emptyUsage, true, 0)
      }

      const selectedHeadings = selectHeadings(h2Headings, settings.maxImages)
      log('info', `Selected ${selectedHeadings.length} headings for image generation`)

       const headingsForPrompt: HeadingForPrompt[] = selectedHeadings.map(h => ({
         index: h.originalIndex,
         text: h.text,
         level: h.level,
       }))

        onProgress?.('Generating image prompts...')
         let promptsResult: { prompts: GeneratedPrompt[]; tokensUsed: number; cost: number }
         try {
           const promptModel = persona.provider === 'openai' ? persona.model : 'gpt-4o-mini'
           promptsResult = await openaiService.generatePrompts(
             headingsForPrompt,
             {
               keyword,
               articleTitle: article.title,
               articleExcerpt: article.excerpt,
             },
             {
               systemPrompt: persona.system_prompt || IMAGE_PROMPT_SYSTEM,
               temperature: persona.temperature ?? 0.7,
               model: promptModel,
             },
             this.agentType
           )
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        log('error', `Failed to generate prompts: ${message}`)
        return this.success(createEmptyOutput(), emptyUsage, true, 0)
      }

      const { prompts, cost: promptCost } = promptsResult
      const images: GeneratedImage[] = []
      let successfulCount = 0
      let failedCount = 0

      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const keywordSlug = slugify(keyword)

        for (const prompt of prompts) {
          onProgress?.(`Generating image for: ${headingsForPrompt.find(h => h.index === prompt.headingIndex)?.text ?? 'heading'}...`)

          const imageModel = settings.imageModel ?? 'dall-e-3'
          const imageResult = await openaiService.generateImage(prompt.prompt, settings.imageStyle, imageModel, this.agentType)

        if (!imageResult.ok) {
          log('warn', `Image generation failed for heading ${prompt.headingIndex}: ${imageResult.message}`)
          images.push({
            headingIndex: prompt.headingIndex,
            headingText: headingsForPrompt.find(h => h.index === prompt.headingIndex)?.text ?? '',
            imageAlt: prompt.altText,
            prompt: prompt.prompt,
            status: 'failed',
            errorMessage: imageResult.message,
          })
          failedCount++
          continue
        }

        onProgress?.('Processing image...')
        const processResult = await imageProcessor.processImage(imageResult.url)

        if (!processResult.ok) {
          log('warn', `Image processing failed for heading ${prompt.headingIndex}: ${processResult.message}`)
          images.push({
            headingIndex: prompt.headingIndex,
            headingText: headingsForPrompt.find(h => h.index === prompt.headingIndex)?.text ?? '',
            imageAlt: prompt.altText,
            prompt: prompt.prompt,
            status: 'failed',
            revisedPrompt: imageResult.revisedPrompt,
            errorMessage: processResult.message,
          })
          failedCount++
          continue
        }

        const { original, thumbnail, pngBuffer } = processResult.data
        const hash = createHash('md5').update(pngBuffer).digest('hex').slice(0, 6)

        const originalPath = `${year}/${month}/${keywordSlug}-h2-${prompt.headingIndex}-${hash}.webp`
        const thumbnailPath = `${year}/${month}/${keywordSlug}-h2-${prompt.headingIndex}-${hash}-thumb.webp`

        onProgress?.('Uploading images...')

        const { error: originalError } = await client.storage
          .from('page-images')
          .upload(originalPath, original.buffer, {
            contentType: 'image/webp',
            cacheControl: '31536000',
            upsert: false,
          })

        if (originalError) {
          log('warn', `Failed to upload original image: ${originalError.message}`)
          images.push({
            headingIndex: prompt.headingIndex,
            headingText: headingsForPrompt.find(h => h.index === prompt.headingIndex)?.text ?? '',
            imageAlt: prompt.altText,
            prompt: prompt.prompt,
            status: 'failed',
            revisedPrompt: imageResult.revisedPrompt,
            errorMessage: `Upload failed: ${originalError.message}`,
          })
          failedCount++
          continue
        }

        const { error: thumbError } = await client.storage
          .from('page-images')
          .upload(thumbnailPath, thumbnail.buffer, {
            contentType: 'image/webp',
            cacheControl: '31536000',
            upsert: false,
          })

        if (thumbError) {
          log('warn', `Failed to upload thumbnail: ${thumbError.message}`)
          images.push({
            headingIndex: prompt.headingIndex,
            headingText: headingsForPrompt.find(h => h.index === prompt.headingIndex)?.text ?? '',
            imageAlt: prompt.altText,
            prompt: prompt.prompt,
            status: 'failed',
            revisedPrompt: imageResult.revisedPrompt,
            errorMessage: `Thumbnail upload failed: ${thumbError.message}`,
          })
          failedCount++
          continue
        }

        const { data: { publicUrl: imageUrl } } = client.storage
          .from('page-images')
          .getPublicUrl(originalPath)

        const { data: { publicUrl: thumbnailUrl } } = client.storage
          .from('page-images')
          .getPublicUrl(thumbnailPath)

        images.push({
          headingIndex: prompt.headingIndex,
          headingText: headingsForPrompt.find(h => h.index === prompt.headingIndex)?.text ?? '',
          imageAlt: prompt.altText,
          prompt: prompt.prompt,
          status: 'success',
          imageUrl,
          thumbnailUrl,
          imagePath: originalPath,
          thumbnailPath,
          revisedPrompt: imageResult.revisedPrompt,
        })
        successfulCount++
      }

       const imageModel = settings.imageModel ?? 'dall-e-3'
       const costPerImage = imageModel === 'dall-e-2' ? DALLE2_COST_PER_IMAGE : DALLE3_COST_PER_IMAGE
       const totalCost = successfulCount * costPerImage + promptCost

      const output: ImageGeneratorOutput = {
        images,
        totalCost,
        totalImages: images.length,
        successfulImages: successfulCount,
        failedImages: failedCount,
        promptTokens: promptsResult.tokensUsed,
        completionTokens: 0,
        promptCost,
      }

      log('info', `Image generation complete: ${successfulCount} successful, ${failedCount} failed`)
      onProgress?.(`Image generation complete: ${successfulCount} images generated`)

      return this.success(
        output,
        { promptTokens: promptsResult.tokensUsed, completionTokens: 0, totalTokens: promptsResult.tokensUsed } as TokenUsage,
        true,
        totalCost
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      log('error', `Image Generator Agent failed: ${message}`)
      return this.success(createEmptyOutput(), emptyUsage, true, 0)
    }
  }
}
