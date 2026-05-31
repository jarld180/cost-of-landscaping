-- =====================================================
-- AI Article Jobs Table
-- =====================================================
-- Tracks article generation jobs through the multi-agent pipeline.
-- Each job represents a single article being generated from a keyword.

CREATE TABLE ai_article_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Input
  keyword TEXT NOT NULL,
  
  -- Pipeline configuration
  settings JSONB DEFAULT '{}'::jsonb,
  -- Settings structure:
  -- {
  --   "autoPost": false,
  --   "targetWordCount": 1500,
  --   "maxQaIterations": 2,
  --   "pipelineConfig": ["research", "writer", "seo", "qa", "project_manager"]
  -- }
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  current_agent TEXT CHECK (current_agent IN ('research', 'writer', 'seo', 'qa', 'project_manager')),
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  
  -- Iteration tracking (for QA feedback loops)
  current_iteration INTEGER DEFAULT 1,
  max_iterations INTEGER DEFAULT 3,
  
  -- Token usage tracking
  total_tokens_used INTEGER DEFAULT 0,
  estimated_cost_usd NUMERIC(10, 6) DEFAULT 0,
  
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Output reference
  page_id UUID REFERENCES pages(id),
  
  -- Final structured output (aggregated from all agents)
  final_output JSONB,
  
  -- Error tracking
  last_error TEXT,
  
  -- Priority for queue ordering
  priority INTEGER DEFAULT 0,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Flexible metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX idx_ai_article_jobs_status ON ai_article_jobs(status) WHERE status IN ('pending', 'processing');
CREATE INDEX idx_ai_article_jobs_created_by ON ai_article_jobs(created_by);
CREATE INDEX idx_ai_article_jobs_keyword ON ai_article_jobs(keyword);
CREATE INDEX idx_ai_article_jobs_priority_created ON ai_article_jobs(priority DESC, created_at ASC) WHERE status = 'pending';

-- Comments
COMMENT ON TABLE ai_article_jobs IS 'Article generation jobs for the multi-agent AI writing pipeline';
COMMENT ON COLUMN ai_article_jobs.keyword IS 'Target keyword/topic for article generation';
COMMENT ON COLUMN ai_article_jobs.settings IS 'Job configuration including autoPost, targetWordCount, pipeline config';
COMMENT ON COLUMN ai_article_jobs.current_agent IS 'Currently executing agent in the pipeline';
COMMENT ON COLUMN ai_article_jobs.current_iteration IS 'Current QA feedback loop iteration';
COMMENT ON COLUMN ai_article_jobs.total_tokens_used IS 'Cumulative token usage across all agents';
COMMENT ON COLUMN ai_article_jobs.page_id IS 'Reference to created page (if autoPost enabled)';
COMMENT ON COLUMN ai_article_jobs.final_output IS 'Aggregated output from all agents';
COMMENT ON COLUMN ai_article_jobs.priority IS 'Queue priority (higher = processed first)';

-- Enable RLS
ALTER TABLE ai_article_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (admin-only)
CREATE POLICY "Admin full access to ai_article_jobs"
  ON ai_article_jobs
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
CREATE OR REPLACE FUNCTION update_ai_article_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Updated_at trigger
CREATE TRIGGER set_ai_article_jobs_updated_at
  BEFORE UPDATE ON ai_article_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_article_jobs_updated_at();

