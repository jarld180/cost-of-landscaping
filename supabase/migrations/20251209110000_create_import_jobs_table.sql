-- =====================================================
-- Migration: Create import_jobs table
-- Description: Database-backed job queue for batch contractor imports
-- Follows the pending_images pattern for async processing
-- =====================================================

-- Create import_jobs table
CREATE TABLE import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Job metadata
  filename TEXT,
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  
  -- Progress tracking
  total_rows INTEGER NOT NULL DEFAULT 0,
  processed_rows INTEGER NOT NULL DEFAULT 0,
  imported_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  skipped_claimed_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  pending_image_count INTEGER NOT NULL DEFAULT 0,
  
  -- Raw data storage (JSONB for flexibility)
  -- Stores array of Apify rows for processing
  raw_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Error details (array of {row, placeId, message})
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Processing timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Add comment for documentation
COMMENT ON TABLE import_jobs IS 'Batch import job queue for contractor imports. Stores raw Apify JSON and tracks processing progress.';
COMMENT ON COLUMN import_jobs.raw_data IS 'Array of Apify rows to process. Rows are processed in order by index.';
COMMENT ON COLUMN import_jobs.errors IS 'Array of error objects: {row: number, placeId: string|null, message: string}';

-- =====================================================
-- Indexes
-- =====================================================

-- Status filtering (find pending/processing jobs)
CREATE INDEX idx_import_jobs_status ON import_jobs(status)
  WHERE status IN ('pending', 'processing');

-- Cleanup query (find old completed jobs)
CREATE INDEX idx_import_jobs_completed_at ON import_jobs(completed_at)
  WHERE status = 'completed';

-- Created at for listing
CREATE INDEX idx_import_jobs_created_at ON import_jobs(created_at DESC);

-- =====================================================
-- Triggers
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_import_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_import_jobs_updated_at
  BEFORE UPDATE ON import_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_import_jobs_updated_at();

-- =====================================================
-- Row Level Security
-- =====================================================

-- Enable RLS
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;

-- Admin-only read policy
CREATE POLICY "Admin users can read import jobs"
  ON import_jobs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM account_profiles
      WHERE account_profiles.id = auth.uid()
      AND account_profiles.account_type = 'admin'
    )
  );

-- Admin-only insert policy
CREATE POLICY "Admin users can create import jobs"
  ON import_jobs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM account_profiles
      WHERE account_profiles.id = auth.uid()
      AND account_profiles.account_type = 'admin'
    )
  );

-- Admin-only update policy
CREATE POLICY "Admin users can update import jobs"
  ON import_jobs
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

-- Admin-only delete policy (for cleanup)
CREATE POLICY "Admin users can delete import jobs"
  ON import_jobs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM account_profiles
      WHERE account_profiles.id = auth.uid()
      AND account_profiles.account_type = 'admin'
    )
  );

