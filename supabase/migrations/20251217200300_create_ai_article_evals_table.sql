-- =====================================================
-- AI Article Evals Table
-- =====================================================
-- Stores evaluation scores for generated articles.
-- Supports both automated (QA agent) and human evaluations.

CREATE TABLE ai_article_evals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  job_id UUID NOT NULL REFERENCES ai_article_jobs(id) ON DELETE CASCADE,
  step_id UUID REFERENCES ai_article_job_steps(id) ON DELETE SET NULL,
  
  -- Eval type
  eval_type TEXT NOT NULL DEFAULT 'automated' CHECK (eval_type IN ('automated', 'human')),
  
  -- Iteration (which QA pass this eval is from)
  iteration INTEGER DEFAULT 1,
  
  -- Scores (0-100 scale)
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  
  -- Dimension scores
  readability_score INTEGER CHECK (readability_score >= 0 AND readability_score <= 100),
  seo_score INTEGER CHECK (seo_score >= 0 AND seo_score <= 100),
  accuracy_score INTEGER CHECK (accuracy_score >= 0 AND accuracy_score <= 100),
  engagement_score INTEGER CHECK (engagement_score >= 0 AND engagement_score <= 100),
  brand_voice_score INTEGER CHECK (brand_voice_score >= 0 AND brand_voice_score <= 100),
  
  -- Pass/Fail for automated evals
  passed BOOLEAN,
  
  -- Detailed feedback
  feedback TEXT,
  
  -- Issues found
  issues JSONB DEFAULT '[]'::jsonb,
  -- Issues structure: [{ "category": "readability|seo|accuracy|engagement|brand_voice", "severity": "minor|major|critical", "description": "...", "suggestion": "..." }]
  
  -- Human eval specific
  rated_by UUID REFERENCES auth.users(id),
  rated_at TIMESTAMPTZ,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Flexible metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX idx_ai_article_evals_job_id ON ai_article_evals(job_id);
CREATE INDEX idx_ai_article_evals_eval_type ON ai_article_evals(eval_type);
CREATE INDEX idx_ai_article_evals_overall_score ON ai_article_evals(overall_score);
CREATE INDEX idx_ai_article_evals_created_at ON ai_article_evals(created_at);

-- Comments
COMMENT ON TABLE ai_article_evals IS 'Evaluation scores for AI-generated articles (automated and human)';
COMMENT ON COLUMN ai_article_evals.job_id IS 'Article job being evaluated';
COMMENT ON COLUMN ai_article_evals.step_id IS 'Specific step that triggered this eval (usually QA)';
COMMENT ON COLUMN ai_article_evals.eval_type IS 'automated (QA agent) or human (manual review)';
COMMENT ON COLUMN ai_article_evals.overall_score IS 'Aggregate quality score (0-100)';
COMMENT ON COLUMN ai_article_evals.readability_score IS 'Reading level and clarity score';
COMMENT ON COLUMN ai_article_evals.seo_score IS 'SEO optimization score';
COMMENT ON COLUMN ai_article_evals.accuracy_score IS 'Factual accuracy score';
COMMENT ON COLUMN ai_article_evals.engagement_score IS 'Reader engagement potential score';
COMMENT ON COLUMN ai_article_evals.brand_voice_score IS 'Brand voice consistency score';
COMMENT ON COLUMN ai_article_evals.issues IS 'Array of detected issues with categories and suggestions';

-- Enable RLS
ALTER TABLE ai_article_evals ENABLE ROW LEVEL SECURITY;

-- RLS Policies (admin-only)
CREATE POLICY "Admin full access to ai_article_evals"
  ON ai_article_evals
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
CREATE OR REPLACE FUNCTION update_ai_article_evals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Updated_at trigger
CREATE TRIGGER set_ai_article_evals_updated_at
  BEFORE UPDATE ON ai_article_evals
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_article_evals_updated_at();

