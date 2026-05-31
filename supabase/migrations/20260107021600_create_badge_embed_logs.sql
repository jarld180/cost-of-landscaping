-- Create badge_embed_logs table for tracking badge embed requests
-- Used for verification and analytics

CREATE TABLE badge_embed_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  request_ip TEXT NOT NULL,
  referrer_url TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for looking up logs by contractor
CREATE INDEX idx_badge_embed_logs_contractor_id ON badge_embed_logs(contractor_id);

-- Index for time-based queries (analytics, cleanup)
CREATE INDEX idx_badge_embed_logs_created_at ON badge_embed_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE badge_embed_logs ENABLE ROW LEVEL SECURITY;

-- Admins have full access
CREATE POLICY "Admins have full access to badge_embed_logs"
  ON badge_embed_logs FOR ALL
  USING (EXISTS (SELECT 1 FROM account_profiles WHERE id = auth.uid() AND is_admin = true));

-- Owners can view their own contractor's embed logs
CREATE POLICY "Owners can view their contractor embed logs"
  ON badge_embed_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM contractors WHERE id = badge_embed_logs.contractor_id AND claimed_by = auth.uid()));
