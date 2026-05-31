-- =====================================================
-- AI Prompt Versions Table
-- =====================================================
-- Tracks prompt versions for A/B testing and rollback.
-- Linked to personas for version history.

CREATE TABLE ai_prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Parent persona
  persona_id UUID NOT NULL REFERENCES ai_personas(id) ON DELETE CASCADE,
  
  -- Version info
  version INTEGER NOT NULL,
  
  -- The prompt content
  system_prompt TEXT NOT NULL,
  
  -- A/B testing
  is_primary BOOLEAN DEFAULT FALSE,
  is_challenger BOOLEAN DEFAULT FALSE,
  traffic_split INTEGER DEFAULT 0 CHECK (traffic_split >= 0 AND traffic_split <= 100),
  -- traffic_split: percentage of traffic to this version (0-100)
  
  -- Performance metrics (updated periodically)
  total_uses INTEGER DEFAULT 0,
  avg_eval_score NUMERIC(5, 2),
  pass_rate NUMERIC(5, 2),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  
  -- When this version was promoted/demoted
  promoted_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  
  -- Notes for version history
  change_notes TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Flexible metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Unique version per persona
  UNIQUE (persona_id, version)
);

-- Indexes
CREATE INDEX idx_ai_prompt_versions_persona ON ai_prompt_versions(persona_id);
CREATE INDEX idx_ai_prompt_versions_primary ON ai_prompt_versions(persona_id, is_primary) WHERE is_primary = true;
CREATE INDEX idx_ai_prompt_versions_status ON ai_prompt_versions(status) WHERE status = 'active';

-- Comments
COMMENT ON TABLE ai_prompt_versions IS 'Version history for AI persona prompts with A/B testing support';
COMMENT ON COLUMN ai_prompt_versions.persona_id IS 'Parent persona this version belongs to';
COMMENT ON COLUMN ai_prompt_versions.version IS 'Version number (auto-incremented per persona)';
COMMENT ON COLUMN ai_prompt_versions.is_primary IS 'Primary version receiving most traffic';
COMMENT ON COLUMN ai_prompt_versions.is_challenger IS 'Challenger version for A/B testing';
COMMENT ON COLUMN ai_prompt_versions.traffic_split IS 'Percentage of traffic to this version';
COMMENT ON COLUMN ai_prompt_versions.avg_eval_score IS 'Average evaluation score across uses';
COMMENT ON COLUMN ai_prompt_versions.pass_rate IS 'Percentage of uses that passed QA';
COMMENT ON COLUMN ai_prompt_versions.change_notes IS 'Notes about what changed in this version';

-- Enable RLS
ALTER TABLE ai_prompt_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (admin-only)
CREATE POLICY "Admin full access to ai_prompt_versions"
  ON ai_prompt_versions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM account_profiles
      WHERE account_profiles.id = auth.uid()
      AND account_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM account_profiles
      WHERE account_profiles.id = auth.uid()
      AND account_profiles.is_admin = true
    )
  );

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_ai_prompt_versions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Updated_at trigger
CREATE TRIGGER set_ai_prompt_versions_updated_at
  BEFORE UPDATE ON ai_prompt_versions
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_prompt_versions_updated_at();

