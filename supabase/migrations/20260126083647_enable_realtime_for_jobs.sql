-- Enable Supabase Realtime for background jobs monitoring
-- This allows real-time subscriptions to job status changes and log insertions

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE background_jobs, system_logs;

-- Enable REPLICA IDENTITY FULL for background_jobs
-- This allows UPDATE events to include old record values (needed for proper state tracking)
ALTER TABLE background_jobs REPLICA IDENTITY FULL;

-- Note: system_logs doesn't need REPLICA IDENTITY FULL because we only subscribe to INSERTs
