/**
 * Nitro Plugin: Job Executor Registration
 *
 * Registers all job executors once on server startup.
 * This ensures executors are available before any job execution requests.
 *
 * @see https://nitro.unjs.io/guide/plugins
 */

import { consola } from 'consola'
import { JobExecutorRegistry } from '../services/JobExecutorRegistry'
import { ImageEnrichmentJobExecutor } from '../services/executors/ImageEnrichmentJobExecutor'
import { ContractorEnrichmentJobExecutor } from '../services/executors/ContractorEnrichmentJobExecutor'
import { ReviewEnrichmentJobExecutor } from '../services/executors/ReviewEnrichmentJobExecutor'
import { ReviewerImageRetryJobExecutor } from '../services/executors/ReviewerImageRetryJobExecutor'

export default defineNitroPlugin(() => {
  // Register all job executors
  const executors = [
    { type: 'image_enrichment', executor: new ImageEnrichmentJobExecutor() },
    { type: 'contractor_enrichment', executor: new ContractorEnrichmentJobExecutor() },
    { type: 'review_enrichment', executor: new ReviewEnrichmentJobExecutor() },
    { type: 'reviewer_image_retry', executor: new ReviewerImageRetryJobExecutor() },
  ] as const

  let registeredCount = 0

  for (const { type, executor } of executors) {
    if (!JobExecutorRegistry.has(type)) {
      JobExecutorRegistry.register(type, executor)
      registeredCount++
    }
  }

  if (registeredCount > 0) {
    consola.success(`Registered ${registeredCount} job executor(s) on server startup`)
  }
})

