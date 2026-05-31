/**
 * Contractor Enrichment Service
 *
 * Creates stealthy_crawl jobs for contractors with websites.
 * Python worker handles actual crawling; TypeScript processor handles AI extraction.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../app/types/supabase'
import { consola } from 'consola'
import type { StealthyCrawlPayload, ServiceTypeKeyword } from '../schemas/job.schemas'

// =====================================================
// TYPES
// =====================================================

export interface EnrichmentResult {
  contractorId: string
  companyName: string
  status: 'queued' | 'skipped' | 'failed'
  message: string
}

export interface EnrichmentSummary {
  processed: number
  successful: number
  skipped: number
  failed: number
  queued: number
}

export interface ContractorForEnrichment {
  id: string
  company_name: string
  website: string | null
  phone: string | null
  street_address: string | null
  postal_code: string | null
  metadata: Record<string, unknown> | null
  city?: {
    name: string
    state_code: string
  } | null
}

interface SiblingContractor {
  id: string
  company_name: string
  website: string
  matchType: 'phone' | 'name'
}

// =====================================================
// SERVICE
// =====================================================

export class ContractorEnrichmentService {
  private client: SupabaseClient<Database>
  private serviceTypeKeywordsCache: ServiceTypeKeyword[] | null = null

  constructor(client: SupabaseClient<Database>) {
    this.client = client
  }

  private async getServiceTypeKeywords(): Promise<ServiceTypeKeyword[]> {
    if (this.serviceTypeKeywordsCache) {
      return this.serviceTypeKeywordsCache
    }

    const { data } = await this.client
      .from('service_types')
      .select('slug, metadata')
      .eq('is_enabled', true)

    this.serviceTypeKeywordsCache = (data || [])
      .map((st) => ({
        slug: st.slug,
        keywords: ((st.metadata as Record<string, unknown>)?.keywords as string[]) || [],
      }))
      .filter((st) => st.keywords.length > 0)

    return this.serviceTypeKeywordsCache
  }

  /**
   * Find a sibling contractor with a website (same phone or similar company name)
   *
   * Matching priority:
   * 1. Same phone number (high confidence)
   * 2. Similar company name (medium confidence, requires exact match)
   */
  private async findSiblingContractor(contractor: ContractorForEnrichment): Promise<SiblingContractor | null> {
    const { id, phone, company_name } = contractor

    // Try phone match first (high confidence)
    if (phone && phone.trim()) {
      // Normalize phone for matching (remove non-digits)
      const normalizedPhone = phone.replace(/\D/g, '')

      if (normalizedPhone.length >= 10) {
        const { data: phoneMatches } = await this.client
          .from('contractors')
          .select('id, company_name, website')
          .neq('id', id)
          .not('website', 'is', null)
          .is('deleted_at', null)

        // Filter by normalized phone in application layer for flexibility
        const phoneMatch = phoneMatches?.find((c) => {
          const cPhone = c.website ? (c as unknown as { phone?: string }).phone : null
          return false // Phone not in this query, need separate approach
        })

        // Actually query with phone filter
        const { data: directPhoneMatches } = await this.client
          .from('contractors')
          .select('id, company_name, website, phone')
          .neq('id', id)
          .not('website', 'is', null)
          .not('phone', 'is', null)
          .is('deleted_at', null)
          .limit(50)

        if (directPhoneMatches) {
          for (const match of directPhoneMatches) {
            const matchPhone = (match.phone || '').replace(/\D/g, '')
            if (matchPhone === normalizedPhone && match.website) {
              consola.info(`ContractorEnrichmentService: Found sibling by phone for ${company_name}: ${match.company_name}`)
              return {
                id: match.id,
                company_name: match.company_name,
                website: match.website,
                matchType: 'phone',
              }
            }
          }
        }
      }
    }

    // Try exact company name match (medium confidence)
    if (company_name && company_name.trim()) {
      const { data: nameMatches } = await this.client
        .from('contractors')
        .select('id, company_name, website')
        .neq('id', id)
        .eq('company_name', company_name.trim())
        .not('website', 'is', null)
        .is('deleted_at', null)
        .limit(1)

      if (nameMatches && nameMatches.length > 0 && nameMatches[0].website) {
        consola.info(`ContractorEnrichmentService: Found sibling by name for ${company_name}: ${nameMatches[0].company_name}`)
        return {
          id: nameMatches[0].id,
          company_name: nameMatches[0].company_name,
          website: nameMatches[0].website,
          matchType: 'name',
        }
      }
    }

    return null
  }

  async enrichContractor(contractor: ContractorForEnrichment): Promise<EnrichmentResult> {
    const { id, company_name, website, metadata } = contractor

    if (!website) {
      const sibling = await this.findSiblingContractor(contractor)

      if (!sibling) {
        await this.markAsSkipped(id, metadata)
        return {
          contractorId: id,
          companyName: company_name,
          status: 'skipped',
          message: 'No website URL and no sibling contractor found',
        }
      }

      consola.info(`ContractorEnrichmentService: Using sibling website ${sibling.website} for ${company_name} (matched by ${sibling.matchType})`)
      return this.createStealthyCrawlJob(contractor, sibling.website, true)
    }

    return this.createStealthyCrawlJob(contractor, website, false)
  }

  private async createStealthyCrawlJob(
    contractor: ContractorForEnrichment,
    websiteUrl: string,
    usingSiblingWebsite: boolean
  ): Promise<EnrichmentResult> {
    const { id, company_name, metadata } = contractor

    const serviceTypeKeywords = await this.getServiceTypeKeywords()

    const payload: StealthyCrawlPayload = {
      contractorId: id,
      websiteUrl,
      usingSiblingWebsite,
      serviceTypeKeywords,
    }

    const { error: insertError } = await this.client.from('background_jobs').insert({
      job_type: 'stealthy_crawl',
      status: 'pending',
      payload,
      max_attempts: 3,
    })

    if (insertError) {
      consola.error(`Failed to create stealthy_crawl job for ${id}:`, insertError)
      return {
        contractorId: id,
        companyName: company_name,
        status: 'failed',
        message: `Failed to queue crawl: ${insertError.message}`,
      }
    }

    const existingMeta = metadata || {}
    await this.client.from('contractors').update({
      metadata: {
        ...existingMeta,
        enrichment: {
          status: 'crawl_pending',
          queued_at: new Date().toISOString(),
          website_url: websiteUrl,
        },
      },
    }).eq('id', id)

    return {
      contractorId: id,
      companyName: company_name,
      status: 'queued',
      message: `Crawl job created for ${websiteUrl}`,
    }
  }

  private async markAsSkipped(
    contractorId: string,
    existingMetadata: Record<string, unknown> | null
  ): Promise<void> {
    const meta = existingMetadata || {}
    await this.client
      .from('contractors')
      .update({
        metadata: {
          ...meta,
          enrichment: {
            status: 'not_applicable',
            reason: 'No website URL',
            checked_at: new Date().toISOString(),
          },
        },
      })
      .eq('id', contractorId)
  }
}
