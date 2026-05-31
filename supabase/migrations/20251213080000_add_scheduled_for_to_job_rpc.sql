-- Migration: Add scheduled_for parameter to job creation RPC
-- Allows creating delayed jobs for rate-limit cooldown handling

-- Drop the old function first (different signature)
DROP FUNCTION IF EXISTS create_background_job_with_log(TEXT, JSONB, UUID);

CREATE OR REPLACE FUNCTION create_background_job_with_log(
  p_job_type TEXT,
  p_payload JSONB DEFAULT '{}',
  p_created_by UUID DEFAULT NULL,
  p_scheduled_for TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  job_id UUID,
  job_type TEXT,
  status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_id UUID;
  v_created_at TIMESTAMPTZ;
BEGIN
  -- Insert the job (unique constraint will prevent duplicates)
  INSERT INTO background_jobs (job_type, payload, created_by, scheduled_for)
  VALUES (p_job_type, p_payload, p_created_by, p_scheduled_for)
  RETURNING id, background_jobs.created_at INTO v_job_id, v_created_at;

  -- Insert the initial system log entry
  INSERT INTO system_logs (
    level,
    log_type,
    category,
    action,
    message,
    entity_type,
    entity_id,
    actor_id,
    metadata
  ) VALUES (
    'info',
    'activity',
    'job',
    'job.created',
    'Job ' || p_job_type || ' created' ||
      CASE WHEN p_scheduled_for IS NOT NULL
        THEN ' (scheduled for ' || p_scheduled_for::TEXT || ')'
        ELSE ''
      END,
    'background_job',
    v_job_id,
    p_created_by,
    jsonb_build_object(
      'job_type', p_job_type,
      'payload', p_payload,
      'scheduled_for', p_scheduled_for
    )
  );

  -- Return the created job info
  RETURN QUERY
  SELECT v_job_id, p_job_type, 'pending'::TEXT, v_created_at;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_background_job_with_log TO authenticated;
GRANT EXECUTE ON FUNCTION create_background_job_with_log TO service_role;

COMMENT ON FUNCTION create_background_job_with_log IS
  'Atomically creates a background job and its initial system log entry. Supports scheduled_for for delayed execution.';
