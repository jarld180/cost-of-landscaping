#!/usr/bin/env npx tsx
/**
 * Usage:
 *   npx tsx scripts/backfill-stuck-enrichments.ts              # Dry run, 10 contractors
 *   npx tsx scripts/backfill-stuck-enrichments.ts --execute    # Execute, 10 contractors  
 *   npx tsx scripts/backfill-stuck-enrichments.ts --execute --limit 50
 *   npx tsx scripts/backfill-stuck-enrichments.ts --list       # Just list stuck contractors
 *
 * Required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { consola } from 'consola'
import 'dotenv/config'

import type { Database } from '../app/types/supabase'
import {
  ProfileEnrichmentService,
  type ServiceType,
  type LocationContext,
  type CrawlerServiceTypeSignal,
  type CrawlerExtractedContacts,
} from '../server/services/ProfileEnrichmentService'
import { ImageEnrichmentService } from '../server/services/ImageEnrichmentService'
import type { CollectedImage } from '../server/schemas/job.schemas'

const SUPABASE_URL = process.env.NUXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.NUXT_SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
const ANTHROPIC_API_KEY = process.env.NUXT_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY
const OPENAI_API_KEY = process.env.NUXT_OPENAI_API_KEY || process.env.OPENAI_API_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  consola.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

if (!ANTHROPIC_API_KEY || !OPENAI_API_KEY) {
  consola.error('Missing ANTHROPIC_API_KEY or OPENAI_API_KEY')
  process.exit(1)
}

const args = process.argv.slice(2)
const execute = args.includes('--execute')
const listOnly = args.includes('--list')
const limitIdx = args.indexOf('--limit')
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : 10

if (isNaN(limit) || limit < 1 || limit > 100) {
  consola.error('Invalid --limit value. Must be 1-100.')
  process.exit(1)
}

interface BackfillResult {
  contractorId: string
  companyName: string
  status: 'success' | 'failed' | 'skipped'
  error?: string
}

async function main() {
  const supabase = createClient<Database>(SUPABASE_URL!, SUPABASE_SERVICE_KEY!)

  consola.info(`Connected to: ${SUPABASE_URL}`)
  consola.info('Fetching stuck contractors...')

  const { data: stuckContractors, error: queryError } = await supabase
    .from('contractors')
    .select('id, company_name, metadata')
    .or('metadata->enrichment->>status.eq.crawl_pending,metadata->enrichment->>status.eq.enrichment_failed')
    .limit(limit)

  if (queryError) {
    consola.error('Query failed:', queryError.message)
    process.exit(1)
  }

  if (!stuckContractors?.length) {
    consola.success('No stuck contractors found!')
    return
  }

  consola.info(`Found ${stuckContractors.length} stuck contractors`)

  if (listOnly) {
    console.log('\nStuck contractors:')
    console.log('─'.repeat(80))
    for (const c of stuckContractors) {
      const meta = c.metadata as Record<string, unknown> | null
      const enrichment = (meta?.enrichment as Record<string, unknown>) || {}
      const metadataStatus = enrichment.status || 'unknown'
      const error = enrichment.error || ''

      const { data: crawlJob } = await supabase
        .from('background_jobs')
        .select('status, result')
        .eq('job_type', 'stealthy_crawl')
        .contains('payload', { contractorId: c.id })
        .order('completed_at', { ascending: false })
        .limit(1)
        .single()

      const jobResult = crawlJob?.result as Record<string, unknown> | null
      const crawlResult = jobResult?.crawlResult as { content?: string } | null
      const jobError = jobResult?._error as string | undefined
      const hasContent = !!crawlResult?.content
      const contentLen = crawlResult?.content?.length || 0

      console.log(`  ${c.company_name}`)
      console.log(`    ID: ${c.id}`)
      console.log(`    Metadata status: ${metadataStatus} (stale)`)
      console.log(`    Crawl job: ${crawlJob?.status || 'NOT FOUND'}`)
      console.log(`    Has content: ${hasContent} (${contentLen} chars)`)
      if (jobError) console.log(`    Job error: ${jobError}`)
      if (error) console.log(`    Metadata error: ${error}`)
      console.log()
    }
    return
  }

  if (!execute) {
    consola.warn('DRY RUN - No changes will be made. Use --execute to run for real.')
    console.log('\nWould process:')
    for (const c of stuckContractors) {
      console.log(`  - ${c.company_name} (${c.id})`)
    }
    console.log(`\nRun with --execute to process these ${stuckContractors.length} contractors.`)
    return
  }

  consola.start('Starting backfill...')

  const { data: serviceTypes } = await supabase
    .from('service_types')
    .select('id, name, slug')
    .order('name')

  if (!serviceTypes?.length) {
    consola.error('No service types found')
    process.exit(1)
  }

  const enrichmentService = new ProfileEnrichmentService(
    ANTHROPIC_API_KEY!,
    OPENAI_API_KEY!,
    supabase as SupabaseClient<Database>
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
        consola.warn(`Skipped ${stuckContractor.company_name}: No completed crawl job`)
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
        consola.warn(`Skipped ${stuckContractor.company_name}: Crawl has no content`)
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

      const payload = lastCrawlJob.payload as { websiteUrl?: string } | null
      const websiteUrl = payload?.websiteUrl || ''

      consola.info(`Processing ${contractor.company_name}...`)

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
        consola.error(`Failed ${contractor.company_name}: ${enrichmentResult.error}`)
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
              source: 'backfill_script',
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
          const imageService = new ImageEnrichmentService(supabase as SupabaseClient<Database>)
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

  console.log('\n' + '═'.repeat(60))
  console.log('BACKFILL COMPLETE')
  console.log('═'.repeat(60))
  console.log(`  Total processed: ${results.length}`)
  console.log(`  ✓ Succeeded: ${succeeded}`)
  console.log(`  ✗ Failed: ${failed}`)
  console.log(`  ○ Skipped: ${skipped}`)
  console.log('═'.repeat(60))

  if (failed > 0) {
    console.log('\nFailed contractors:')
    for (const r of results.filter(r => r.status === 'failed')) {
      console.log(`  - ${r.companyName}: ${r.error}`)
    }
  }

  if (skipped > 0) {
    console.log('\nSkipped contractors:')
    for (const r of results.filter(r => r.status === 'skipped')) {
      console.log(`  - ${r.companyName}: ${r.error}`)
    }
  }
}

main().catch(err => {
  consola.error('Fatal error:', err)
  process.exit(1)
})
