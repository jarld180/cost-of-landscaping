-- Add missing status column to account_profiles
-- This column is referenced by auth middleware but was never created

ALTER TABLE account_profiles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

COMMENT ON COLUMN account_profiles.status IS 'Account status (active, suspended, etc.)';

-- Create index for status lookups
CREATE INDEX IF NOT EXISTS idx_account_profiles_status ON account_profiles(status);
