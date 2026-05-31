-- Add parent_job_id column to support parent-child job relationships
-- This allows contractor_enrichment jobs to track their child stealthy_crawl jobs

ALTER TABLE background_jobs 
ADD COLUMN IF NOT EXISTS parent_job_id uuid REFERENCES background_jobs(id) ON DELETE SET NULL;

-- Index for efficient lookup of children by parent
CREATE INDEX IF NOT EXISTS idx_background_jobs_parent_job_id ON background_jobs(parent_job_id) 
WHERE parent_job_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN background_jobs.parent_job_id IS 'Reference to parent job for hierarchical job tracking (e.g., stealthy_crawl -> contractor_enrichment)';
