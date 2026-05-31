/**
 * Cron endpoint: Process completed stealthy_crawl jobs
 *
 * Called by pg_cron every minute via dispatch_stealthy_crawl_processor()
 *
 * Flow:
 * 1. Query unprocessed jobs via RPC
 * 2. For each job:
 *    - Load contractor with city relation
 *    - Run profile enrichment with Claude Opus 4.5 (full crawler data)
 *    - Update contractor metadata with enriched fields
 *    - Assign service_types (or default 'landscape-contractor')
 *    - Download and store selected images inline (up to 10, ranked by LLM)
 *    - Mark job as processed
 */

import { timingSafeEqual } from 'node:crypto'
import { serverSupabaseServiceRole } from '#supabase/server'
import {
  ProfileEnrichmentService,
  type ProfileEnrichmentResult,
  type ServiceType,
  type LocationContext,
  type CrawlerServiceTypeSignal,
  type CrawlerExtractedContacts,
} from '../../services/ProfileEnrichmentService'
import { ImageEnrichmentService } from '../../services/ImageEnrichmentService'
import consola from 'consola'
import type { StealthyCrawlPayload, StealthyCrawlResult, CollectedImage } from '../../schemas/job.schemas'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/app/types/supabase'

// Cache service types for reuse across requests
let serviceTypesCache: ServiceType[] | null = null

/**
 * Constant-time comparison of two strings
 * Prevents timing attacks by ensuring comparison takes the same time
 * regardless of where the strings differ
 */
function secureCompare(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a, 'utf8')
  const bBuffer = Buffer.from(b, 'utf8')

  if (aBuffer.length !== bBuffer.length) {
    // Create a buffer of same length to compare against
    // This ensures timing doesn't leak length information
    const paddedBuffer = Buffer.alloc(aBuffer.length)
    timingSafeEqual(aBuffer, paddedBuffer)
    return false
  }

  return timingSafeEqual(aBuffer, bBuffer)
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  // 1. Verify secret (constant-time comparison)
  const secret = getHeader(event, 'X-Job-Runner-Secret')
  const expectedSecret = config.jobRunnerSecret

  if (!expectedSecret) {
    consola.warn('jobRunnerSecret not configured')
    return { processed: 0, message: 'Not configured' }
  }

  // Constant-time comparison to prevent timing attacks
  if (!secret || !secureCompare(secret, expectedSecret)) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  // 2. Get service-role client (bypasses RLS)
  const supabase = serverSupabaseServiceRole(event)

  // 3. Initialize enrichment service (needs supabase for logging)
  const enrichmentService = new ProfileEnrichmentService(
    config.anthropicApiKey,
    config.openaiApiKey,
    supabase as SupabaseClient<Database>,
    config.heliconeApiKey
  )

  // 4. Load service types (cache for reuse)
  if (!serviceTypesCache) {
    const { data } = await supabase
      .from('service_types')
      .select('id, name, slug')
      .order('name')

    serviceTypesCache = (data || []) as ServiceType[]
  }

  // 5. Query unprocessed jobs via RPC
  const { data: jobs, error: rpcError } = await supabase.rpc('get_unprocessed_stealthy_crawls', {
    limit_count: 50,
  })

  if (rpcError) {
    consola.error('Failed to query unprocessed jobs:', rpcError)
    throw createError({
      statusCode: 500,
      message: 'Failed to query jobs',
    })
  }

  if (!jobs || jobs.length === 0) {
    return { processed: 0, message: 'No jobs to process' }
  }

  consola.info(`Processing ${jobs.length} completed stealthy_crawl jobs`)

  // 6. Process each job
  let successCount = 0
  let errorCount = 0

  for (const job of jobs) {
    try {
      await processJob(
        supabase as SupabaseClient<Database>,
        job as { id: string; payload: StealthyCrawlPayload; result: StealthyCrawlResult },
        serviceTypesCache,
        enrichmentService
      )
      successCount++
    } catch (error) {
      consola.error(`Failed to process job ${job.id}:`, error)
      errorCount++
      // Continue processing other jobs
    }
  }

  return {
    processed: jobs.length,
    successful: successCount,
    failed: errorCount,
  }
})

