-- =====================================================
-- Migration: Add scheduled_for to background_jobs + downloaded_reviewer_photo_url to reviews
-- Description: Enables delayed job execution for rate-limit retry queuing
--              and stores downloaded reviewer profile images
-- =====================================================

-- =====================================================
-- 1. Add scheduled_for to background_jobs
-- =====================================================

ALTER TABLE background_jobs
ADD COLUMN scheduled_for TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN background_jobs.scheduled_for IS 
'Job will not execute until this time. NULL = execute immediately. Used for rate-limit cooldown retry queuing.';

-- Index for efficient querying of schedulable jobs
CREATE INDEX idx_background_jobs_scheduled_for 
ON background_jobs (scheduled_for)
WHERE status = 'pending';

-- =====================================================
-- 2. Add downloaded_reviewer_photo_url to reviews
-- =====================================================

ALTER TABLE reviews
ADD COLUMN downloaded_reviewer_photo_url TEXT DEFAULT NULL;

COMMENT ON COLUMN reviews.downloaded_reviewer_photo_url IS 
'Storage path for downloaded reviewer profile photo. NULL = not yet downloaded or failed. Original URL preserved in reviewer_photo_url.';

-- =====================================================
-- 3. Update job runner to respect scheduled_for
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
    -- NEW: Respect scheduled_for for delayed job execution (rate-limit cooldowns)
    AND (scheduled_for IS NULL OR scheduled_for <= now())
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

COMMENT ON FUNCTION process_next_background_job() IS 'Finds and dispatches the next pending background job. Called by pg_cron every 15 seconds. Respects scheduled_for for delayed execution.';

