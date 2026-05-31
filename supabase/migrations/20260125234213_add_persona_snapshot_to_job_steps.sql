-- Add persona_snapshot column to ai_article_job_steps
-- Captures full persona configuration at step creation time for historical model tracking

ALTER TABLE ai_article_job_steps 
  ADD COLUMN persona_snapshot JSONB;

COMMENT ON COLUMN ai_article_job_steps.persona_snapshot IS 'Snapshot of persona configuration at step creation time for historical model tracking. Contains model, provider, temperature, system_prompt, and other settings used at execution time.';
