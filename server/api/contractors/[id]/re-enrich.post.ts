import { consola } from 'consola'
import { serverSupabaseServiceRole } from '#supabase/server'
import { requireAdmin } from '../../../utils/auth'
import {
  ProfileEnrichmentService,
  type ServiceType,
  type LocationContext,
  type CrawlerServiceTypeSignal,
  type CrawlerExtractedContacts,
} from '../../../services/ProfileEnrichmentService'
import { ImageEnrichmentService } from '../../../services/ImageEnrichmentService'
import type { CollectedImage } from '../../../schemas/job.schemas'
import type { Database } from '~/app/types/supabase'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const contractorId = getRouterParam(event, 'id')
  if (!contractorId) {
    throw createError({ statusCode: 400, message: 'Contractor ID required' })
  }

  const config = useRuntimeConfig()
  const supabase = serverSupabaseServiceRole(event)

  const { data: lastCrawlJob, error: jobError } = await supabase
    .from('background_jobs')
    .select('id, result, payload')
    .eq('job_type', 'stealthy_crawl')
    .eq('status', 'completed')
    .contains('payload', { contractorId })
    .order('completed_at', { ascending: false })
    .limit(1)
    .single()

  if (jobError || !lastCrawlJob) {
    throw createError({
      statusCode: 404,
      message: 'No completed stealthy_crawl job found for this contractor',
    })
  }

  const jobResult = lastCrawlJob.result as Record<string, unknown> | null
  const crawlResult = jobResult?.crawlResult as {
    success?: boolean
    content?: string
    collectedImages?: CollectedImage[]
    extractedContacts?: CrawlerExtractedContacts
    detectedServiceTypes?: CrawlerServiceTypeSignal[]
  } | null

  if (!crawlResult?.success || !crawlResult?.content) {
    throw createError({
      statusCode: 400,
      message: 'Crawl result has no content - cannot re-enrich. Contractor needs to be re-crawled.',
    })
  }

  const { data: contractor, error: contractorError } = await supabase
    .from('contractors')
    .select('id, company_name, street_address, postal_code, email, phone, description, metadata, city:cities(name, state_code)')
    .eq('id', contractorId)
    .single()

  if (contractorError || !contractor) {
    throw createError({ statusCode: 404, message: 'Contractor not found' })
  }

  const { data: serviceTypes } = await supabase
    .from('service_types')
    .select('id, name, slug')
    .order('name')

  if (!serviceTypes?.length) {
    throw createError({ statusCode: 500, message: 'No service types found in database' })
  }

  const city = contractor.city as { name: string; state_code: string } | null
  const locationContext: LocationContext = {
    streetAddress: contractor.street_address || null,
    city: city?.name || null,
    state: city?.state_code || null,
    postalCode: contractor.postal_code || null,
  }

  const payload = lastCrawlJob.payload as { websiteUrl?: string; usingSiblingWebsite?: boolean } | null
  const websiteUrl = payload?.websiteUrl || ''
  const usingSiblingWebsite = payload?.usingSiblingWebsite || false

  const enrichmentService = new ProfileEnrichmentService(
    config.anthropicApiKey,
    config.openaiApiKey,
    supabase as unknown as import('@supabase/supabase-js').SupabaseClient<Database>,
    config.heliconeApiKey
  )

  consola.info(`Re-enriching contractor ${contractor.company_name} (${contractorId})`)

  const enrichmentResult = await enrichmentService.enrich({
    companyName: contractor.company_name,
    websiteUrl,
    websiteContent: crawlResult.content,
    crawlerExtractedContacts: crawlResult.extractedContacts || { emails: [], phones: [], socialLinks: {} },
    crawlerDetectedServices: (crawlResult.detectedServiceTypes || []) as CrawlerServiceTypeSignal[],
    collectedImages: (crawlResult.collectedImages || []) as CollectedImage[],
    availableServiceTypes: serviceTypes as ServiceType[],
    locationContext,
    existingData: {
      email: contractor.email,
      phone: contractor.phone,
      description: contractor.description,
    },
  })

  if (!enrichmentResult.success || !enrichmentResult.result) {
    const existingMeta = (contractor.metadata as Record<string, unknown>) || {}
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
            error: enrichmentResult.error || 'Unknown error',
            attempts: previousAttempts + 1,
          },
        },
      })
      .eq('id', contractorId)

    throw createError({
      statusCode: 500,
      message: `Enrichment failed: ${enrichmentResult.error}`,
    })
  }

  const existingMeta = (contractor.metadata as Record<string, unknown>) || {}
  const existingEnrichment = (existingMeta.enrichment as Record<string, unknown>) || {}

  await supabase
    .from('contractors')
    .update({
      email: enrichmentResult.result.email || contractor.email,
      phone: enrichmentResult.result.phone || contractor.phone,
      description: enrichmentResult.result.description || contractor.description,
      metadata: {
        ...existingMeta,
        enrichment: {
          ...existingEnrichment,
          status: enrichmentResult.usedFallback ? 'completed_partial' : 'completed',
          enriched_at: new Date().toISOString(),
          business_hours: enrichmentResult.result.business_hours || null,
          social_links: enrichmentResult.result.social_links || null,
          website_url: websiteUrl,
          source: 're-enrich',
          model: enrichmentResult.model,
          total_tokens: enrichmentResult.totalTokens,
          prompt_tokens: enrichmentResult.promptTokens,
          completion_tokens: enrichmentResult.completionTokens,
          estimated_cost_usd: enrichmentResult.estimatedCostUsd,
          used_fallback: enrichmentResult.usedFallback,
        },
        specialties: enrichmentResult.result.specialties || [],
        service_areas: enrichmentResult.result.service_areas || [],
        certifications: enrichmentResult.result.certifications || [],
        established_year: enrichmentResult.result.established_year || null,
      },
    })
    .eq('id', contractorId)

  await supabase
    .from('contractor_service_types')
    .delete()
    .eq('contractor_id', contractorId)

  if (enrichmentResult.result.service_slugs.length > 0) {
    const serviceTypeMap = new Map(serviceTypes.map(st => [st.slug, st.id]))
    const inserts = enrichmentResult.result.service_slugs
      .filter(slug => serviceTypeMap.has(slug))
      .map(slug => ({
        contractor_id: contractorId,
        service_type_id: serviceTypeMap.get(slug)!,
        source: 'ai_enrichment' as const,
      }))

    if (inserts.length > 0) {
      await supabase.from('contractor_service_types').insert(inserts)
    }
  }

  if (enrichmentResult.result.selected_images?.length > 0) {
    const imageService = new ImageEnrichmentService(supabase as unknown as import('@supabase/supabase-js').SupabaseClient<Database>)
    const imageUrls = enrichmentResult.result.selected_images
      .sort((a, b) => a.rank - b.rank)
      .map(img => img.url)

    try {
      const { storagePaths, primaryImage } = await imageService.downloadImages(contractorId, imageUrls)

      const { data: currentContractor } = await supabase
        .from('contractors')
        .select('metadata')
        .eq('id', contractorId)
        .single()

      const currentMeta = (currentContractor?.metadata as Record<string, unknown>) || {}

      await supabase
        .from('contractors')
        .update({
          images_processed: true,
          metadata: {
            ...currentMeta,
            images: storagePaths,
            primary_image: primaryImage,
            pending_images: [],
          },
        })
        .eq('id', contractorId)
    } catch (imageError) {
      consola.warn(`Image download failed for ${contractorId}, deferring:`, imageError)
    }
  }

  consola.success(`Successfully re-enriched ${contractor.company_name}`, {
    model: enrichmentResult.model,
    cost: enrichmentResult.estimatedCostUsd.toFixed(4),
  })

  return {
    success: true,
    contractorId,
    companyName: contractor.company_name,
    enrichment: {
      model: enrichmentResult.model,
      tokensUsed: enrichmentResult.totalTokens,
      cost: enrichmentResult.estimatedCostUsd,
      servicesAssigned: enrichmentResult.result.service_slugs.length,
      imagesSelected: enrichmentResult.result.selected_images?.length || 0,
    },
  }
})
