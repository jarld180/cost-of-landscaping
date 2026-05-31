import { z } from 'zod'
import { consola } from 'consola'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../app/types/supabase'
import { AnthropicProvider } from './ai/AnthropicProvider'
import { SystemLogService } from './SystemLogService'
import { lenientBusinessHoursSchema, type BusinessHours } from '../schemas/business-hours.schema'

// =====================================================
// SCHEMAS
// =====================================================

export { lenientBusinessHoursSchema as businessHoursSchema }

export const socialLinksSchema = z.object({
  facebook: z.string().nullable().optional(),
  instagram: z.string().nullable().optional(),
  twitter: z.string().nullable().optional(),
  linkedin: z.string().nullable().optional(),
  youtube: z.string().nullable().optional(),
  yelp: z.string().nullable().optional(),
}).nullable().optional()

const nullableStringArray = z.array(z.string()).nullable().transform(v => v ?? [])

export const profileEnrichmentResultSchema = z.object({
   description: z.string().max(160).nullable().optional().describe('SEO-friendly business description, max 160 chars'),
   email: z.string().email().nullable().optional().describe('Primary business email'),
   phone: z.string().nullable().optional().describe('Primary business phone, formatted'),
   business_hours: lenientBusinessHoursSchema,
   social_links: z.any().optional().transform(v => {
     if (!v || Array.isArray(v)) return null
     return v as z.infer<typeof socialLinksSchema>
   }),
   service_slugs: nullableStringArray.describe('Service type slugs from the provided list'),
   service_areas: nullableStringArray.describe('Cities, regions, or areas served'),
   established_year: z.number().int().min(1800).max(2030).nullable().optional().describe('Year the business was founded'),
   certifications: nullableStringArray.describe('Professional certifications, licenses, insurance, bonds'),
   specialties: nullableStringArray.describe('Business differentiators: family-owned, 24hr service, warranties, etc.'),
   selected_images: z.array(z.object({
     url: z.string(),
     rank: z.number().int().min(1).max(10).catch(10),
     reason: z.string().optional()
   })).max(10).nullable().default([]).transform(v => v ?? []).describe('Top 10 images to download, ranked 1=best. Prefer: project photos, team photos, equipment. Avoid: logos, icons, stock photos.'),
}).transform(data => ({
   ...data,
   description: data.description ?? null,
   email: data.email ?? null,
   phone: data.phone ?? null,
   business_hours: data.business_hours ?? null,
   social_links: data.social_links ?? null,
   established_year: data.established_year ?? null,
   selected_images: data.selected_images ?? [],
}))

export type ProfileEnrichmentResult = z.infer<typeof profileEnrichmentResultSchema>
export type SocialLinks = z.infer<typeof socialLinksSchema>

// =====================================================
// INPUT TYPES
// =====================================================

export interface CrawlerExtractedContacts {
  emails: string[]
  phones: string[]
  socialLinks: Record<string, string>
}

export interface CrawlerServiceTypeSignal {
  slug: string
  confidence: number
  matchedKeywords: string[]
  sourceUrls: string[]
}

export interface CollectedImage {
  url: string
  alt: string
  sourceUrl: string
}

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

export interface ExistingContractorData {
  email: string | null
  phone: string | null
  description: string | null
}

export interface ProfileEnrichmentInput {
  companyName: string
  websiteUrl: string
  websiteContent: string
  crawlerExtractedContacts: CrawlerExtractedContacts
  crawlerDetectedServices: CrawlerServiceTypeSignal[]
  collectedImages: CollectedImage[]
  availableServiceTypes: ServiceType[]
  locationContext: LocationContext
  existingData?: ExistingContractorData
}

export interface ProfileEnrichmentOutput {
  success: boolean
  result: ProfileEnrichmentResult | null
  error?: string
  model: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  estimatedCostUsd: number
  usedFallback: boolean
}

// =====================================================
// CONSTANTS
// =====================================================

const MODEL = 'claude-haiku-4-5-20251001'
const MAX_CONTENT_CHARS = 35000  // Cap website content to manage tokens
const MAX_IMAGE_CANDIDATES = 30  // Cap image candidates for LLM
const MAX_TOKENS = 4096

// Patterns to filter out non-useful images (logos, icons, etc.)
const IMAGE_FILTER_PATTERNS = [
  /logo/i,
  /icon/i,
  /favicon/i,
  /arrow/i,
  /button/i,
  /sprite/i,
  /spacer/i,
  /pixel/i,
  /tracking/i,
  /\.svg$/i,
  /1x1/i,
  /placeholder/i,
]

