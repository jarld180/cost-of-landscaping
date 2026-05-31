-- Migration: Article Keyword Queue
-- Master list of target keywords for AI article generation.
-- Admin can batch-queue all pending keywords to create ai_article_jobs.

CREATE TABLE IF NOT EXISTS article_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL UNIQUE,
  secondary_keywords TEXT[] DEFAULT '{}',
  article_context TEXT,
  category TEXT NOT NULL DEFAULT 'general'
    CHECK (category IN ('cost_guide','how_to','comparison','type','problem','maintenance','local_seo','general')),
  priority INT NOT NULL DEFAULT 50 CHECK (priority BETWEEN 0 AND 100),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','queued','completed','skipped')),
  job_id UUID,
  page_id UUID,
  queued_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS article_keywords_status_idx ON article_keywords (status);
CREATE INDEX IF NOT EXISTS article_keywords_category_idx ON article_keywords (category);
CREATE INDEX IF NOT EXISTS article_keywords_priority_idx ON article_keywords (priority DESC);

ALTER TABLE article_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage article keywords"
  ON article_keywords FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM account_profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE OR REPLACE FUNCTION update_article_keywords_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER article_keywords_updated_at
  BEFORE UPDATE ON article_keywords
  FOR EACH ROW EXECUTE FUNCTION update_article_keywords_updated_at();
