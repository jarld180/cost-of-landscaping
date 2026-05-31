-- Migration: Create atomic job creation RPC function
-- This function creates a job and its initial log entry in a single transaction
-- ensuring data consistency

CREATE OR REPLACE FUNCTION create_background_job_with_log(
  p_job_type TEXT,
  p_payload JSONB DEFAULT '{}',
  p_created_by UUID DEFAULT NULL
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
  INSERT INTO background_jobs (job_type, payload, created_by)
  VALUES (p_job_type, p_payload, p_created_by)
  RETURNING id, background_jobs.created_at INTO v_job_id, v_created_at;

  -- Insert the initial system log entry (using correct column names)
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
    'activity',  -- Must be: activity, audit, or error
    'job',
    'job.created',
    'Job ' || p_job_type || ' created',
    'background_job',
    v_job_id,
    p_created_by,
    jsonb_build_object('job_type', p_job_type, 'payload', p_payload)
  );

  -- Return the created job info
  RETURN QUERY
  SELECT v_job_id, p_job_type, 'pending'::TEXT, v_created_at;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_background_job_with_log TO authenticated;
GRANT EXECUTE ON FUNCTION create_background_job_with_log TO service_role;

COMMENT ON FUNCTION create_background_job_with_log IS
  'Atomically creates a background job and its initial system log entry in a single transaction';

