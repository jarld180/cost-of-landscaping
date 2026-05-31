-- =====================================================
-- Add claim tracking columns to contractors table
-- =====================================================
-- These columns track whether a contractor listing has been claimed
-- by a business owner and when/by whom

ALTER TABLE contractors
  ADD COLUMN IF NOT EXISTS is_claimed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS claimed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

-- Index for finding claimed/unclaimed contractors
CREATE INDEX IF NOT EXISTS idx_contractors_is_claimed ON contractors(is_claimed);
CREATE INDEX IF NOT EXISTS idx_contractors_claimed_by ON contractors(claimed_by) WHERE claimed_by IS NOT NULL;

-- Comments
COMMENT ON COLUMN contractors.is_claimed IS 'Whether this contractor listing has been claimed by a business owner';
COMMENT ON COLUMN contractors.claimed_by IS 'User ID of the business owner who claimed this listing';
COMMENT ON COLUMN contractors.claimed_at IS 'Timestamp when the listing was claimed';
