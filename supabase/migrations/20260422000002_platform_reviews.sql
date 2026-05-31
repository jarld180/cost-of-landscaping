-- =====================================================
-- Platform Reviews Migration
-- Extends reviews table to support user-submitted reviews
-- with email confirmation and internal fraud flagging.
-- =====================================================

-- 1. Make google_review_id nullable (Google reviews have it; platform reviews don't)
ALTER TABLE reviews ALTER COLUMN google_review_id DROP NOT NULL;

-- 2. Replace the unique constraint with a partial one (only enforce when not null)
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS unique_google_review;
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_unique_google
  ON reviews (contractor_id, google_review_id)
  WHERE google_review_id IS NOT NULL;

-- 3. Add platform review fields
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published'
    CHECK (status IN ('pending', 'published', 'flagged')),
  ADD COLUMN IF NOT EXISTS reviewer_email TEXT,
  ADD COLUMN IF NOT EXISTS reviewer_ip TEXT,
  ADD COLUMN IF NOT EXISTS confirm_token UUID,
  ADD COLUMN IF NOT EXISTS confirm_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fraud_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fraud_flags JSONB DEFAULT '[]'::jsonb;

-- Backfill: existing Google reviews are already published
UPDATE reviews SET status = 'published' WHERE google_review_id IS NOT NULL;

-- Index for pending review confirmations (token lookup)
CREATE INDEX IF NOT EXISTS idx_reviews_confirm_token ON reviews (confirm_token) WHERE confirm_token IS NOT NULL;
-- Index for fraud admin queries
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews (status);
CREATE INDEX IF NOT EXISTS idx_reviews_fraud_score ON reviews (contractor_id, fraud_score DESC) WHERE fraud_score > 0;

-- =====================================================
-- 4. Contractor-level fraud stats (admin visibility)
-- =====================================================
CREATE TABLE IF NOT EXISTS contractor_review_fraud_stats (
  contractor_id UUID PRIMARY KEY REFERENCES contractors(id) ON DELETE CASCADE,
  total_platform_reviews INTEGER DEFAULT 0,
  flagged_reviews INTEGER DEFAULT 0,
  same_ip_count INTEGER DEFAULT 0,
  same_email_domain_count INTEGER DEFAULT 0,
  velocity_flag BOOLEAN DEFAULT false,
  all_five_star_flag BOOLEAN DEFAULT false,
  fraud_risk TEXT NOT NULL DEFAULT 'low' CHECK (fraud_risk IN ('low', 'medium', 'high')),
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contractor_review_fraud_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read fraud stats"
  ON contractor_review_fraud_stats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM account_profiles
      WHERE account_profiles.id = auth.uid()
      AND account_profiles.is_admin = true
    )
  );

-- Service role (used by API) can do anything
CREATE POLICY "Service role full access to fraud stats"
  ON contractor_review_fraud_stats FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- 5. Update public RLS policy on reviews
-- Only published reviews are visible publicly
-- (google_review_id IS NOT NULL = legacy Google reviews, always published)
-- =====================================================
DROP POLICY IF EXISTS "Public can view reviews for active contractors" ON reviews;

CREATE POLICY "Public can view published reviews for active contractors"
  ON reviews FOR SELECT
  USING (
    status = 'published'
    AND EXISTS (
      SELECT 1 FROM contractors c
      WHERE c.id = reviews.contractor_id
        AND c.status = 'active'
        AND c.deleted_at IS NULL
    )
  );

-- Service role can bypass RLS (for submit/confirm/fraud APIs)
CREATE POLICY "Service role full access to reviews"
  ON reviews FOR ALL
  USING (auth.role() = 'service_role');
