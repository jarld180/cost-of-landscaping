-- Migration: City Listicle Content
-- Stores AI-generated intro/FAQ content per city for /[state]/[city]/best-concrete-contractors pages.
-- Contractor list itself is always live from the contractors table.

CREATE TABLE IF NOT EXISTS city_listicle_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  intro_html TEXT,
  closing_html TEXT,
  faqs JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published')),
  word_count INT,
  ai_job_id UUID,
  generated_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (city_id)
);

CREATE INDEX IF NOT EXISTS city_listicle_content_city_id_idx ON city_listicle_content (city_id);
CREATE INDEX IF NOT EXISTS city_listicle_content_status_idx ON city_listicle_content (status);

ALTER TABLE city_listicle_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage city listicle content"
  ON city_listicle_content FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM account_profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Public read published city listicle content"
  ON city_listicle_content FOR SELECT TO anon, authenticated
  USING (status = 'published');

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_city_listicle_content_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER city_listicle_content_updated_at
  BEFORE UPDATE ON city_listicle_content
  FOR EACH ROW EXECUTE FUNCTION update_city_listicle_content_updated_at();
