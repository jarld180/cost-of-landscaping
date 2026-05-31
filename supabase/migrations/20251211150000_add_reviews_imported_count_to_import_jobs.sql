-- Add reviews_imported_count column to import_jobs table
ALTER TABLE import_jobs
ADD COLUMN reviews_imported_count integer NOT NULL DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN import_jobs.reviews_imported_count IS 'Total number of reviews imported during this job';

