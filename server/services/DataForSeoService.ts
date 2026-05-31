/**
 * DataForSEO Service
 *
 * API client wrapper for DataForSEO Business Data API - Google Reviews.
 * Handles task submission, polling, and result fetching with proper error handling.
 */

import { consola } from 'consola'
import { useRuntimeConfig } from '#imports'
import {
  DATAFORSEO_BASE_URL,
  DATAFORSEO_REVIEWS_ENDPOINT,
  DATAFORSEO_MAX_TASKS_PER_REQUEST,
  DATAFORSEO_POLL_INTERVAL_MS,
  DATAFORSEO_MAX_POLL_ATTEMPTS,
  DATAFORSEO_STATUS_CODES,
  DataForSeoError,
  DataForSeoAuthError,
  DataForSeoRateLimitError,
  type DataForSeoReviewTask,
  type DataForSeoTaskPostResponse,
  type DataForSeoTasksReadyResponse,
  type DataForSeoTaskGetResponse,
  type TaskContractorMapping,
  type PollResult,
} from '../schemas/dataforseo.schemas'

// =====================================================
// TYPES
// =====================================================

export interface SubmitTasksResult {
  success: boolean
  taskMappings: TaskContractorMapping[]
  failedTasks: Array<{
    cid: string
    contractorId: string
    error: string
  }>
  totalCost: number
}

export interface FetchResultOutput {
  success: boolean
  cid: string
  reviewsCount: number
  reviews: DataForSeoTaskGetResponse['tasks'][0]['result']
  cost: number
  error?: string
}

// =====================================================
// SERVICE
// =====================================================

export class DataForSeoService {
  private apiKey: string
  private authHeader: string

  constructor(apiKey?: string) {
    const config = useRuntimeConfig()
    const key = apiKey || config.dataforseoApiKey
    if (!key) {
      throw new Error('dataforseoApiKey is required in runtimeConfig')
    }
    this.apiKey = key
    // DataForSEO uses Basic Auth with "login:password" base64 encoded
    // The API key in the environment is already the Base64-encoded "login:password"
    this.authHeader = `Basic ${this.apiKey}`
  }

  // =====================================================
  // TASK SUBMISSION
  // =====================================================

