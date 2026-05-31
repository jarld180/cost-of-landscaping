-- =====================================================
-- AI Article Job Steps Table
-- =====================================================
-- Detailed log of each agent execution within a job.
-- Used for Agent Rooms UI to show verbose progress.

CREATE TABLE ai_article_job_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Parent job reference
  job_id UUID NOT NULL REFERENCES ai_article_jobs(id) ON DELETE CASCADE,
  
  -- Agent info
  agent_type TEXT NOT NULL CHECK (agent_type IN ('research', 'writer', 'seo', 'qa', 'project_manager')),
  persona_id UUID REFERENCES ai_personas(id),
  
  -- Iteration (for QA loops)
  iteration INTEGER DEFAULT 1,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
  
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  
  -- Input/Output
  input JSONB,
  output JSONB,
  
  -- Token tracking
  tokens_used INTEGER DEFAULT 0,
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  
  -- Verbose logs for Agent Room display
  logs JSONB DEFAULT '[]'::jsonb,
  -- Logs structure: [{ "timestamp": "...", "level": "info|warn|error", "message": "..." }]
  
  -- Error info
  error_message TEXT,
  error_details JSONB,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_ai_job_steps_job_id ON ai_article_job_steps(job_id);
CREATE INDEX idx_ai_job_steps_agent_type ON ai_article_job_steps(job_id, agent_type);
CREATE INDEX idx_ai_job_steps_status ON ai_article_job_steps(status) WHERE status IN ('pending', 'running');

-- Comments
COMMENT ON TABLE ai_article_job_steps IS 'Individual agent execution steps within an article job';
COMMENT ON COLUMN ai_article_job_steps.job_id IS 'Parent article job';
COMMENT ON COLUMN ai_article_job_steps.agent_type IS 'Type of agent that executed this step';
COMMENT ON COLUMN ai_article_job_steps.persona_id IS 'Persona used for this step';
COMMENT ON COLUMN ai_article_job_steps.iteration IS 'Iteration number (for QA feedback loops)';
COMMENT ON COLUMN ai_article_job_steps.input IS 'Input data provided to the agent';
COMMENT ON COLUMN ai_article_job_steps.output IS 'Structured output from the agent';
COMMENT ON COLUMN ai_article_job_steps.logs IS 'Verbose log entries for Agent Room display';
COMMENT ON COLUMN ai_article_job_steps.duration_ms IS 'Execution time in milliseconds';

-- Enable RLS
ALTER TABLE ai_article_job_steps ENABLE ROW LEVEL SECURITY;

-- RLS Policies (admin-only)
CREATE POLICY "Admin full access to ai_article_job_steps"
  ON ai_article_job_steps
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
CREATE OR REPLACE FUNCTION update_ai_article_job_steps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Updated_at trigger
CREATE TRIGGER set_ai_article_job_steps_updated_at
  BEFORE UPDATE ON ai_article_job_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_article_job_steps_updated_at();

