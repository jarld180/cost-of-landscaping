-- =====================================================
-- Create business_claims table for contractor ownership verification
-- =====================================================
-- This table tracks business ownership claims from contractors who want to
-- manage their listings. It includes email verification and account activation flows.

CREATE TABLE IF NOT EXISTS business_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Contractor being claimed
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  
  -- Claimant information
  claimant_name TEXT,
  claimant_email TEXT NOT NULL,
  claimant_phone TEXT,
  claimant_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Claim status workflow
  status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (status IN ('unverified', 'pending', 'approved', 'rejected', 'completed')),
  
  -- Email verification
  email_verification_token TEXT,
  email_verification_expires_at TIMESTAMPTZ,
  email_verified_at TIMESTAMPTZ,
  verification_method TEXT,
  
  -- Account activation (after admin approval)
  account_activation_token TEXT,
  account_activation_expires_at TIMESTAMPTZ,
  account_activated_at TIMESTAMPTZ,
  
  -- Admin review
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE business_claims ENABLE ROW LEVEL SECURITY;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_business_claims_contractor_id ON business_claims(contractor_id);
CREATE INDEX IF NOT EXISTS idx_business_claims_claimant_email ON business_claims(claimant_email);
CREATE INDEX IF NOT EXISTS idx_business_claims_status ON business_claims(status);
CREATE INDEX IF NOT EXISTS idx_business_claims_email_verification_token ON business_claims(email_verification_token) WHERE email_verification_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_business_claims_account_activation_token ON business_claims(account_activation_token) WHERE account_activation_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_business_claims_claimant_user_id ON business_claims(claimant_user_id) WHERE claimant_user_id IS NOT NULL;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_business_claims_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_business_claims_updated_at
  BEFORE UPDATE ON business_claims
  FOR EACH ROW
  EXECUTE FUNCTION update_business_claims_updated_at();

-- Comments
COMMENT ON TABLE business_claims IS 'Tracks business ownership claims for contractor listings';
COMMENT ON COLUMN business_claims.status IS 'Claim workflow status: unverified (initial), pending (email verified, awaiting review), approved (admin approved), rejected (admin rejected), completed (account activated)';
COMMENT ON COLUMN business_claims.email_verification_token IS 'Token sent to claimant email for verification';
COMMENT ON COLUMN business_claims.account_activation_token IS 'Token sent after admin approval to set up account';

-- RLS Policies

-- Admins can do everything
CREATE POLICY "Admins can manage all claims"
  ON business_claims FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM account_profiles
      WHERE account_profiles.id = auth.uid()
        AND account_profiles.is_admin = TRUE
    )
  );

-- Users can view their own claims
CREATE POLICY "Users can view own claims"
  ON business_claims FOR SELECT
  USING (claimant_user_id = auth.uid());

-- Public can insert claims (for initial submission)
CREATE POLICY "Public can submit claims"
  ON business_claims FOR INSERT
  WITH CHECK (true);

-- Public can read claims by token (for verification/activation pages)
CREATE POLICY "Public can read claims by verification token"
  ON business_claims FOR SELECT
  USING (
    email_verification_token IS NOT NULL 
    OR account_activation_token IS NOT NULL
  );
