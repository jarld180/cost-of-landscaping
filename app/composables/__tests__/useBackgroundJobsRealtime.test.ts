import { describe, it, expect, vi, beforeEach } from 'vitest'

// Types matching the composable
interface Job {
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

// Raw DB row types (snake_case)
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

// Helper to create mock Supabase client
function createMockSupabaseClient() {
  const handlers: Array<{ event: string; table: string; filter?: string; callback: (payload: any) => void }> = []
  let subscribeCallback: ((status: string) => void) | null = null

  const mockChannel = {
    on: vi.fn((type: string, config: { event: string; schema: string; table: string; filter?: string }, callback: (payload: any) => void) => {
      handlers.push({ event: config.event, table: config.table, filter: config.filter, callback })
      return mockChannel
    }),
    subscribe: vi.fn((callback?: (status: string) => void) => {
      subscribeCallback = callback || null
      return mockChannel
    }),
  }

  return {
    channel: vi.fn(() => mockChannel),
    removeChannel: vi.fn(),
    // Test helpers
    _mockChannel: mockChannel,
    _handlers: handlers,
    _triggerSubscribeStatus: (status: string) => subscribeCallback?.(status),
    _triggerJobUpdate: (row: BackgroundJobRow) => {
      const handler = handlers.find(h => h.table === 'background_jobs' && h.event === 'UPDATE')
      handler?.callback({ new: row })
    },
    _triggerJobInsert: (row: BackgroundJobRow) => {
      const handler = handlers.find(h => h.table === 'background_jobs' && h.event === 'INSERT')
      handler?.callback({ new: row })
    },
    _triggerJobDelete: (oldRow: { id: string }) => {
      const handler = handlers.find(h => h.table === 'background_jobs' && h.event === 'DELETE')
      handler?.callback({ old: oldRow })
    },
  }
}

// Helper to create mock job (camelCase)
function createMockJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 'job-123',
    jobType: 'test_job',
    status: 'pending',
    attempts: 1,
    maxAttempts: 3,
    totalItems: 100,
    processedItems: 0,
    failedItems: 0,
    payload: {},
    result: null,
    lastError: null,
    createdAt: '2026-01-26T10:00:00Z',
    startedAt: null,
    completedAt: null,
    createdBy: 'user-1',
    ...overrides,
  }
}

// Helper to create DB row (snake_case)
function createMockJobRow(overrides: Partial<BackgroundJobRow> = {}): BackgroundJobRow {
  return {
    id: 'job-123',
    job_type: 'test_job',
    status: 'processing',
    attempts: 1,
    max_attempts: 3,
    total_items: 100,
    processed_items: 50,
    failed_items: 0,
    payload: {},
    result: null,
    last_error: null,
    created_at: '2026-01-26T10:00:00Z',
    started_at: '2026-01-26T10:01:00Z',
    completed_at: null,
    created_by: 'user-1',
    ...overrides,
  }
}

