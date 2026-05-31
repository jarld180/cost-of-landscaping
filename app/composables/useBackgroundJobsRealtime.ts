import { ref, getCurrentInstance, onMounted, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'
import type { Job } from './useBackgroundJobRealtime'

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

export function useBackgroundJobsRealtime(
  options?: {
    onRefresh?: () => void
    supabaseClient?: SupabaseClient
  }
) {
  const client = options?.supabaseClient ?? useSupabaseClient()
  const onRefresh = options?.onRefresh

  const jobs = ref<Job[]>([])
  const isConnected = ref(false)
  const error = ref<Error | null>(null)
  const connectionStatus = ref<string>('CLOSED')

  let channel: RealtimeChannel | null = null

  function init() {
    channel = client.channel('jobs-list')

    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'background_jobs' },
      (payload) => {
        const updated = transformJob(payload.new as BackgroundJobRow)
        const idx = jobs.value.findIndex(j => j.id === updated.id)
        if (idx !== -1) {
          jobs.value = [...jobs.value.slice(0, idx), updated, ...jobs.value.slice(idx + 1)]
        }
      }
    )

    channel.on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'background_jobs' },
      (payload) => {
        const deletedId = (payload.old as { id: string }).id
        jobs.value = jobs.value.filter(j => j.id !== deletedId)
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

  function setJobs(newJobs: Job[]) {
    jobs.value = newJobs
  }

  function refresh() {
    onRefresh?.()
  }

  const instance = getCurrentInstance()
  if (instance) {
    onMounted(() => init())
    onUnmounted(() => cleanup())
  }

  return {
    jobs: jobs as Ref<Job[]>,
    isConnected: isConnected as Ref<boolean>,
    error: error as Ref<Error | null>,
    connectionStatus: connectionStatus as Ref<string>,
    refresh,
    setJobs,
    _init: init,
    _cleanup: cleanup,
  }
}
