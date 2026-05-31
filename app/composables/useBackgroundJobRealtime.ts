import { ref, toValue, getCurrentInstance, onMounted, onUnmounted } from 'vue'
import type { Ref, MaybeRef } from 'vue'
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'

export interface Job {
  id: string
  jobType: string
  status: string
  attempts: number
  maxAttempts: number
  totalItems: number | null
  processedItems: number
  failedItems: number
  payload: Record<string, unknown>
  result: Record<string, unknown> | null
  lastError: string | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  createdBy: string | null
}

export interface SystemLog {
  id: string
  action: string
  message: string | null
  level: string
  createdAt: string
  metadata: Record<string, unknown> | null
}

interface BackgroundJobRow {
  id: string
  job_type: string
  status: string
  attempts: number
  max_attempts: number
  total_items: number | null
  processed_items: number
  failed_items: number
  payload: Record<string, unknown>
  result: Record<string, unknown> | null
  last_error: string | null
  created_at: string
  started_at: string | null
  completed_at: string | null
  created_by: string | null
}

interface SystemLogRow {
  id: string
  action: string
  message: string | null
  level: string
  created_at: string
  metadata: Record<string, unknown> | null
}

interface JobApiResponse {
  success: boolean
  data: Job & { logs: SystemLog[] }
}

const MAX_LOGS = 50

function transformJob(row: BackgroundJobRow): Job {
  return {
    id: row.id,
    jobType: row.job_type,
    status: row.status,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    totalItems: row.total_items,
    processedItems: row.processed_items,
    failedItems: row.failed_items,
    payload: row.payload,
    result: row.result,
    lastError: row.last_error,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdBy: row.created_by,
  }
}

function transformLog(row: SystemLogRow): SystemLog {
  return {
    id: row.id,
    action: row.action,
    message: row.message,
    level: row.level,
    createdAt: row.created_at,
    metadata: row.metadata,
  }
}

export function useBackgroundJobRealtime(
  jobId: MaybeRef<string>,
  options?: {
    supabaseClient?: SupabaseClient
    fetchFn?: typeof $fetch
  }
) {
  const client = options?.supabaseClient ?? useSupabaseClient()
  const fetchFn = options?.fetchFn ?? $fetch

  const job = ref<Job | null>(null)
  const logs = ref<SystemLog[]>([])
  const isConnected = ref(false)
  const error = ref<Error | null>(null)
  const connectionStatus = ref<string>('CLOSED')

  let channel: RealtimeChannel | null = null

  async function init() {
    const id = toValue(jobId)

    const response = await fetchFn<JobApiResponse>(`/api/jobs/${id}`)
    if (response.success && response.data) {
      const { logs: embeddedLogs, ...jobData } = response.data
      job.value = jobData
      logs.value = embeddedLogs || []
    }

    channel = client.channel(`job-${id}`)

    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'background_jobs', filter: `id=eq.${id}` },
      (payload) => {
        job.value = transformJob(payload.new as BackgroundJobRow)
      }
    )

    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'system_logs', filter: `entity_id=eq.${id}` },
      (payload) => {
        const newLog = transformLog(payload.new as SystemLogRow)
        logs.value = [...logs.value, newLog].slice(-MAX_LOGS)
      }
    )

    channel.subscribe((status) => {
      connectionStatus.value = status
      isConnected.value = status === 'SUBSCRIBED'
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        error.value = new Error(`Realtime connection ${status}`)
      }
    })
  }

  function cleanup() {
    if (channel) {
      client.removeChannel(channel)
      channel = null
    }
  }

  const instance = getCurrentInstance()
  if (instance) {
    onMounted(() => init())
    onUnmounted(() => cleanup())
  }

  return {
    job: job as Ref<Job | null>,
    logs: logs as Ref<SystemLog[]>,
    isConnected: isConnected as Ref<boolean>,
    error: error as Ref<Error | null>,
    connectionStatus: connectionStatus as Ref<string>,
    _init: init,
    _cleanup: cleanup,
  }
}
