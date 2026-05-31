-- =====================================================
-- Migration: Add job concurrency constraint
-- Description: Enforce one active job per type at database level
-- This prevents race conditions in job creation
-- =====================================================

-- Create unique partial index to enforce one active job per type
-- This covers both 'pending' and 'processing' statuses
-- The constraint is enforced atomically by the database
CREATE UNIQUE INDEX idx_one_active_job_per_type 
  ON background_jobs(job_type) 
  WHERE status IN ('pending', 'processing');

-- Add comment for documentation
COMMENT ON INDEX idx_one_active_job_per_type IS 
  'Enforces that only one job of each type can be pending or processing at a time. Prevents race conditions in job creation.';