/**
 * Update contractor with downloaded image storage paths.
 * 
 * METADATA MERGE SEMANTICS (from Momus review):
 * - images[]: REPLACE (overwrite with newly downloaded images)
 * - primary_image: REPLACE with first successful download (null if all fail)
 * - pending_images: CLEAR to [] unconditionally (field deprecated for inline flow)
 * - primary_image_candidate_url: DELETE (legacy field, must use JS delete operator)
 * 
 * ERROR HANDLING: Throws on DB errors so job can be retried.
 */
async function updateContractorImages(
  supabase: SupabaseClient<Database>,
  contractorId: string,
  storagePaths: string[],
  primaryImage: string | null
) {
  // Fetch existing metadata - THROW on error
  const { data: contractor, error: selectError } = await supabase
    .from('contractors')
    .select('metadata')
    .eq('id', contractorId)
    .single()
  
  if (selectError) {
    throw new Error(`Failed to fetch contractor ${contractorId}: ${selectError.message}`)
  }
  
  const existingMeta = (contractor?.metadata as Record<string, unknown>) || {}
  
  // Build updated metadata - use delete operator to actually remove legacy field
  const updatedMeta = { ...existingMeta }
  delete updatedMeta.primary_image_candidate_url  // Actually removes the key from JSONB
  
  // Set new image fields (REPLACE semantics, not append)
  updatedMeta.images = storagePaths
  updatedMeta.primary_image = primaryImage
  updatedMeta.pending_images = []  // Clear deprecated field
  
  // Update contractor - THROW on error
  const { error: updateError } = await supabase
    .from('contractors')
    .update({
      images_processed: true,
      metadata: updatedMeta,
    })
    .eq('id', contractorId)
  
  if (updateError) {
    throw new Error(`Failed to update contractor ${contractorId}: ${updateError.message}`)
  }
}

