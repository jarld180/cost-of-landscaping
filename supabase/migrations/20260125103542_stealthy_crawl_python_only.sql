-- Migration: Python-Only Stealthy Crawler
-- Adds stealthy_crawl job type, RPC functions, and modifies pg_cron exclusions

-- ============================================================================
-- 1. MODIFY JOB CONCURRENCY CONSTRAINT
-- ============================================================================
-- Remove unique index for stealthy_crawl (allow multiple pending jobs)
DROP INDEX IF EXISTS idx_one_active_job_per_type;

CREATE UNIQUE INDEX idx_one_active_job_per_type 
ON background_jobs (job_type) 
WHERE status IN ('pending', 'processing') AND job_type != 'stealthy_crawl';

COMMENT ON INDEX idx_one_active_job_per_type IS 
  'Enforces one active job per type, EXCEPT stealthy_crawl which allows multiple pending jobs';

-- ============================================================================
-- 2. RPC: claim_stealthy_crawl_job()
-- ============================================================================
CREATE OR REPLACE FUNCTION claim_stealthy_crawl_job()
RETURNS TABLE(id UUID, payload JSONB, attempts INT, max_attempts INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job RECORD;
  v_new_attempts INT;
BEGIN
  -- Atomic find-and-claim with FOR UPDATE SKIP LOCKED
  SELECT bj.id, bj.payload, bj.attempts, bj.max_attempts INTO v_job
  FROM background_jobs bj
  WHERE bj.status = 'pending'
    AND bj.job_type = 'stealthy_crawl'
    AND (bj.next_retry_at IS NULL OR bj.next_retry_at <= now())
    AND (bj.scheduled_for IS NULL OR bj.scheduled_for <= now())
  ORDER BY bj.created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  
  IF v_job IS NULL THEN
    RETURN;  -- No jobs available
  END IF;
  
  -- Calculate new attempts value (POST-INCREMENT)
  v_new_attempts := v_job.attempts + 1;
  
  -- Claim the job: set status, started_at, increment attempts
  UPDATE background_jobs
  SET status = 'processing', 
      started_at = now(), 
      attempts = v_new_attempts
  WHERE background_jobs.id = v_job.id;
  
  -- Return POST-INCREMENT attempts + max_attempts for retry logic in Python
  RETURN QUERY SELECT v_job.id, v_job.payload, v_new_attempts, v_job.max_attempts;
END;
$$;

COMMENT ON FUNCTION claim_stealthy_crawl_job() IS 
  'Atomically claims next pending stealthy_crawl job. 
   Returns {id, payload, attempts (post-increment), max_attempts} or empty if none.
   Uses FOR UPDATE SKIP LOCKED to prevent race conditions.';

GRANT EXECUTE ON FUNCTION claim_stealthy_crawl_job() TO service_role;

-- ============================================================================
-- 3. RPC: get_unprocessed_stealthy_crawls()
-- ============================================================================
CREATE OR REPLACE FUNCTION get_unprocessed_stealthy_crawls(limit_count INT DEFAULT 5)
RETURNS TABLE(id UUID, payload JSONB, result JSONB)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bj.id, bj.payload, bj.result 
  FROM background_jobs bj
  WHERE bj.job_type = 'stealthy_crawl' 
    AND bj.status = 'completed'
    AND bj.result IS NOT NULL
    -- Check _processed is NULL or false (handles missing key AND explicit false)
    AND (bj.result->>'_processed' IS NULL OR bj.result->>'_processed' = 'false')
  ORDER BY bj.completed_at ASC 
  LIMIT limit_count;
$$;

COMMENT ON FUNCTION get_unprocessed_stealthy_crawls(INT) IS 
  'Returns completed stealthy_crawl jobs where result._processed is null/false.
   Used by TypeScript processor cron to find jobs needing AI extraction.
   Filter: status=completed AND result IS NOT NULL AND _processed IS NULL/false.';

GRANT EXECUTE ON FUNCTION get_unprocessed_stealthy_crawls(INT) TO service_role;

-- ============================================================================
-- 4. MODIFY process_next_background_job() - EXCLUDE stealthy_crawl
-- ============================================================================
CREATE OR REPLACE FUNCTION process_next_background_job()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job RECORD;
  v_api_url TEXT;
  v_secret TEXT;
  v_request_id BIGINT;
BEGIN
  SELECT decrypted_secret INTO v_api_url
  FROM vault.decrypted_secrets WHERE name = 'JOB_RUNNER_API_URL';
  
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets WHERE name = 'JOB_RUNNER_SECRET';
  
  IF v_api_url IS NULL OR v_secret IS NULL THEN
    RAISE NOTICE 'Job runner not configured.';
    RETURN;
  END IF;
  
  -- Handle stuck jobs (EXCLUDE stealthy_crawl - Python manages its own timeouts)
  UPDATE background_jobs SET status = 'failed', last_error = 'Job timed out after 30 minutes', completed_at = now()
  WHERE status = 'processing' AND started_at < now() - INTERVAL '30 minutes'
    AND job_type != 'stealthy_crawl';
  
  -- Find next job, EXCLUDING stealthy_crawl (handled by Python worker)
  SELECT * INTO v_job
  FROM background_jobs
  WHERE status = 'pending'
    AND job_type != 'stealthy_crawl'
    AND (next_retry_at IS NULL OR next_retry_at <= now())
    AND (scheduled_for IS NULL OR scheduled_for <= now())
    AND NOT EXISTS (
      SELECT 1 FROM background_jobs other
      WHERE other.job_type = background_jobs.job_type AND other.status = 'processing'
    )
  ORDER BY created_at ASC LIMIT 1
  FOR UPDATE SKIP LOCKED;
  
  IF v_job IS NULL THEN RETURN; END IF;
  
  UPDATE background_jobs SET status = 'processing', started_at = now(), attempts = attempts + 1
  WHERE id = v_job.id;
  
  SELECT net.http_post(
    url := v_api_url || '/api/jobs/' || v_job.id || '/execute',
    headers := jsonb_build_object('Content-Type', 'application/json', 'X-Job-Runner-Secret', v_secret),
    body := '{}'::jsonb
  ) INTO v_request_id;
  
  RAISE NOTICE 'Dispatched job % (type: %, request_id: %)', v_job.id, v_job.job_type, v_request_id;
END;
$$;

COMMENT ON FUNCTION process_next_background_job() IS 
  'Modified to EXCLUDE stealthy_crawl from both job selection and stuck-job cleanup.
   Python worker manages stealthy_crawl jobs independently.';

-- ============================================================================
-- 5. CREATE dispatch_stealthy_crawl_processor() - Guarded Function
-- ============================================================================
CREATE OR REPLACE FUNCTION dispatch_stealthy_crawl_processor()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_api_url TEXT;
  v_secret TEXT;
  v_request_id BIGINT;
BEGIN
  SELECT decrypted_secret INTO v_api_url
  FROM vault.decrypted_secrets WHERE name = 'JOB_RUNNER_API_URL';
  
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets WHERE name = 'JOB_RUNNER_SECRET';
  
  IF v_api_url IS NULL OR v_secret IS NULL THEN
    RETURN;  -- Not configured, skip silently
  END IF;
  
  SELECT net.http_post(
    url := v_api_url || '/api/cron/process-stealthy-crawls',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Job-Runner-Secret', v_secret
    ),
    body := '{}'::jsonb
  ) INTO v_request_id;
END;
$$;

COMMENT ON FUNCTION dispatch_stealthy_crawl_processor() IS 
  'Dispatches TypeScript processor for completed stealthy_crawl jobs.
   Called by pg_cron every minute. Guarded - returns early if not configured.';

GRANT EXECUTE ON FUNCTION dispatch_stealthy_crawl_processor() TO service_role;

-- ============================================================================
-- 6. SCHEDULE pg_cron Job for TypeScript Processor
-- ============================================================================
-- Idempotent: unschedule first if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-stealthy-crawls') THEN
    PERFORM cron.unschedule('process-stealthy-crawls');
  END IF;
END $$;

-- Schedule: runs every minute
SELECT cron.schedule(
  'process-stealthy-crawls',
  '*/1 * * * *',
  'SELECT dispatch_stealthy_crawl_processor()'
);

COMMENT ON EXTENSION pg_cron IS 'Added schedule: process-stealthy-crawls (every 1 minute)';