  /**
   * Submit review tasks to DataForSEO
   * Maps tasks to contractor info for later result matching
   */
  async submitReviewTasks(
    tasks: DataForSeoReviewTask[],
    contractorMappings: Array<{ contractorId: string; companyName: string; googleCid: string }>
  ): Promise<SubmitTasksResult> {
    if (tasks.length === 0) {
      return { success: true, taskMappings: [], failedTasks: [], totalCost: 0 }
    }

    if (tasks.length > DATAFORSEO_MAX_TASKS_PER_REQUEST) {
      throw new DataForSeoError(
        `Cannot submit more than ${DATAFORSEO_MAX_TASKS_PER_REQUEST} tasks per request`,
        400
      )
    }

    consola.debug(`[DataForSeoService] Submitting ${tasks.length} review tasks`)

    try {
      const response = await fetch(`${DATAFORSEO_BASE_URL}${DATAFORSEO_REVIEWS_ENDPOINT}/task_post`, {
        method: 'POST',
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tasks),
      })

      if (!response.ok) {
        await this.handleHttpError(response)
      }

      const data: DataForSeoTaskPostResponse = await response.json()

      // Check overall response status
      if (data.status_code !== DATAFORSEO_STATUS_CODES.SUCCESS) {
        throw new DataForSeoError(
          `API error: ${data.status_message}`,
          data.status_code
        )
      }

      // Process individual task results
      const taskMappings: TaskContractorMapping[] = []
      const failedTasks: SubmitTasksResult['failedTasks'] = []

      for (const task of data.tasks) {
        const cid = String(task.data.cid)
        const mapping = contractorMappings.find(m => m.googleCid === cid)

        if (!mapping) {
          consola.warn(`[DataForSeoService] No mapping found for CID: ${cid}`)
          continue
        }

        if (task.status_code === DATAFORSEO_STATUS_CODES.TASK_CREATED) {
          taskMappings.push({
            taskId: task.id,
            contractorId: mapping.contractorId,
            googleCid: cid,
            companyName: mapping.companyName,
          })
        } else {
          failedTasks.push({
            cid,
            contractorId: mapping.contractorId,
            error: task.status_message,
          })
        }
      }

      consola.info(
        `[DataForSeoService] Submitted ${taskMappings.length} tasks, ${failedTasks.length} failed`
      )

      return {
        success: taskMappings.length > 0,
        taskMappings,
        failedTasks,
        totalCost: data.cost,
      }
    } catch (error) {
      if (error instanceof DataForSeoError) throw error
      consola.error(`[DataForSeoService] Submit error:`, error)
      throw new DataForSeoError(`Failed to submit tasks: ${error}`, 500, true)
    }
  }

  // =====================================================
  // TASK POLLING
  // =====================================================

  /**
   * Poll for ready tasks
   * Returns when all tasks are ready or max attempts reached
   */
  async pollTasksReady(
    taskIds: string[],
    maxAttempts: number = DATAFORSEO_MAX_POLL_ATTEMPTS,
    intervalMs: number = DATAFORSEO_POLL_INTERVAL_MS
  ): Promise<PollResult> {
    if (taskIds.length === 0) {
      return { readyTaskIds: [], pendingTaskIds: [], timedOut: false, pollAttempts: 0 }
    }

    const pendingSet = new Set(taskIds)
    const readyTaskIds: string[] = []
    let attempts = 0

    consola.debug(`[DataForSeoService] Starting poll for ${taskIds.length} tasks`)

    while (pendingSet.size > 0 && attempts < maxAttempts) {
      attempts++
      await this.sleep(intervalMs)

      try {
        const response = await fetch(
          `${DATAFORSEO_BASE_URL}${DATAFORSEO_REVIEWS_ENDPOINT}/tasks_ready`,
          {
            method: 'GET',
            headers: { 'Authorization': this.authHeader },
          }
        )

        if (!response.ok) {
          await this.handleHttpError(response)
        }

        const data: DataForSeoTasksReadyResponse = await response.json()

        if (data.status_code !== DATAFORSEO_STATUS_CODES.SUCCESS) {
          consola.warn(`[DataForSeoService] Poll response error: ${data.status_message}`)
          continue
        }

        // Check for ready tasks
        for (const task of data.tasks) {
          if (task.result) {
            for (const readyItem of task.result) {
              if (pendingSet.has(readyItem.id)) {
                readyTaskIds.push(readyItem.id)
                pendingSet.delete(readyItem.id)
              }
            }
          }
        }

        if (pendingSet.size > 0) {
          consola.debug(
            `[DataForSeoService] Poll ${attempts}/${maxAttempts}: ${readyTaskIds.length} ready, ${pendingSet.size} pending`
          )
        }
      } catch (error) {
        if (error instanceof DataForSeoAuthError) throw error
        consola.warn(`[DataForSeoService] Poll attempt ${attempts} failed:`, error)
        // Continue polling on transient errors
      }
    }

    const timedOut = pendingSet.size > 0
    if (timedOut) {
      consola.warn(
        `[DataForSeoService] Polling timed out after ${attempts} attempts. ${pendingSet.size} tasks still pending`
      )
    } else {
      consola.info(`[DataForSeoService] All ${readyTaskIds.length} tasks ready after ${attempts} polls`)
    }

    return {
      readyTaskIds,
      pendingTaskIds: Array.from(pendingSet),
      timedOut,
      pollAttempts: attempts,
    }
  }

  // =====================================================
  // RESULT FETCHING
  // =====================================================

  /**
   * Fetch results for a single completed task
   */
  async fetchTaskResult(taskId: string): Promise<FetchResultOutput> {
    consola.debug(`[DataForSeoService] Fetching result for task: ${taskId}`)

    try {
      const response = await fetch(
        `${DATAFORSEO_BASE_URL}${DATAFORSEO_REVIEWS_ENDPOINT}/task_get/${taskId}`,
        {
          method: 'GET',
          headers: { 'Authorization': this.authHeader },
        }
      )

      if (!response.ok) {
        await this.handleHttpError(response)
      }

      const data: DataForSeoTaskGetResponse = await response.json()

      if (data.status_code !== DATAFORSEO_STATUS_CODES.SUCCESS) {
        return {
          success: false,
          cid: '',
          reviewsCount: 0,
          reviews: null,
          cost: data.cost,
          error: data.status_message,
        }
      }

      const task = data.tasks[0]
      if (!task || !task.result) {
        return {
          success: false,
          cid: String(task?.data?.cid || ''),
          reviewsCount: 0,
          reviews: null,
          cost: data.cost,
          error: 'No result data in response',
        }
      }

      const result = task.result[0]
      const cid = result?.cid || String(task.data.cid)

      return {
        success: true,
        cid,
        reviewsCount: result?.items_count || 0,
        reviews: task.result,
        cost: data.cost,
      }
    } catch (error) {
      if (error instanceof DataForSeoError) throw error
      consola.error(`[DataForSeoService] Fetch result error:`, error)
      throw new DataForSeoError(`Failed to fetch task result: ${error}`, 500, true)
    }
  }

  // =====================================================
  // HELPERS
  // =====================================================

  /**
   * Handle HTTP error responses
   */
  private async handleHttpError(response: Response): Promise<never> {
    const status = response.status
    let message = response.statusText

    try {
      const body = await response.json()
      message = body.status_message || body.message || message
    } catch {
      // Use default message
    }

    if (status === 401 || status === 403) {
      throw new DataForSeoAuthError(message)
    }

    if (status === 429) {
      throw new DataForSeoRateLimitError(message)
    }

    throw new DataForSeoError(message, status, status >= 500)
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
