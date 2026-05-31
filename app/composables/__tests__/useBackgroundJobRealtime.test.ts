import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

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

interface SystemLog {
  id: string
  action: string
  message: string | null
  level: string
  createdAt: string
  metadata: Record<string, unknown> | null
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

interface SystemLogRow {
  id: string
  action: string
  message: string | null
  level: string
  created_at: string
  metadata: Record<string, unknown> | null
}

// Helper to create mock Supabase client
function createMockSupabaseClient() {
  const handlers: Array<{ event: string; table: string; filter: string; callback: (payload: any) => void }> = []
  let subscribeCallback: ((status: string) => void) | null = null

  const mockChannel = {
    on: vi.fn((type: string, config: { event: string; schema: string; table: string; filter: string }, callback: (payload: any) => void) => {
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
    _triggerLogInsert: (row: SystemLogRow) => {
      const handler = handlers.find(h => h.table === 'system_logs' && h.event === 'INSERT')
      handler?.callback({ new: row })
    },
  }
}

// Helper to create mock job response (camelCase from API)
function createMockJobResponse(overrides: Partial<Job> = {}): Job {
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

// Helper to create mock log (camelCase from API)
function createMockLog(overrides: Partial<SystemLog> = {}): SystemLog {
  return {
    id: 'log-1',
    action: 'job_started',
    message: 'Job started processing',
    level: 'info',
    createdAt: '2026-01-26T10:00:00Z',
    metadata: null,
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

function createMockLogRow(overrides: Partial<SystemLogRow> = {}): SystemLogRow {
  return {
    id: 'log-new',
    action: 'item_processed',
    message: 'Processed item 50',
    level: 'info',
    created_at: '2026-01-26T10:05:00Z',
    metadata: null,
    ...overrides,
  }
}

describe('useBackgroundJobRealtime', () => {
  let mockClient: ReturnType<typeof createMockSupabaseClient>
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockClient = createMockSupabaseClient()
    mockFetch = vi.fn()
  })

  // Import composable dynamically to avoid module resolution issues before implementation
  async function importComposable() {
    const { useBackgroundJobRealtime } = await import('../useBackgroundJobRealtime')
    return useBackgroundJobRealtime
  }

  describe('initial state', () => {
    it('returns null job initially (before _init() called)', async () => {
      const useBackgroundJobRealtime = await importComposable()
      
      const composable = useBackgroundJobRealtime('job-123', {
        supabaseClient: mockClient as any,
        fetchFn: mockFetch as any,
      })

      expect(composable.job.value).toBeNull()
      expect(composable.logs.value).toEqual([])
      expect(composable.isConnected.value).toBe(false)
      expect(composable.error.value).toBeNull()
      expect(composable.connectionStatus.value).toBe('CLOSED')
    })
  })

  describe('_init()', () => {
    it('fetches initial job via injected fetchFn mock when _init() called', async () => {
      const useBackgroundJobRealtime = await importComposable()
      const mockJob = createMockJobResponse()
      mockFetch.mockResolvedValue({ success: true, data: { ...mockJob, logs: [] } })

      const composable = useBackgroundJobRealtime('job-123', {
        supabaseClient: mockClient as any,
        fetchFn: mockFetch as any,
      })

      await composable._init()

      expect(mockFetch).toHaveBeenCalledWith('/api/jobs/job-123')
      expect(composable.job.value?.id).toBe('job-123')
    })

    it('populates logs from embedded response (camelCase, no separate fetch)', async () => {
      const useBackgroundJobRealtime = await importComposable()
      const mockJob = createMockJobResponse()
      const mockLogs = [
        createMockLog({ id: 'log-1', message: 'First log' }),
        createMockLog({ id: 'log-2', message: 'Second log' }),
      ]
      mockFetch.mockResolvedValue({ success: true, data: { ...mockJob, logs: mockLogs } })

      const composable = useBackgroundJobRealtime('job-123', {
        supabaseClient: mockClient as any,
        fetchFn: mockFetch as any,
      })

      await composable._init()

      // Should only call once (job endpoint includes logs)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(composable.logs.value).toHaveLength(2)
      expect(composable.logs.value[0]!.message).toBe('First log')
      expect(composable.logs.value[1]!.message).toBe('Second log')
    })
  })

  describe('realtime subscriptions', () => {
    it('subscribes to background_jobs with filter id=eq.{jobId}', async () => {
      const useBackgroundJobRealtime = await importComposable()
      mockFetch.mockResolvedValue({ success: true, data: { ...createMockJobResponse(), logs: [] } })

      const composable = useBackgroundJobRealtime('job-123', {
        supabaseClient: mockClient as any,
        fetchFn: mockFetch as any,
      })

      await composable._init()

      const jobHandler = mockClient._handlers.find(h => h.table === 'background_jobs')
      expect(jobHandler).toBeDefined()
      expect(jobHandler?.event).toBe('UPDATE')
      expect(jobHandler?.filter).toBe('id=eq.job-123')
    })

    it('subscribes to system_logs with filter entity_id=eq.{jobId} (single filter only)', async () => {
      const useBackgroundJobRealtime = await importComposable()
      mockFetch.mockResolvedValue({ success: true, data: { ...createMockJobResponse(), logs: [] } })

      const composable = useBackgroundJobRealtime('job-123', {
        supabaseClient: mockClient as any,
        fetchFn: mockFetch as any,
      })

      await composable._init()

      const logHandler = mockClient._handlers.find(h => h.table === 'system_logs')
      expect(logHandler).toBeDefined()
      expect(logHandler?.event).toBe('INSERT')
      expect(logHandler?.filter).toBe('entity_id=eq.job-123')
    })
  })

  describe('realtime event handling', () => {
    it('transforms snake_case DB row to camelCase Job on UPDATE event', async () => {
      const useBackgroundJobRealtime = await importComposable()
      mockFetch.mockResolvedValue({ success: true, data: { ...createMockJobResponse(), logs: [] } })

      const composable = useBackgroundJobRealtime('job-123', {
        supabaseClient: mockClient as any,
        fetchFn: mockFetch as any,
      })

      await composable._init()

      // Trigger UPDATE event with snake_case row
      mockClient._triggerJobUpdate(createMockJobRow({
        status: 'processing',
        processed_items: 50,
        started_at: '2026-01-26T10:01:00Z',
      }))

      // Verify camelCase transformation
      expect(composable.job.value?.status).toBe('processing')
      expect(composable.job.value?.processedItems).toBe(50)
      expect(composable.job.value?.startedAt).toBe('2026-01-26T10:01:00Z')
    })

    it('transforms snake_case log row to camelCase on INSERT, appends to bottom', async () => {
      const useBackgroundJobRealtime = await importComposable()
      const initialLogs = [createMockLog({ id: 'log-1', message: 'Initial log' })]
      mockFetch.mockResolvedValue({ success: true, data: { ...createMockJobResponse(), logs: initialLogs } })

      const composable = useBackgroundJobRealtime('job-123', {
        supabaseClient: mockClient as any,
        fetchFn: mockFetch as any,
      })

      await composable._init()
      expect(composable.logs.value).toHaveLength(1)

      // Trigger INSERT event with snake_case row
      mockClient._triggerLogInsert(createMockLogRow({
        id: 'log-2',
        created_at: '2026-01-26T10:05:00Z',
        message: 'New log entry',
      }))

      // Verify appended to bottom with camelCase
      expect(composable.logs.value).toHaveLength(2)
      expect(composable.logs.value[1]!.id).toBe('log-2')
      expect(composable.logs.value[1]!.createdAt).toBe('2026-01-26T10:05:00Z')
      expect(composable.logs.value[1]!.message).toBe('New log entry')
    })

    it('limits logs array to 50 items (discards oldest from top)', async () => {
      const useBackgroundJobRealtime = await importComposable()
      // Start with 49 logs
      const initialLogs = Array.from({ length: 49 }, (_, i) => 
        createMockLog({ id: `log-${i}`, message: `Log ${i}` })
      )
      mockFetch.mockResolvedValue({ success: true, data: { ...createMockJobResponse(), logs: initialLogs } })

      const composable = useBackgroundJobRealtime('job-123', {
        supabaseClient: mockClient as any,
        fetchFn: mockFetch as any,
      })

      await composable._init()
      expect(composable.logs.value).toHaveLength(49)

      // Add 2 more logs to exceed 50
      mockClient._triggerLogInsert(createMockLogRow({ id: 'log-50', message: 'Log 50' }))
      mockClient._triggerLogInsert(createMockLogRow({ id: 'log-51', message: 'Log 51' }))

      // Should be limited to 50, oldest discarded
      expect(composable.logs.value).toHaveLength(50)
      expect(composable.logs.value[0]!.id).toBe('log-1') // log-0 discarded
      expect(composable.logs.value[49]!.id).toBe('log-51') // newest at bottom
    })
  })

  describe('connection status', () => {
    it('sets isConnected=true on SUBSCRIBED status', async () => {
      const useBackgroundJobRealtime = await importComposable()
      mockFetch.mockResolvedValue({ success: true, data: { ...createMockJobResponse(), logs: [] } })

      const composable = useBackgroundJobRealtime('job-123', {
        supabaseClient: mockClient as any,
        fetchFn: mockFetch as any,
      })

      await composable._init()

      // Trigger SUBSCRIBED status
      mockClient._triggerSubscribeStatus('SUBSCRIBED')

      expect(composable.isConnected.value).toBe(true)
      expect(composable.connectionStatus.value).toBe('SUBSCRIBED')
    })

    it('sets error on CHANNEL_ERROR status', async () => {
      const useBackgroundJobRealtime = await importComposable()
      mockFetch.mockResolvedValue({ success: true, data: { ...createMockJobResponse(), logs: [] } })

      const composable = useBackgroundJobRealtime('job-123', {
        supabaseClient: mockClient as any,
        fetchFn: mockFetch as any,
      })

      await composable._init()

      // Trigger CHANNEL_ERROR status
      mockClient._triggerSubscribeStatus('CHANNEL_ERROR')

      expect(composable.isConnected.value).toBe(false)
      expect(composable.connectionStatus.value).toBe('CHANNEL_ERROR')
      expect(composable.error.value).toBeInstanceOf(Error)
      expect(composable.error.value?.message).toContain('CHANNEL_ERROR')
    })

    it('sets error on TIMED_OUT status', async () => {
      const useBackgroundJobRealtime = await importComposable()
      mockFetch.mockResolvedValue({ success: true, data: { ...createMockJobResponse(), logs: [] } })

      const composable = useBackgroundJobRealtime('job-123', {
        supabaseClient: mockClient as any,
        fetchFn: mockFetch as any,
      })

      await composable._init()

      // Trigger TIMED_OUT status
      mockClient._triggerSubscribeStatus('TIMED_OUT')

      expect(composable.isConnected.value).toBe(false)
      expect(composable.connectionStatus.value).toBe('TIMED_OUT')
      expect(composable.error.value).toBeInstanceOf(Error)
      expect(composable.error.value?.message).toContain('TIMED_OUT')
    })
  })

  describe('_cleanup()', () => {
    it('calls removeChannel on _cleanup()', async () => {
      const useBackgroundJobRealtime = await importComposable()
      mockFetch.mockResolvedValue({ success: true, data: { ...createMockJobResponse(), logs: [] } })

      const composable = useBackgroundJobRealtime('job-123', {
        supabaseClient: mockClient as any,
        fetchFn: mockFetch as any,
      })

      await composable._init()
      composable._cleanup()

      expect(mockClient.removeChannel).toHaveBeenCalled()
    })
  })

  describe('MaybeRef support', () => {
    it('works with ref jobId', async () => {
      const useBackgroundJobRealtime = await importComposable()
      const jobIdRef = ref('job-456')
      mockFetch.mockResolvedValue({ success: true, data: { ...createMockJobResponse({ id: 'job-456' }), logs: [] } })

      const composable = useBackgroundJobRealtime(jobIdRef, {
        supabaseClient: mockClient as any,
        fetchFn: mockFetch as any,
      })

      await composable._init()

      expect(mockFetch).toHaveBeenCalledWith('/api/jobs/job-456')
      expect(composable.job.value?.id).toBe('job-456')
    })
  })
})
