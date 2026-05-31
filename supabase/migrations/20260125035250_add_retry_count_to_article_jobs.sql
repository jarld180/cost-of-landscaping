-- Add retry_count column to ai_article_jobs for tracking retry attempts
-- This enables retry functionality for failed/cancelled jobs

ALTER TABLE ai_article_jobs 
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0;

-- Add index for querying jobs by retry count (useful for monitoring/analytics)
CREATE INDEX IF NOT EXISTS idx_ai_article_jobs_retry_count 
  ON ai_article_jobs (retry_count) 
  WHERE retry_count > 0;

COMMENT ON COLUMN ai_article_jobs.retry_count IS 'Number of times this job has been retried after failure/cancellation';