async function processJob(
  supabase: SupabaseClient<Database>,
  job: { id: string; payload: StealthyCrawlPayload; result: StealthyCrawlResult },
  serviceTypes: ServiceType[],
  enrichmentService: ProfileEnrichmentService
) {
  const { id: jobId, payload, result } = job
  const { contractorId, websiteUrl, usingSiblingWebsite } = payload
  const { crawlResult } = result

  if (crawlResult.blockedByBotProtection) {
    await markContractorBlocked(supabase, contractorId, websiteUrl)
    await markJobProcessed(supabase, jobId, 'stealthy_crawler_blocked', null)
    return
  }

  if (!crawlResult.success || !crawlResult.content) {
    await markContractorEnrichmentFailed(supabase, contractorId, websiteUrl, crawlResult.error || 'Crawl failed - no content retrieved')
    await markJobProcessed(supabase, jobId, crawlResult.error || 'crawl_failed', null)
    return
  }

  const { data: contractor, error: contractorError } = await supabase
    .from('contractors')
    .select('id, company_name, street_address, postal_code, email, phone, description, metadata, city:cities(name, state_code)')
    .eq('id', contractorId)
    .single()

  if (contractorError || !contractor) {
    consola.error(`Contractor ${contractorId} not found`)
    await markJobProcessed(supabase, jobId, 'contractor_not_found', null)
    return
  }

  const city = contractor.city as { name: string; state_code: string } | null
  const locationContext: LocationContext = {
    streetAddress: contractor.street_address || null,
    city: city?.name || null,
    state: city?.state_code || null,
    postalCode: contractor.postal_code || null,
  }

  const crawlerSignals: CrawlerServiceTypeSignal[] = (crawlResult.detectedServiceTypes || []) as CrawlerServiceTypeSignal[]
  const crawlerContacts: CrawlerExtractedContacts = crawlResult.extractedContacts || { emails: [], phones: [], socialLinks: {} }
  const collectedImages = (crawlResult.collectedImages || []) as CollectedImage[]

  try {
    const enrichmentResult = await enrichmentService.enrich({
      companyName: contractor.company_name,
      websiteUrl,
      websiteContent: crawlResult.content,
      crawlerExtractedContacts: crawlerContacts,
      crawlerDetectedServices: crawlerSignals,
      collectedImages,
      availableServiceTypes: serviceTypes,
      locationContext,
      existingData: {
        email: contractor.email,
        phone: contractor.phone,
        description: contractor.description,
      },
    })

    if (!enrichmentResult.success || !enrichmentResult.result) {
      consola.error(`Profile enrichment failed for job ${jobId}: ${enrichmentResult.error}`)
      await markContractorEnrichmentFailed(supabase, contractorId, websiteUrl, enrichmentResult.error || 'Unknown enrichment error')
      await markJobProcessed(supabase, jobId, 'enrichment_failed', enrichmentResult)
      return
    }

    await updateContractorWithEnrichmentResults(
      supabase,
      contractorId,
      contractor.metadata as Record<string, unknown> | null,
      enrichmentResult.result,
      websiteUrl,
      usingSiblingWebsite,
      enrichmentResult
    )

    await assignServiceTypes(supabase, contractorId, enrichmentResult.result.service_slugs, serviceTypes, crawlerSignals)

    if (enrichmentResult.result.selected_images?.length > 0) {
      const imageService = new ImageEnrichmentService(supabase)
      const imageUrls = enrichmentResult.result.selected_images
        .sort((a, b) => a.rank - b.rank)
        .map(img => img.url)
      
      const { storagePaths, primaryImage } = await imageService.downloadImages(
        contractorId,
        imageUrls
      )
      
      await updateContractorImages(supabase, contractorId, storagePaths, primaryImage)
    } else {
      // No images selected - still enforce metadata cleanup (Decision #2 & #3)
      // Pass empty arrays to trigger cleanup of legacy fields
      await updateContractorImages(supabase, contractorId, [], null)
    }

    await markJobProcessed(supabase, jobId, null, enrichmentResult)

    consola.info(`Successfully enriched ${contractor.company_name}`, {
      jobId,
      model: enrichmentResult.model,
      usedFallback: enrichmentResult.usedFallback,
      cost: enrichmentResult.estimatedCostUsd.toFixed(4),
      imagesQueued: collectedImages.length,
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    consola.error(`Profile enrichment failed for job ${jobId}:`, error)
    await markContractorEnrichmentFailed(supabase, contractorId, websiteUrl, errorMsg)
    await markJobProcessed(supabase, jobId, 'enrichment_failed', null)
  }
}

async function markContractorBlocked(
  supabase: SupabaseClient<Database>,
  contractorId: string,
  websiteUrl: string
) {
  const { data: contractor } = await supabase
    .from('contractors')
    .select('metadata')
    .eq('id', contractorId)
    .single()

  const existingMeta = (contractor?.metadata as Record<string, unknown>) || {}

  await supabase
    .from('contractors')
    .update({
      metadata: {
        ...existingMeta,
        enrichment: {
          status: 'stealthy_blocked',
          blocked_at: new Date().toISOString(),
          website_url: websiteUrl,
          reason: 'Bot protection still active after stealth crawl',
        },
      },
    })
    .eq('id', contractorId)
}

async function markContractorEnrichmentFailed(
  supabase: SupabaseClient<Database>,
  contractorId: string,
  websiteUrl: string,
  error: string
) {
  const { data: contractor } = await supabase
    .from('contractors')
    .select('metadata')
    .eq('id', contractorId)
    .single()

  const existingMeta = (contractor?.metadata as Record<string, unknown>) || {}
  const existingEnrichment = (existingMeta.enrichment as Record<string, unknown>) || {}
  const previousAttempts = (existingEnrichment.attempts as number) || 0

  await supabase
    .from('contractors')
    .update({
      metadata: {
        ...existingMeta,
        enrichment: {
          ...existingEnrichment,
          status: 'enrichment_failed',
          failed_at: new Date().toISOString(),
          website_url: websiteUrl,
          error: error,
          attempts: previousAttempts + 1,
        },
      },
    })
    .eq('id', contractorId)
}

interface EnrichmentMetrics {
  model: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  estimatedCostUsd: number
  usedFallback: boolean
}

async function updateContractorWithEnrichmentResults(
  supabase: SupabaseClient<Database>,
  contractorId: string,
  existingMetadata: Record<string, unknown> | null,
  result: ProfileEnrichmentResult,
  websiteUrl: string,
  usingSiblingWebsite: boolean | undefined,
  metrics: EnrichmentMetrics
) {
  const existingMeta = existingMetadata || {}
  const existingEnrichment = (existingMeta.enrichment as Record<string, unknown>) || {}

  await supabase
    .from('contractors')
    .update({
      email: result.email || null,
      phone: result.phone || null,
      description: result.description || null,
      metadata: {
        ...existingMeta,
        enrichment: {
          ...existingEnrichment,
          status: metrics.usedFallback ? 'completed_partial' : 'completed',
          enriched_at: new Date().toISOString(),
          business_hours: result.business_hours || null,
          social_links: result.social_links || null,
          source: usingSiblingWebsite ? 'sibling_website' : 'stealthy_crawl',
          model: metrics.model,
          prompt_tokens: metrics.promptTokens,
          completion_tokens: metrics.completionTokens,
          total_tokens: metrics.totalTokens,
          estimated_cost_usd: metrics.estimatedCostUsd,
          used_fallback: metrics.usedFallback,
        },
        service_areas: result.service_areas.length > 0 ? result.service_areas : null,
        established_year: result.established_year,
        certifications: result.certifications.length > 0 ? result.certifications : null,
        specialties: result.specialties.length > 0 ? result.specialties : null,
      },
    })
    .eq('id', contractorId)
}

async function assignServiceTypes(
  supabase: SupabaseClient<Database>,
  contractorId: string,
  extractedServiceSlugs: string[],
  availableServiceTypes: ServiceType[],
  crawlerSignals?: CrawlerServiceTypeSignal[]
) {
  const serviceTypesToAssign =
    extractedServiceSlugs.length > 0 ? extractedServiceSlugs : ['landscape-contractor']

  const crawlerConfidenceMap = new Map(
    (crawlerSignals || []).map((s) => [s.slug, s.confidence])
  )

  const records = serviceTypesToAssign
    .map((slug) => {
      const serviceType = availableServiceTypes.find((st) => st.slug === slug)
      if (!serviceType) return null

      const crawlerConfidence = crawlerConfidenceMap.get(slug)
      const confidence = crawlerConfidence !== undefined
        ? Math.min(crawlerConfidence + 0.2, 1.0)  // Boost if both crawler and AI agree
        : 0.7  // Default AI-only confidence

      return {
        contractor_id: contractorId,
        service_type_id: serviceType.id,
        confidence_score: confidence,
        source: 'ai_enrichment',
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)

  if (records.length === 0) {
    consola.warn(`No valid service types found for contractor ${contractorId}`)
    return
  }

  await supabase
    .from('contractor_service_types')
    .upsert(records, { onConflict: 'contractor_id,service_type_id' })
}

async function markJobProcessed(
  supabase: SupabaseClient<Database>,
  jobId: string,
  errorCode: string | null,
  enrichmentMetrics: EnrichmentMetrics | null
) {
  const { data: job } = await supabase
    .from('background_jobs')
    .select('result')
    .eq('id', jobId)
    .single()

  const existingResult = (job?.result as Record<string, unknown>) || {}

  await supabase
    .from('background_jobs')
    .update({
      result: {
        ...existingResult,
        _processed: true,
        ...(errorCode ? { _error: errorCode } : {}),
        ...(enrichmentMetrics
          ? {
              _enrichment: {
                model: enrichmentMetrics.model,
                prompt_tokens: enrichmentMetrics.promptTokens,
                completion_tokens: enrichmentMetrics.completionTokens,
                total_tokens: enrichmentMetrics.totalTokens,
                estimated_cost_usd: enrichmentMetrics.estimatedCostUsd,
                used_fallback: enrichmentMetrics.usedFallback,
              },
            }
          : {}),
      },
    })
    .eq('id', jobId)
}