describe('useBackgroundJobsRealtime', () => {
  let mockClient: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    vi.clearAllMocks()
    mockClient = createMockSupabaseClient()
  })

  // Import composable dynamically to avoid module resolution issues before implementation
  async function importComposable() {
    const { useBackgroundJobsRealtime } = await import('../useBackgroundJobsRealtime')
    return useBackgroundJobsRealtime
  }

  describe('initial state', () => {
    it('starts with empty jobs array', async () => {
      const useBackgroundJobsRealtime = await importComposable()

      const composable = useBackgroundJobsRealtime({
        supabaseClient: mockClient as any,
      })

      expect(composable.jobs.value).toEqual([])
      expect(composable.isConnected.value).toBe(false)
      expect(composable.error.value).toBeNull()
      expect(composable.connectionStatus.value).toBe('CLOSED')
    })
  })

  describe('setJobs()', () => {
    it('populates the jobs array', async () => {
      const useBackgroundJobsRealtime = await importComposable()
      const mockJobs = [
        createMockJob({ id: 'job-1', status: 'pending' }),
        createMockJob({ id: 'job-2', status: 'processing' }),
        createMockJob({ id: 'job-3', status: 'completed' }),
      ]

      const composable = useBackgroundJobsRealtime({
        supabaseClient: mockClient as any,
      })

      composable.setJobs(mockJobs)

      expect(composable.jobs.value).toHaveLength(3)
      expect(composable.jobs.value[0]!.id).toBe('job-1')
      expect(composable.jobs.value[1]!.id).toBe('job-2')
      expect(composable.jobs.value[2]!.id).toBe('job-3')
    })
  })

  describe('realtime subscriptions', () => {
    it('subscribes to postgres_changes for background_jobs table (no filter)', async () => {
      const useBackgroundJobsRealtime = await importComposable()

      const composable = useBackgroundJobsRealtime({
        supabaseClient: mockClient as any,
      })

      composable._init()

      // Should have UPDATE and DELETE handlers, but NO filter
      const updateHandler = mockClient._handlers.find(h => h.table === 'background_jobs' && h.event === 'UPDATE')
      const deleteHandler = mockClient._handlers.find(h => h.table === 'background_jobs' && h.event === 'DELETE')

      expect(updateHandler).toBeDefined()
      expect(updateHandler?.filter).toBeUndefined()
      expect(deleteHandler).toBeDefined()
      expect(deleteHandler?.filter).toBeUndefined()
    })
  })

  describe('realtime event handling', () => {
    it('transforms snake_case DB row to camelCase Job on events', async () => {
      const useBackgroundJobsRealtime = await importComposable()
      const initialJobs = [createMockJob({ id: 'job-123', status: 'pending', processedItems: 0 })]

      const composable = useBackgroundJobsRealtime({
        supabaseClient: mockClient as any,
      })

      composable.setJobs(initialJobs)
      composable._init()

      // Trigger UPDATE event with snake_case row
      mockClient._triggerJobUpdate(createMockJobRow({
        id: 'job-123',
        status: 'processing',
        processed_items: 50,
        started_at: '2026-01-26T10:01:00Z',
      }))

      // Verify camelCase transformation
      expect(composable.jobs.value[0]!.status).toBe('processing')
      expect(composable.jobs.value[0]!.processedItems).toBe(50)
      expect(composable.jobs.value[0]!.startedAt).toBe('2026-01-26T10:01:00Z')
    })

    it('INSERT event is IGNORED (does not add to array)', async () => {
      const useBackgroundJobsRealtime = await importComposable()
      const initialJobs = [createMockJob({ id: 'job-1' })]

      const composable = useBackgroundJobsRealtime({
        supabaseClient: mockClient as any,
      })

      composable.setJobs(initialJobs)
      composable._init()

      // Trigger INSERT event - should be ignored
      mockClient._triggerJobInsert(createMockJobRow({ id: 'job-new' }))

      // Array should still have only 1 job
      expect(composable.jobs.value).toHaveLength(1)
      expect(composable.jobs.value[0]!.id).toBe('job-1')
    })

    it('UPDATE event updates existing job in array (matches by id)', async () => {
      const useBackgroundJobsRealtime = await importComposable()
      const initialJobs = [
        createMockJob({ id: 'job-1', status: 'pending' }),
        createMockJob({ id: 'job-2', status: 'pending' }),
        createMockJob({ id: 'job-3', status: 'pending' }),
      ]

      const composable = useBackgroundJobsRealtime({
        supabaseClient: mockClient as any,
      })

      composable.setJobs(initialJobs)
      composable._init()

      // Update middle job
      mockClient._triggerJobUpdate(createMockJobRow({
        id: 'job-2',
        status: 'completed',
        processed_items: 100,
      }))

      // Verify only job-2 was updated
      expect(composable.jobs.value).toHaveLength(3)
      expect(composable.jobs.value[0]!.status).toBe('pending')
      expect(composable.jobs.value[1]!.status).toBe('completed')
      expect(composable.jobs.value[1]!.processedItems).toBe(100)
      expect(composable.jobs.value[2]!.status).toBe('pending')
    })

    it('UPDATE event is ignored if job not in array', async () => {
      const useBackgroundJobsRealtime = await importComposable()
      const initialJobs = [createMockJob({ id: 'job-1' })]

      const composable = useBackgroundJobsRealtime({
        supabaseClient: mockClient as any,
      })

      composable.setJobs(initialJobs)
      composable._init()

      // Update a job that's not in the array
      mockClient._triggerJobUpdate(createMockJobRow({
        id: 'job-not-in-array',
        status: 'completed',
      }))

      // Array should be unchanged
      expect(composable.jobs.value).toHaveLength(1)
      expect(composable.jobs.value[0]!.id).toBe('job-1')
    })

    it('DELETE event removes job from array (if present)', async () => {
      const useBackgroundJobsRealtime = await importComposable()
      const initialJobs = [
        createMockJob({ id: 'job-1' }),
        createMockJob({ id: 'job-2' }),
        createMockJob({ id: 'job-3' }),
      ]

      const composable = useBackgroundJobsRealtime({
        supabaseClient: mockClient as any,
      })

      composable.setJobs(initialJobs)
      composable._init()

      // Delete middle job
      mockClient._triggerJobDelete({ id: 'job-2' })

      // Verify job-2 was removed
      expect(composable.jobs.value).toHaveLength(2)
      expect(composable.jobs.value[0]!.id).toBe('job-1')
      expect(composable.jobs.value[1]!.id).toBe('job-3')
    })

    it('DELETE event is ignored if job not in array', async () => {
      const useBackgroundJobsRealtime = await importComposable()
      const initialJobs = [createMockJob({ id: 'job-1' })]

      const composable = useBackgroundJobsRealtime({
        supabaseClient: mockClient as any,
      })

      composable.setJobs(initialJobs)
      composable._init()

      // Delete a job that's not in the array
      mockClient._triggerJobDelete({ id: 'job-not-in-array' })

      // Array should be unchanged
      expect(composable.jobs.value).toHaveLength(1)
      expect(composable.jobs.value[0]!.id).toBe('job-1')
    })
  })

  describe('refresh()', () => {
    it('triggers onRefresh callback', async () => {
      const useBackgroundJobsRealtime = await importComposable()
      const onRefresh = vi.fn()

      const composable = useBackgroundJobsRealtime({
        supabaseClient: mockClient as any,
        onRefresh,
      })

      composable.refresh()

      expect(onRefresh).toHaveBeenCalledTimes(1)
    })

    it('does not throw if onRefresh not provided', async () => {
      const useBackgroundJobsRealtime = await importComposable()

      const composable = useBackgroundJobsRealtime({
        supabaseClient: mockClient as any,
      })

      expect(() => composable.refresh()).not.toThrow()
    })
  })

  describe('connection status', () => {
    it('sets isConnected=true on SUBSCRIBED status', async () => {
      const useBackgroundJobsRealtime = await importComposable()

      const composable = useBackgroundJobsRealtime({
        supabaseClient: mockClient as any,
      })

      composable._init()
      mockClient._triggerSubscribeStatus('SUBSCRIBED')

      expect(composable.isConnected.value).toBe(true)
      expect(composable.connectionStatus.value).toBe('SUBSCRIBED')
    })

    it('sets error on CHANNEL_ERROR status', async () => {
      const useBackgroundJobsRealtime = await importComposable()

      const composable = useBackgroundJobsRealtime({
        supabaseClient: mockClient as any,
      })

      composable._init()
      mockClient._triggerSubscribeStatus('CHANNEL_ERROR')

      expect(composable.isConnected.value).toBe(false)
      expect(composable.connectionStatus.value).toBe('CHANNEL_ERROR')
      expect(composable.error.value).toBeInstanceOf(Error)
      expect(composable.error.value?.message).toContain('CHANNEL_ERROR')
    })

    it('sets error on TIMED_OUT status', async () => {
      const useBackgroundJobsRealtime = await importComposable()

      const composable = useBackgroundJobsRealtime({
        supabaseClient: mockClient as any,
      })

      composable._init()
      mockClient._triggerSubscribeStatus('TIMED_OUT')

      expect(composable.isConnected.value).toBe(false)
      expect(composable.connectionStatus.value).toBe('TIMED_OUT')
      expect(composable.error.value).toBeInstanceOf(Error)
      expect(composable.error.value?.message).toContain('TIMED_OUT')
    })

    it('tracks CLOSED status', async () => {
      const useBackgroundJobsRealtime = await importComposable()

      const composable = useBackgroundJobsRealtime({
        supabaseClient: mockClient as any,
      })

      composable._init()
      mockClient._triggerSubscribeStatus('CLOSED')

      expect(composable.isConnected.value).toBe(false)
      expect(composable.connectionStatus.value).toBe('CLOSED')
    })
  })

  describe('_cleanup()', () => {
    it('calls removeChannel on unmount (via _cleanup())', async () => {
      const useBackgroundJobsRealtime = await importComposable()

      const composable = useBackgroundJobsRealtime({
        supabaseClient: mockClient as any,
      })

      composable._init()
      composable._cleanup()

      expect(mockClient.removeChannel).toHaveBeenCalled()
    })

    it('handles cleanup when channel is null', async () => {
      const useBackgroundJobsRealtime = await importComposable()

      const composable = useBackgroundJobsRealtime({
        supabaseClient: mockClient as any,
      })

      // Call cleanup without init - should not throw
      expect(() => composable._cleanup()).not.toThrow()
      expect(mockClient.removeChannel).not.toHaveBeenCalled()
    })
  })
})