// =====================================================
// SERVICE
// =====================================================

export class ProfileEnrichmentService {
  private anthropicProvider: AnthropicProvider
  private logService: SystemLogService

  constructor(
    anthropicApiKey: string,
    _openaiApiKey: string,
    supabase: SupabaseClient<Database>,
    heliconeApiKey?: string
  ) {
    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY is required for ProfileEnrichmentService')
    }
    this.anthropicProvider = new AnthropicProvider(anthropicApiKey, heliconeApiKey)
    this.logService = new SystemLogService(supabase)
  }

  async enrich(input: ProfileEnrichmentInput): Promise<ProfileEnrichmentOutput> {
    const startTime = Date.now()

    try {
      const promptPayload = this.buildPromptPayload(input)
      const systemPrompt = this.buildSystemPrompt(input)

      consola.info(`ProfileEnrichmentService: Enriching ${input.companyName} with Claude Haiku`, {
        contentChars: promptPayload.contentExcerpt.length,
        imageCandidates: promptPayload.imageCandidates.length,
      })

      const response = await this.anthropicProvider.generateJSONWithToolUse({
        prompt: this.buildUserPrompt(input, promptPayload),
        systemPrompt,
        model: MODEL,
        schema: profileEnrichmentResultSchema,
        toolName: 'extract_contractor_profile',
        toolDescription: 'Extract and structure contractor business profile data from website content',
        temperature: 0.2,
        maxTokens: MAX_TOKENS,
      })

      const sanitizedResult = this.sanitizeResult(response.data, input)

      const durationMs = Date.now() - startTime
      consola.success(`ProfileEnrichmentService: Completed ${input.companyName} in ${durationMs}ms`, {
        serviceCount: sanitizedResult.service_slugs.length,
        serviceAreas: sanitizedResult.service_areas.length,
        cost: response.estimatedCostUsd.toFixed(4),
      })

      return {
        success: true,
        result: sanitizedResult,
        model: MODEL,
        promptTokens: response.usage.promptTokens,
        completionTokens: response.usage.completionTokens,
        totalTokens: response.usage.totalTokens,
        estimatedCostUsd: response.estimatedCostUsd,
        usedFallback: false,
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'

      consola.error(`ProfileEnrichmentService: Failed for ${input.companyName}`, {
        error: errorMsg,
        model: MODEL,
      })

      await this.logService.log(
        'activity',
        'enrichment',
        'enrichment_failed',
        `Claude Haiku enrichment failed for ${input.companyName}: ${errorMsg}`,
        {
          entityType: 'contractor',
          actorType: 'system',
          metadata: {
            companyName: input.companyName,
            websiteUrl: input.websiteUrl,
            model: MODEL,
            error: errorMsg,
          },
        },
        'error'
      ).catch(() => {})

      return {
        success: false,
        result: null,
        error: errorMsg,
        model: MODEL,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
        usedFallback: false,
      }
    }
  }

  /**
   * Build bounded prompt payload with capped content and filtered images
   */
  private buildPromptPayload(input: ProfileEnrichmentInput): {
    contentExcerpt: string
    imageCandidates: CollectedImage[]
  } {
    // Truncate content, prioritizing beginning (usually has contact/about info)
    const contentExcerpt = input.websiteContent.substring(0, MAX_CONTENT_CHARS)

    // Filter and cap image candidates
    const filteredImages = input.collectedImages.filter((img) => {
      // Skip if URL matches filter patterns
      const urlLower = img.url.toLowerCase()
      const altLower = (img.alt || '').toLowerCase()

      for (const pattern of IMAGE_FILTER_PATTERNS) {
        if (pattern.test(urlLower) || pattern.test(altLower)) {
          return false
        }
      }

      // Skip very short URLs (likely placeholders)
      if (img.url.length < 20) {
        return false
      }

      return true
    })

    // Take top N images (preferring those with meaningful alt text)
    const sortedImages = filteredImages.sort((a, b) => {
      const aHasAlt = a.alt && a.alt.length > 5 ? 1 : 0
      const bHasAlt = b.alt && b.alt.length > 5 ? 1 : 0
      return bHasAlt - aHasAlt
    })

    const imageCandidates = sortedImages.slice(0, MAX_IMAGE_CANDIDATES)

    return { contentExcerpt, imageCandidates }
  }

  /**
   * Build system prompt for profile enrichment
   */
  private buildSystemPrompt(input: ProfileEnrichmentInput): string {
    // Build service types reference
    const serviceTypesList = input.availableServiceTypes
      .map((st) => `- ${st.slug}: ${st.name}`)
      .join('\n')

    return `You are an expert at extracting and enriching business profile information from contractor websites.

Your task is to analyze the provided website content and crawler-extracted data to create a comprehensive, accurate profile for a landscaper business.

## Available Service Types (use ONLY these slugs)
${serviceTypesList}

## Location Context
${this.formatLocationContext(input.locationContext)}

## Contact Precedence Rules
When extracting contact information, prefer data that is clearly present on the website.
The crawler has already extracted some contacts - verify these against the content.
If multiple emails/phones are found, select the PRIMARY business contact (not location-specific or department-specific).

## Extraction Guidelines

### Description (CRITICAL - max 160 characters)
- Write a short, SEO-friendly description summarizing what the contractor does and where
- Maximum 160 characters including spaces
- Use 7th grade reading level (simple, clear language)
- NO emdashes (—), NO emojis, NO quotation marks
- NO generic marketing phrases like "passionate about", "dedicated to excellence", "trusted partner"
- Focus on: service type + specialty + location + unique value
- Good: "landscape driveway and patio installation in Augusta, GA. Residential and commercial stamped and decorative finishes."
- Bad: "We're passionate about delivering exceptional landscape solutions to our valued customers"

### Service Types
- Only return slugs from the provided list above
- Start with crawler-detected services (provided below) as hints
- Verify each service is actually offered based on content
- Add services the crawler may have missed
- Remove false positives

### Service Areas
- Extract cities, counties, regions, or metro areas the business serves
- Look for "Areas We Serve", "Service Area", "Locations" sections
- Include surrounding areas if mentioned
- Be specific: "Atlanta, GA" not just "Georgia"

### Established Year
- Look for "Est.", "Since", "Founded", "Serving since", anniversary mentions
- Only include if clearly stated, not inferred
- Return null if not found

### Certifications
- Professional licenses, certifications, insurance, bonds
- Examples: "Licensed & Insured", "BBB Accredited", "ACI Certified"
- Include state contractor license numbers if mentioned

### Specialties
- What makes this business unique or different
- Examples: "Family-owned", "24-hour emergency service", "Free estimates", "Lifetime warranty"
- Focus on landscape value propositions, not generic claims

### Selected Images (CRITICAL - max 10)
From the provided image candidates, select up to 10 images worth downloading.
Rank them 1-10 (1 = best/primary hero image).

Selection criteria:
- PREFER: Completed project photos, team/staff photos, equipment photos, office/facility photos
- AVOID: Logos, icons, stock photos, decorative graphics, tiny images, tracking pixels
- Use alt text and URL patterns to infer image content
- If fewer than 10 quality images exist, return fewer
- If NO suitable images exist, return empty array []

The #1 ranked image becomes the profile hero image.
Return the \`selected_images\` array with {url, rank, reason} objects.

### Business Hours
- Use 12-hour format: "8:00 AM", "5:00 PM"
- If "by appointment only" or similar, return null for that day

### Social Links
- Only include URLs that are clearly the business's official accounts
- Verify the URL looks legitimate (not generic social media homepage)`
  }

  /**
   * Build user prompt with all data
   */
  private buildUserPrompt(
    input: ProfileEnrichmentInput,
    payload: { contentExcerpt: string; imageCandidates: CollectedImage[] }
  ): string {
    const crawlerContactsSection = this.formatCrawlerContacts(input.crawlerExtractedContacts)
    const crawlerServicesSection = this.formatCrawlerServices(input.crawlerDetectedServices)
    const imageCandidatesSection = this.formatImageCandidates(payload.imageCandidates)

    return `Extract and enrich the business profile for "${input.companyName}" (${input.websiteUrl}).

## Crawler Pre-Extracted Data

### Contacts Found by Crawler
${crawlerContactsSection}

### Service Types Detected by Crawler (verify against content)
${crawlerServicesSection}

### Image Candidates (select up to 10 for selected_images array)
${imageCandidatesSection}

## Website Content
${payload.contentExcerpt}

---

Now extract the complete profile. Remember:
- description must be ≤160 characters
- service_slugs must only use slugs from the provided list
- selected_images must be from the image candidates above, ranked 1-10 (1=best), or empty array []
- Be conservative - only include information clearly present in the content`
  }

  /**
   * Sanitize and validate the LLM result
   */
  private sanitizeResult(
    result: ProfileEnrichmentResult,
    input: ProfileEnrichmentInput
  ): ProfileEnrichmentResult {
    // Validate service_slugs against available types
    const validSlugs = new Set(input.availableServiceTypes.map((st) => st.slug))
    const sanitizedServiceSlugs = result.service_slugs.filter((slug) => validSlugs.has(slug))

    // If no valid services, default to landscape-contractor
    if (sanitizedServiceSlugs.length === 0 && validSlugs.has('landscape-contractor')) {
      sanitizedServiceSlugs.push('landscape-contractor')
    }

     // Build Set from input.collectedImages (raw crawler list)
     const validImageUrls = new Set(input.collectedImages.map((img) => img.url))

     // Step 1: Filter to valid URLs only
     const validImages = (result.selected_images || [])
       .filter(img => validImageUrls.has(img.url))

     // Step 2: Dedupe by URL (preserve first occurrence)
     const seen = new Set<string>()
     const dedupedImages = validImages.filter(img => {
       if (seen.has(img.url)) return false
       seen.add(img.url)
       return true
     })

     // Step 3: Sort by rank (stable sort)
     const sortedImages = dedupedImages.sort((a, b) => a.rank - b.rank)

     // Step 4: Truncate to max 10
     const sanitizedImages = sortedImages.slice(0, 10)

    // Apply contact precedence: existing DB > crawler > LLM
    let finalEmail = result.email
    let finalPhone = result.phone

    if (input.existingData?.email) {
      finalEmail = input.existingData.email
    } else if (!finalEmail && input.crawlerExtractedContacts.emails.length > 0) {
      finalEmail = input.crawlerExtractedContacts.emails[0]
    }

    if (input.existingData?.phone) {
      finalPhone = input.existingData.phone
    } else if (!finalPhone && input.crawlerExtractedContacts.phones.length > 0) {
      finalPhone = input.crawlerExtractedContacts.phones[0]
    }

    // Truncate description if over limit
    let sanitizedDescription = result.description
    if (sanitizedDescription && sanitizedDescription.length > 160) {
      sanitizedDescription = sanitizedDescription.substring(0, 157) + '...'
    }

     return {
       ...result,
       description: sanitizedDescription,
       email: finalEmail,
       phone: finalPhone,
       service_slugs: sanitizedServiceSlugs,
       selected_images: sanitizedImages,
     }
  }

  // =====================================================
  // FORMATTING HELPERS
  // =====================================================

  private formatLocationContext(ctx: LocationContext): string {
    const parts: string[] = []
    if (ctx.streetAddress) parts.push(ctx.streetAddress)
    if (ctx.city) parts.push(ctx.city)
    if (ctx.state) parts.push(ctx.state)
    if (ctx.postalCode) parts.push(ctx.postalCode)

    if (parts.length === 0) {
      return 'No location context available'
    }

    return `Target Location: ${parts.join(', ')}
Focus your analysis on services and information relevant to this location.`
  }

  private formatCrawlerContacts(contacts: CrawlerExtractedContacts): string {
    const lines: string[] = []

    if (contacts.emails.length > 0) {
      lines.push(`Emails: ${contacts.emails.slice(0, 5).join(', ')}`)
    }
    if (contacts.phones.length > 0) {
      lines.push(`Phones: ${contacts.phones.slice(0, 5).join(', ')}`)
    }
    if (Object.keys(contacts.socialLinks).length > 0) {
      const socials = Object.entries(contacts.socialLinks)
        .map(([platform, url]) => `${platform}: ${url}`)
        .join(', ')
      lines.push(`Social: ${socials}`)
    }

    return lines.length > 0 ? lines.join('\n') : 'None extracted'
  }

  private formatCrawlerServices(services: CrawlerServiceTypeSignal[]): string {
    if (services.length === 0) {
      return 'None detected - analyze content to identify services'
    }

    return services
      .filter((s) => s.confidence >= 0.4)
      .slice(0, 15)
      .map((s) => `- ${s.slug} (${Math.round(s.confidence * 100)}% confidence, keywords: ${s.matchedKeywords.slice(0, 3).join(', ')})`)
      .join('\n')
  }

   private formatImageCandidates(images: CollectedImage[]): string {
     if (images.length === 0) {
       return 'No suitable images found - return empty array [] for selected_images'
     }

     return images
       .map((img, i) => `${i + 1}. URL: ${img.url}\n   Alt: ${img.alt || '(none)'}\n   Source: ${img.sourceUrl}`)
       .join('\n')
   }
}
