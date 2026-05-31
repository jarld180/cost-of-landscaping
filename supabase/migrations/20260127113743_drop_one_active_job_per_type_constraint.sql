-- Drop the unique constraint that prevents multiple active jobs per type
-- This allows concurrent enrichment jobs to be queued and processed
DROP INDEX IF EXISTS idx_one_active_job_per_type;
