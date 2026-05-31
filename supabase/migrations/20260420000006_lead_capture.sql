-- Migration: Lead Capture
-- Stores contact form submissions from contractor profile pages.

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  project_details TEXT,
  project_type TEXT,
  city TEXT,
  state_code TEXT,
  source TEXT NOT NULL DEFAULT 'contractor_profile',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS leads_contractor_id_idx ON leads (contractor_id);
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS leads_source_idx ON leads (source);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Admins can read all leads
CREATE POLICY "Admins read all leads"
  ON leads FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM account_profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Public can insert (submit contact forms)
CREATE POLICY "Public can submit leads"
  ON leads FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Owners can see leads for their claimed contractors
CREATE POLICY "Owners see own contractor leads"
  ON leads FOR SELECT TO authenticated
  USING (
    contractor_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM contractors
      WHERE contractors.id = leads.contractor_id
        AND contractors.claimed_by = auth.uid()
        AND contractors.is_claimed = true
    )
  );
