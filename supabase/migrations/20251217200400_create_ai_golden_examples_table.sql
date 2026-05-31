-- =====================================================
-- AI Golden Examples Table
-- =====================================================
-- Stores high-quality examples for few-shot learning.
-- Promoted from successful articles with high eval scores.

CREATE TABLE ai_golden_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Agent this example is for
  agent_type TEXT NOT NULL CHECK (agent_type IN ('research', 'writer', 'seo', 'qa', 'project_manager')),
  
  -- Example content
  title TEXT NOT NULL,
  description TEXT,
  
  -- The actual example content
  input_example JSONB NOT NULL,
  output_example JSONB NOT NULL,
  
  -- Source reference (optional - may be manually created)
  source_job_id UUID REFERENCES ai_article_jobs(id) ON DELETE SET NULL,
  source_step_id UUID REFERENCES ai_article_job_steps(id) ON DELETE SET NULL,
  
  -- Quality indicators
  quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
  
  -- Tags for categorization and similarity search
  tags TEXT[] DEFAULT '{}',
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Limit active examples per agent type (soft limit enforced in app)
  -- max 5 active per agent_type
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ,
  
  -- Flexible metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX idx_ai_golden_examples_agent_type ON ai_golden_examples(agent_type) WHERE deleted_at IS NULL AND is_active = true;
CREATE INDEX idx_ai_golden_examples_tags ON ai_golden_examples USING gin(tags) WHERE deleted_at IS NULL;
CREATE INDEX idx_ai_golden_examples_quality ON ai_golden_examples(quality_score DESC) WHERE deleted_at IS NULL AND is_active = true;

-- Comments
COMMENT ON TABLE ai_golden_examples IS 'High-quality examples for few-shot learning in AI agents';
COMMENT ON COLUMN ai_golden_examples.agent_type IS 'Type of agent this example is for';
COMMENT ON COLUMN ai_golden_examples.input_example IS 'Example input that was provided to the agent';
COMMENT ON COLUMN ai_golden_examples.output_example IS 'High-quality output that the agent produced';
COMMENT ON COLUMN ai_golden_examples.source_job_id IS 'Original job this example came from';
COMMENT ON COLUMN ai_golden_examples.quality_score IS 'Quality score from evaluation';
COMMENT ON COLUMN ai_golden_examples.tags IS 'Tags for categorization (e.g., topic, style)';
COMMENT ON COLUMN ai_golden_examples.usage_count IS 'How many times this example has been used';

-- Enable RLS
ALTER TABLE ai_golden_examples ENABLE ROW LEVEL SECURITY;

-- RLS Policies (admin-only)
CREATE POLICY "Admin full access to ai_golden_examples"
  ON ai_golden_examples
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
CREATE OR REPLACE FUNCTION update_ai_golden_examples_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Updated_at trigger
CREATE TRIGGER set_ai_golden_examples_updated_at
  BEFORE UPDATE ON ai_golden_examples
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_golden_examples_updated_at();

