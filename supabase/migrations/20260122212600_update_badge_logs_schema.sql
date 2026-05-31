-- Update badge_embed_logs schema for atomic hourly dedup
-- Adds columns for reduced PII storage and dedup grouping

-- 1) Add referrer_origin (stores scheme+host only, reduces PII)
ALTER TABLE badge_embed_logs
  ADD COLUMN IF NOT EXISTS referrer_origin TEXT;

-- 2) Add hour_bucket for dedup grouping (computed at insert time)
ALTER TABLE badge_embed_logs
  ADD COLUMN IF NOT EXISTS hour_bucket TIMESTAMP;

-- 3) Unique constraint for atomic hourly dedup (avoids SELECT-then-INSERT race)
-- Uses partial index to only apply when hour_bucket is set (new code path)
CREATE UNIQUE INDEX IF NOT EXISTS idx_badge_embed_logs_hourly_unique
  ON badge_embed_logs(contractor_id, request_ip, hour_bucket)
  WHERE hour_bucket IS NOT NULL;

COMMENT ON INDEX idx_badge_embed_logs_hourly_unique IS 'Atomic hourly IP dedup for badge logging';

-- 4) Query helper for analytics by contractor/time
CREATE INDEX IF NOT EXISTS idx_badge_embed_logs_contractor_time
  ON badge_embed_logs(contractor_id, created_at DESC);
