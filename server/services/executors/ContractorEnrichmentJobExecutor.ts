/**
 * Contractor Enrichment Job Executor
 *
 * Implements JobExecutor interface to run contractor enrichment as a background job.
 * Wraps the ContractorEnrichmentService and reports progress after each contractor.
 *
 * Features:
 * - Processes a batch of contractors by their IDs
 * - Crawls websites and extracts business info using AI
 * - Assigns service types based on AI inference
 * - Reports progress via SSE-compatible callbacks
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../app/types/supabase'
import type {
  BackgroundJobRow,
  JobResult,
  ContractorEnrichmentPayload,
  ContractorEnrichmentResult,
} from '../../schemas/job.schemas'
import { DEFAULT_CONTRACTOR_BATCH_SIZE } from '../../schemas/job.schemas'
import type { JobExecutor, ProgressCallback } from '../JobExecutorRegistry'
import { ContractorEnrichmentService, type EnrichmentResult } from '../ContractorEnrichmentService'
import { SystemLogService } from '../SystemLogService'
import { consola } from 'consola'

export class ContractorEnrichmentJobExecutor implements JobExecutor {
  /**
   * Execute the contractor enrichment job
   */
  async execute(
    job: BackgroundJobRow,
    client: SupabaseClient<Database>,
    onProgress: ProgressCallback
  ): Promise<JobResult> {
    const logService = new SystemLogService(client)
    const enrichmentService = new ContractorEnrichmentService(client)

    // Parse payload
    const payload = (job.payload || {}) as ContractorEnrichmentPayload
    const contractorIds = payload.contractorIds || []

    if (contractorIds.length === 0) {
      consola.warn(`ContractorEnrichmentJobExecutor: Job ${job.id} has no contractor IDs`)
      return this.buildResult([], 0)
    }

    // Limit to batch size
    const batchIds = contractorIds.slice(0, DEFAULT_CONTRACTOR_BATCH_SIZE)

    consola.info(`ContractorEnrichmentJobExecutor: Starting job ${job.id} with ${batchIds.length} contractors`)

    // Set total items for progress tracking
    onProgress({ totalItems: batchIds.length })

    // Log job start
    await logService.logJobEvent(job.id, 'batch_start', `Processing ${batchIds.length} contractors`, {
      contractorCount: batchIds.length,
      contractorIds: batchIds,
    })

    // Fetch contractors by IDs with city data for location context
    const { data: contractors, error: fetchError } = await client
      .from('contractors')
      .select(`
        id,
        company_name,
        website,
        phone,
        street_address,
        postal_code,
        metadata,
        city:cities(name, state_code)
      `)
      .in('id', batchIds)

    if (fetchError) {
      consola.error(`ContractorEnrichmentJobExecutor: Failed to fetch contractors`, fetchError)
      await logService.logJobEvent(job.id, 'fetch_failed', fetchError.message, {}, 'error')
      throw new Error(`Failed to fetch contractors: ${fetchError.message}`)
    }

    if (!contractors || contractors.length === 0) {
      consola.warn(`ContractorEnrichmentJobExecutor: No contractors found for IDs`)
      await enrichmentService.close()
      return this.buildResult([], 0)
    }

    // Update total items based on actual contractors found
    onProgress({ totalItems: contractors.length })

    const results: EnrichmentResult[] = []
    let processedCount = 0
    let successCount = 0
    let skippedCount = 0
    let failedCount = 0
    let queuedCount = 0

    for (const contractor of contractors) {
      await logService.logJobEvent(
        job.id,
        'contractor_start',
        `Processing: ${contractor.company_name}`,
        { contractorId: contractor.id }
      )

      const result = await enrichmentService.enrichContractor({
        id: contractor.id,
        company_name: contractor.company_name,
        website: contractor.website,
        phone: contractor.phone,
        street_address: contractor.street_address,
        postal_code: contractor.postal_code,
        metadata: contractor.metadata as Record<string, unknown> | null,
        city: contractor.city as { name: string; state_code: string } | null,
      })

      results.push(result)
      processedCount++

      if (result.status === 'queued') {
        successCount++
        queuedCount++
      } else if (result.status === 'skipped') {
        successCount++
        skippedCount++
      } else {
        failedCount++
      }

      onProgress({
        processedItems: processedCount,
        failedItems: failedCount,
      })

      await logService.logJobEvent(
        job.id,
        'contractor_complete',
        `${result.status}: ${contractor.company_name} - ${result.message}`,
        {
          contractorId: contractor.id,
          status: result.status,
        },
        result.status === 'failed' ? 'warn' : 'info'
      )

      consola.debug(`ContractorEnrichmentJobExecutor: [${processedCount}/${contractors.length}] ${contractor.company_name} - ${result.status}`)
    }

    await logService.logJobEvent(job.id, 'batch_complete', `Processed ${processedCount} contractors`, {
      processed: processedCount,
      successful: successCount,
      skipped: skippedCount,
      failed: failedCount,
      queued: queuedCount,
    })

    consola.success(`ContractorEnrichmentJobExecutor: Job ${job.id} complete - ${queuedCount} queued, ${skippedCount} skipped, ${failedCount} failed`)

    return this.buildResult(results, queuedCount, skippedCount, failedCount)
  }

  private buildResult(
    results: EnrichmentResult[],
    queued: number,
    skipped: number,
    failed: number
  ): ContractorEnrichmentResult {
    return {
      processed: results.length,
      successful: queued + skipped,
      skipped,
      failed,
      queued,
      totalTokens: 0,
      results: results.map(r => ({
        contractorId: r.contractorId,
        companyName: r.companyName,
        status: r.status,
        message: r.message,
      })),
    }
  }
}

