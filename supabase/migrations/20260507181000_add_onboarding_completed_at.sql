-- Add onboarding completion tracking to account profiles

ALTER TABLE account_profiles
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

COMMENT ON COLUMN account_profiles.onboarding_completed_at IS 'Timestamp when the business owner completed the account-level onboarding flow.';
