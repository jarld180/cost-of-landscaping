import { consola } from 'consola'
import { serverSupabaseServiceRole } from '#supabase/server'
import { requireAdmin } from '../../utils/auth'
import {
  ProfileEnrichmentService,
  type ServiceType,
  type LocationContext,
  type CrawlerServiceTypeSignal,
  type CrawlerExtractedContacts,
} from '../../services/ProfileEnrichmentService'
import { ImageEnrichmentService } from '../../services/ImageEnrichmentService'
import type { CollectedImage } from '../../schemas/job.schemas'
import type { Database } from '~/app/types/supabase'

interface BackfillResult {
  contractorId: string
  companyName: string
  status: 'success' | 'failed' | 'skipped'
  error?: string
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const limit = Math.min(body?.limit || 10, 50)
  const dryRun = body?.dryRun ?? true

  const config = useRuntimeConfig()
  const supabase = serverSupabaseServiceRole(event)

  const { data: stuckContractors, error: queryError } = await supabase
    .from('contractors')
    .select('id, company_name')
    .or('metadata->enrichment->>status.eq.crawl_pending,metadata->enrichment->>status.eq.enrichment_failed')
    .limit(limit)

  if (queryError) {
    throw createError({ statusCode: 500, message: `Query failed: ${queryError.message}` })
  }

  if (!stuckContractors?.length) {
    return {
      success: true,
      message: 'No stuck contractors found',
      processed: 0,
      results: [],
    }
  }

  consola.info(`Found ${stuckContractors.length} stuck contractors to process${dryRun ? ' (DRY RUN)' : ''}`)

  if (dryRun) {
    return {
      success: true,
      dryRun: true,
      message: `Would process ${stuckContractors.length} contractors`,
      contractors: stuckContractors.map(c => ({ id: c.id, name: c.company_name })),
    }
  }

  const { data: serviceTypes } = await supabase
    .from('service_types')
    .select('id, name, slug')
    .order('name')

  if (!serviceTypes?.length) {
    throw createError({ statusCode: 500, message: 'No service types found' })
  }

  const enrichmentService = new ProfileEnrichmentService(
    config.anthropicApiKey,
    config.openaiApiKey,
    supabase as unknown as import('@supabase/supabase-js').SupabaseClient<Database>,
    config.heliconeApiKey
  )

  const results: BackfillResult[] = []

  for (const stuckContractor of stuckContractors) {
    const contractorId = stuckContractor.id

    try {
      const { data: lastCrawlJob } = await supabase
        .from('background_jobs')
        .select('id, result, payload')
        .eq('job_type', 'stealthy_crawl')
        .eq('status', 'completed')
        .contains('payload', { contractorId })
        .order('completed_at', { ascending: false })
        .limit(1)
        .single()

      if (!lastCrawlJob) {
        results.push({
          contractorId,
          companyName: stuckContractor.company_name,
          status: 'skipped',
          error: 'No completed crawl job found',
        })
        continue
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
        results.push({
          contractorId,
          companyName: stuckContractor.company_name,
          status: 'skipped',
          error: 'Crawl has no content',
        })
        continue
      }

      const { data: contractor } = await supabase
        .from('contractors')
        .select('id, company_name, street_address, postal_code, email, phone, description, metadata, city:cities(name, state_code)')
        .eq('id', contractorId)
        .single()

      if (!contractor) {
        results.push({
          contractorId,
          companyName: stuckContractor.company_name,
          status: 'skipped',
          error: 'Contractor not found',
        })
        continue
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

      consola.info(`Processing ${contractor.company_name} (${contractorId})`)

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

        results.push({
          contractorId,
          companyName: contractor.company_name,
          status: 'failed',
          error: enrichmentResult.error,
        })
        continue
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
              source: 'backfill',
              model: enrichmentResult.model,
              total_tokens: enrichmentResult.totalTokens,
              estimated_cost_usd: enrichmentResult.estimatedCostUsd,
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
        try {
          const imageService = new ImageEnrichmentService(supabase as unknown as import('@supabase/supabase-js').SupabaseClient<Database>)
          const imageUrls = enrichmentResult.result.selected_images
            .sort((a, b) => a.rank - b.rank)
            .map(img => img.url)

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
          consola.warn(`Image download failed for ${contractorId}, continuing:`, imageError)
        }
      }

      results.push({
        contractorId,
        companyName: contractor.company_name,
        status: 'success',
      })

      consola.success(`Enriched ${contractor.company_name}`)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      consola.error(`Failed to process ${stuckContractor.company_name}:`, error)
      results.push({
        contractorId,
        companyName: stuckContractor.company_name,
        status: 'failed',
        error: errorMsg,
      })
    }
  }

  const succeeded = results.filter(r => r.status === 'success').length
  const failed = results.filter(r => r.status === 'failed').length
  const skipped = results.filter(r => r.status === 'skipped').length

  return {
    success: true,
    processed: results.length,
    succeeded,
    failed,
    skipped,
    results,
  }
})
