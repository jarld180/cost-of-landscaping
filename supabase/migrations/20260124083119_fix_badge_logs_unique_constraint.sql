DROP INDEX IF EXISTS idx_badge_embed_logs_hourly_unique;

ALTER TABLE badge_embed_logs
  ADD CONSTRAINT badge_embed_logs_hourly_unique 
  UNIQUE (contractor_id, request_ip, hour_bucket);
