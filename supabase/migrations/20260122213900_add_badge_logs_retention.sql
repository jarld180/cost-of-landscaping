-- Automated log retention for badge_embed_logs
-- Keeps the table bounded by deleting rows older than 90 days

-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function to prune old badge embed logs
CREATE OR REPLACE FUNCTION prune_badge_embed_logs(retention_days INT DEFAULT 90)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM badge_embed_logs
  WHERE created_at < NOW() - make_interval(days => retention_days);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION prune_badge_embed_logs IS 'Deletes badge embed logs older than retention_days (default 90)';

-- Schedule daily pruning at 03:00 UTC
SELECT cron.schedule(
  'prune-badge-embed-logs-daily',
  '0 3 * * *',
  $$ SELECT prune_badge_embed_logs(90); $$
);
