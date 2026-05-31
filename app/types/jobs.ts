/**
 * Shared types for background job management
 */

export interface ActiveJob {
  id: string
  status: string
  processedItems: number
  totalItems: number | null
  failedItems: number
}

