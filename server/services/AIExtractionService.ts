/**
 * AI Extraction Service
 *
 * Uses OpenAI GPT-4o-mini with structured outputs to extract business information
 * from crawled website content. Infers applicable service types from existing categories.
 */

import OpenAI from 'openai'
import { consola } from 'consola'
import { z } from 'zod'
import { zodResponseFormat } from 'openai/helpers/zod'
import { lenientBusinessHoursSchema } from '../schemas/business-hours.schema'

// =====================================================
// TYPES & SCHEMAS
// =====================================================

export const socialLinksSchema = z.object({
  facebook: z.string().nullable(),
  instagram: z.string().nullable(),
  twitter: z.string().nullable(),
  linkedin: z.string().nullable(),
  youtube: z.string().nullable(),
  yelp: z.string().nullable(),
})

export const extractionResultSchema = z.object({
  description: z.string().max(160).nullable().describe('Short SEO-friendly business description (max 160 chars)'),
  business_hours: lenientBusinessHoursSchema,
  email: z.string().nullable(),
  phone: z.string().nullable(),
  social_links: socialLinksSchema.nullable(),
  service_slugs: z.array(z.string()).describe('Array of service type slugs that match the business'),
})

export type ExtractionResult = z.infer<typeof extractionResultSchema>

export interface ServiceType {
  id: string
  name: string
  slug: string
}

export interface LocationContext {
  streetAddress: string | null
  city: string | null
  state: string | null
  postalCode: string | null
}

export interface CrawlerServiceTypeSignal {
  slug: string
  confidence: number
  matchedKeywords: string[]
  sourceUrls: string[]
}

export interface AIExtractionInput {
  websiteContent: string
  availableServiceTypes: ServiceType[]
  companyName: string
  locationContext?: LocationContext
  crawlerSignals?: CrawlerServiceTypeSignal[]
}

export interface AIExtractionOutput {
  success: boolean
  result: ExtractionResult | null
  error?: string
  tokensUsed?: number
}

// =====================================================
// SERVICE
// =====================================================

export class AIExtractionService {
  private client: OpenAI

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required')
    }
    this.client = new OpenAI({ apiKey })
  }

  /**
   * Extract business information from website content
   */
  async extract(input: AIExtractionInput): Promise<AIExtractionOutput> {
    const { websiteContent, availableServiceTypes, companyName, locationContext, crawlerSignals } = input

    // Build service types reference for the prompt
    const serviceTypesList = availableServiceTypes
      .map(st => `- ${st.slug}: ${st.name}`)
      .join('\n')

    // Build location context string if provided
    let locationInstruction = ''
    if (locationContext) {
      const locationParts: string[] = []
      if (locationContext.streetAddress) locationParts.push(locationContext.streetAddress)
      if (locationContext.city) locationParts.push(locationContext.city)
      if (locationContext.state) locationParts.push(locationContext.state)
      if (locationContext.postalCode) locationParts.push(locationContext.postalCode)

      if (locationParts.length > 0) {
        locationInstruction = `
Target Location: ${locationParts.join(', ')}

IMPORTANT: This website may serve multiple locations. Focus your analysis on the target location above.
Look for location-specific pages, services, or information relevant to this area.
If the website mentions services or categories specific to this location, prioritize those.`
      }
    }

    // Build crawler signals section if available
    let crawlerSignalsSection = ''
    if (crawlerSignals && crawlerSignals.length > 0) {
      const signalLines = crawlerSignals
        .filter(s => s.confidence >= 0.4)
        .slice(0, 10)
        .map(s => `- ${s.slug} (${Math.round(s.confidence * 100)}% confidence, found: ${s.matchedKeywords.slice(0, 3).join(', ')})`)
        .join('\n')

      if (signalLines) {
        crawlerSignalsSection = `
Crawler Pre-Analysis (use as hints, verify against content):
${signalLines}

Note: These are keyword-based signals from the crawler. Use them as starting points, but verify each service type is actually offered based on the content. You may add services the crawler missed or remove false positives.`
      }
    }

    const systemPrompt = `You are extracting business information from a contractor website.
Your task is to identify contact details, business hours, social media links, applicable service categories, and generate a short SEO description.
${locationInstruction}
${crawlerSignalsSection}

Available service type slugs to choose from:
${serviceTypesList}

Rules:
- Only return service_slugs from the list above
- For phone numbers, format as: (XXX) XXX-XXXX or leave as found
- For email, extract the primary business email
- For business hours, use 12-hour format (e.g., "8:00 AM", "5:00 PM")
- If information is not found, use null
- Be conservative - only extract information that is clearly present

Description Rules (CRITICAL - max 160 characters):
- Write a short, SEO-friendly description summarizing what the contractor does and where
- Maximum 160 characters including spaces
- Use 7th grade reading level (simple, clear language)
- NO emdashes (—), NO emojis, NO quotation marks
- NO generic marketing phrases like "passionate about", "dedicated to excellence", "trusted partner", "your go-to"
- Focus on: service type + specialty + location + unique value
- Good examples:
  * "landscape driveway and patio installation in Augusta, GA. Serving residential and commercial clients with stamped and decorative finishes."
  * "Full-service landscaper in Charleston, SC. Specializing in foundations, flatwork, and decorative overlays for homes and businesses."
  * "Pool deck resurfacing and repair in Miami, FL. Over 20 years of experience with slip-resistant coatings and custom designs."
- Bad examples (DO NOT USE):
  * "We're passionate about delivering exceptional landscape solutions to our valued customers"
  * "Your trusted partner for all landscape needs in the greater metropolitan area"
  * "Dedicated to excellence in every project we undertake, no matter the size"`

    const userPrompt = `Extract business information for "${companyName}" from this website content:

${websiteContent.substring(0, 40000)}`

    try {
      const completion = await this.client.chat.completions.parse({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: zodResponseFormat(extractionResultSchema, 'extraction'),
        temperature: 0.1,
        max_tokens: 2000,
      })

      const result = completion.choices[0]?.message?.parsed
      const tokensUsed = completion.usage?.total_tokens

      if (!result) {
        return {
          success: false,
          result: null,
          error: 'No result returned from OpenAI',
          tokensUsed,
        }
      }

      consola.debug(`AIExtractionService: Extracted data for ${companyName}`, {
        description: result.description,
        servicesFound: result.service_slugs.length,
        hasEmail: !!result.email,
        hasPhone: !!result.phone,
        tokensUsed,
      })

      return {
        success: true,
        result,
        tokensUsed,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      consola.error(`AIExtractionService: Failed to extract for ${companyName}`, error)
      return {
        success: false,
        result: null,
        error: message,
      }
    }
  }
}

