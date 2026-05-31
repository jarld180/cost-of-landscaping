/**
 * Job Executor Registration
 *
 * This module registers all job executors with the JobExecutorRegistry.
 * Import this module in server startup to ensure executors are registered.
 */

import { JobExecutorRegistry } from '../JobExecutorRegistry'
import { ImageEnrichmentJobExecutor } from './ImageEnrichmentJobExecutor'
import { ContractorEnrichmentJobExecutor } from './ContractorEnrichmentJobExecutor'
import { ReviewEnrichmentJobExecutor } from './ReviewEnrichmentJobExecutor'

/**
 * Register all job executors
 * Call this function to ensure executors are registered
 */
export function registerExecutors(): void {
  if (!JobExecutorRegistry.has('image_enrichment')) {
    JobExecutorRegistry.register('image_enrichment', new ImageEnrichmentJobExecutor())
  }
  if (!JobExecutorRegistry.has('contractor_enrichment')) {
    JobExecutorRegistry.register('contractor_enrichment', new ContractorEnrichmentJobExecutor())
  }
  if (!JobExecutorRegistry.has('review_enrichment')) {
    JobExecutorRegistry.register('review_enrichment', new ReviewEnrichmentJobExecutor())
  }
}

// Auto-register on module load
registerExecutors()

export { ImageEnrichmentJobExecutor, ContractorEnrichmentJobExecutor, ReviewEnrichmentJobExecutor }

