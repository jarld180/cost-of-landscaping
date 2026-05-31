-- =====================================================
-- Migration: Create background_jobs table
-- Description: Generic job queue for background processing
-- Supports retry logic, progress tracking, and multiple job types
-- =====================================================

-- Create background_jobs table
CREATE TABLE background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Job identification
  job_type TEXT NOT NULL,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  
  -- Retry handling
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  
  -- Progress tracking
  total_items INTEGER,
  processed_items INTEGER NOT NULL DEFAULT 0,
  failed_items INTEGER NOT NULL DEFAULT 0,
  
  -- Job data (flexible JSONB)
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB,
  
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Actor (who created this job)
  created_by UUID REFERENCES auth.users(id)
);

-- Add comments for documentation
COMMENT ON TABLE background_jobs IS 'Generic background job queue supporting multiple job types with retry logic and progress tracking.';
COMMENT ON COLUMN background_jobs.job_type IS 'Type of job (e.g., image_enrichment, ai_contractor_enrichment, page_generation)';
COMMENT ON COLUMN background_jobs.status IS 'Job status: pending, processing, completed, failed, cancelled';
COMMENT ON COLUMN background_jobs.attempts IS 'Number of execution attempts made';
COMMENT ON COLUMN background_jobs.max_attempts IS 'Maximum retry attempts before marking as failed (default: 3)';
COMMENT ON COLUMN background_jobs.next_retry_at IS 'When to retry after a failure (exponential backoff)';
COMMENT ON COLUMN background_jobs.last_error IS 'Error message from the most recent failure';
COMMENT ON COLUMN background_jobs.total_items IS 'Total items to process (for progress calculation)';
COMMENT ON COLUMN background_jobs.processed_items IS 'Number of items successfully processed';
COMMENT ON COLUMN background_jobs.failed_items IS 'Number of items that failed processing';
COMMENT ON COLUMN background_jobs.payload IS 'Job input parameters (JSONB)';
COMMENT ON COLUMN background_jobs.result IS 'Job output/summary data (JSONB)';
COMMENT ON COLUMN background_jobs.created_by IS 'User who initiated the job';

-- =====================================================
-- Indexes
-- =====================================================

-- Find pending jobs ready to run (status = pending AND next_retry_at is null or past)
CREATE INDEX idx_background_jobs_pending ON background_jobs(job_type, created_at)
  WHERE status = 'pending';

-- Find processing jobs (for stuck job detection)
CREATE INDEX idx_background_jobs_processing ON background_jobs(started_at)
  WHERE status = 'processing';

-- List jobs by creation date
CREATE INDEX idx_background_jobs_created_at ON background_jobs(created_at DESC);

-- Filter by status for admin dashboard
CREATE INDEX idx_background_jobs_status ON background_jobs(status, created_at DESC);

-- =====================================================
-- Triggers
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_background_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_background_jobs_updated_at
  BEFORE UPDATE ON background_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_background_jobs_updated_at();

-- =====================================================
-- Row Level Security
-- =====================================================

-- Enable RLS
ALTER TABLE background_jobs ENABLE ROW LEVEL SECURITY;

-- Admin-only read policy
CREATE POLICY "Admin users can read background jobs"
  ON background_jobs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM account_profiles
      WHERE account_profiles.id = auth.uid()
      AND account_profiles.account_type = 'admin'
    )
  );

-- Admin-only insert policy
CREATE POLICY "Admin users can create background jobs"
  ON background_jobs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM account_profiles
      WHERE account_profiles.id = auth.uid()
      AND account_profiles.account_type = 'admin'
    )
  );

-- Admin-only update policy
CREATE POLICY "Admin users can update background jobs"
  ON background_jobs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM account_profiles
      WHERE account_profiles.id = auth.uid()
      AND account_profiles.account_type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM account_profiles
      WHERE account_profiles.id = auth.uid()
      AND account_profiles.account_type = 'admin'
    )
  );

-- Admin-only delete policy
CREATE POLICY "Admin users can delete background jobs"
  ON background_jobs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM account_profiles
      WHERE account_profiles.id = auth.uid()
      AND account_profiles.account_type = 'admin'
    )
  );

