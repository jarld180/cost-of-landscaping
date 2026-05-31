-- =====================================================
-- Migration: Create pg_cron job runner
-- Description: Scheduled function to process background jobs
-- Runs every 15 seconds, respects concurrency limits
-- =====================================================

-- Ensure pg_cron extension is enabled
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- =====================================================
-- Job Runner Function
-- =====================================================

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
  -- Get configuration from vault (set these via Supabase dashboard)
  -- JOB_RUNNER_API_URL: Your Nuxt API base URL (e.g., https://yourapp.com)
  -- JOB_RUNNER_SECRET: Shared secret for authenticating job execution requests

  SELECT decrypted_secret INTO v_api_url
  FROM vault.decrypted_secrets
  WHERE name = 'JOB_RUNNER_API_URL';

  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'JOB_RUNNER_SECRET';

  -- Skip if not configured
  IF v_api_url IS NULL OR v_secret IS NULL THEN
    RAISE NOTICE 'Job runner not configured. Set JOB_RUNNER_API_URL and JOB_RUNNER_SECRET in vault.';
    RETURN;
  END IF;

  -- Handle stuck jobs (processing for > 30 minutes)
  UPDATE background_jobs
  SET
    status = 'failed',
    last_error = 'Job timed out after 30 minutes',
    completed_at = now()
  WHERE status = 'processing'
    AND started_at < now() - INTERVAL '30 minutes';

  -- Find next pending job, respecting one-per-type concurrency
  -- Uses FOR UPDATE SKIP LOCKED to prevent race conditions
  SELECT * INTO v_job
  FROM background_jobs
  WHERE status = 'pending'
    AND (next_retry_at IS NULL OR next_retry_at <= now())
    -- Ensure no other job of same type is processing
    AND NOT EXISTS (
      SELECT 1 FROM background_jobs other
      WHERE other.job_type = background_jobs.job_type
        AND other.status = 'processing'
    )
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- No pending jobs found
  IF v_job IS NULL THEN
    RETURN;
  END IF;

  -- Mark job as processing
  UPDATE background_jobs
  SET
    status = 'processing',
    started_at = now(),
    attempts = attempts + 1
  WHERE id = v_job.id;

  -- Call the API endpoint to execute the job
  -- Uses pg_net for async HTTP requests
  SELECT net.http_post(
    url := v_api_url || '/api/jobs/' || v_job.id || '/execute',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Job-Runner-Secret', v_secret
    ),
    body := '{}'::jsonb
  ) INTO v_request_id;

  RAISE NOTICE 'Dispatched job % (type: %, request_id: %)', v_job.id, v_job.job_type, v_request_id;
END;
$$;

COMMENT ON FUNCTION process_next_background_job() IS 'Finds and dispatches the next pending background job. Called by pg_cron every 15 seconds.';

-- =====================================================
-- Schedule the job runner (every 15 seconds)
-- =====================================================

-- Note: pg_cron minimum interval is 1 minute for standard schedules
-- For 15-second intervals, we schedule 4 jobs offset by 15 seconds each
-- Each job runs once per minute, but offset so overall we get 15-second coverage

-- Remove existing schedules if re-running migration
SELECT cron.unschedule('process_background_jobs_0') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process_background_jobs_0'
);
SELECT cron.unschedule('process_background_jobs_15') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process_background_jobs_15'
);
SELECT cron.unschedule('process_background_jobs_30') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process_background_jobs_30'
);
SELECT cron.unschedule('process_background_jobs_45') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process_background_jobs_45'
);

-- Schedule at :00 seconds (every minute)
SELECT cron.schedule(
  'process_background_jobs_0',
  '* * * * *',
  $$SELECT process_next_background_job()$$
);

-- Schedule at :15 seconds (using pg_sleep workaround)
SELECT cron.schedule(
  'process_background_jobs_15',
  '* * * * *',
  $$SELECT pg_sleep(15); SELECT process_next_background_job()$$
);

-- Schedule at :30 seconds
SELECT cron.schedule(
  'process_background_jobs_30',
  '* * * * *',
  $$SELECT pg_sleep(30); SELECT process_next_background_job()$$
);

-- Schedule at :45 seconds
SELECT cron.schedule(
  'process_background_jobs_45',
  '* * * * *',
  $$SELECT pg_sleep(45); SELECT process_next_background_job()$$
);

-- =====================================================
-- Vault Secrets Setup Instructions
-- =====================================================
-- After running this migration, set these secrets in Supabase Dashboard:
-- Project Settings > Vault > New Secret
--
-- 1. JOB_RUNNER_API_URL
--    Value: Your production API URL (e.g., https://costofconcrete.com)
--    Description: Base URL for the Nuxt API that processes background jobs
--
-- 2. JOB_RUNNER_SECRET
--    Value: Generate with: openssl rand -hex 32
--    Description: Shared secret for authenticating job execution requests
--
-- The pg_cron function will not dispatch jobs until these secrets are configured.

