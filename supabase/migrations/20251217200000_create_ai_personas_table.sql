-- =====================================================
-- AI Personas Table
-- =====================================================
-- Stores system prompts and configuration for each AI agent type.
-- Supports versioning, A/B testing, and model selection.

CREATE TABLE ai_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Agent identity
  agent_type TEXT NOT NULL CHECK (agent_type IN ('research', 'writer', 'seo', 'qa', 'project_manager')),
  name TEXT NOT NULL,
  description TEXT,
  
  -- Prompt configuration
  system_prompt TEXT NOT NULL,
  
  -- Model configuration
  provider TEXT NOT NULL DEFAULT 'anthropic' CHECK (provider IN ('anthropic', 'openai')),
  model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
  temperature NUMERIC(3, 2) DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
  max_tokens INTEGER DEFAULT 4096,
  
  -- Status
  is_default BOOLEAN DEFAULT FALSE,
  is_enabled BOOLEAN DEFAULT TRUE,
  
  -- Flexible metadata for additional settings
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_ai_personas_agent_type ON ai_personas(agent_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_ai_personas_is_default ON ai_personas(agent_type, is_default) WHERE deleted_at IS NULL AND is_default = true;

-- Comments
COMMENT ON TABLE ai_personas IS 'AI agent personas with system prompts and model configuration for the multi-agent article writing system';
COMMENT ON COLUMN ai_personas.agent_type IS 'Type of agent: research, writer, seo, qa, project_manager';
COMMENT ON COLUMN ai_personas.system_prompt IS 'Full system prompt sent to the LLM';
COMMENT ON COLUMN ai_personas.provider IS 'LLM provider: anthropic, openai';
COMMENT ON COLUMN ai_personas.model IS 'Model identifier (e.g., claude-sonnet-4-20250514, gpt-4o)';
COMMENT ON COLUMN ai_personas.is_default IS 'Default persona for this agent type (only one per type)';
COMMENT ON COLUMN ai_personas.metadata IS 'Additional configuration (stop sequences, tools, etc.)';

-- Enable RLS
ALTER TABLE ai_personas ENABLE ROW LEVEL SECURITY;

-- RLS Policies (admin-only for write, public read for enabled personas)
CREATE POLICY "Admin full access to ai_personas"
  ON ai_personas
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

-- Updated_at trigger function (specific to this table)
CREATE OR REPLACE FUNCTION update_ai_personas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Updated_at trigger
CREATE TRIGGER set_ai_personas_updated_at
  BEFORE UPDATE ON ai_personas
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_personas_updated_at();

