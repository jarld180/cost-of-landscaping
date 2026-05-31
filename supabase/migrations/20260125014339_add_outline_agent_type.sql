-- Add outline agent type to CHECK constraints and insert default persona

-- Part A: ALTER CHECK constraints on ai_personas table
ALTER TABLE ai_personas 
  DROP CONSTRAINT IF EXISTS ai_personas_agent_type_check;
ALTER TABLE ai_personas 
  ADD CONSTRAINT ai_personas_agent_type_check 
  CHECK (agent_type IN ('research', 'writer', 'seo', 'qa', 'project_manager', 'image_generator', 'outline'));

-- Part B: ALTER CHECK constraints on ai_article_jobs table
ALTER TABLE ai_article_jobs 
  DROP CONSTRAINT IF EXISTS ai_article_jobs_current_agent_check;
ALTER TABLE ai_article_jobs 
  ADD CONSTRAINT ai_article_jobs_current_agent_check 
  CHECK (current_agent IS NULL OR current_agent IN ('research', 'writer', 'seo', 'qa', 'project_manager', 'image_generator', 'outline'));

-- Part C: ALTER CHECK constraints on ai_article_job_steps table
ALTER TABLE ai_article_job_steps 
  DROP CONSTRAINT IF EXISTS ai_article_job_steps_agent_type_check;
ALTER TABLE ai_article_job_steps 
  ADD CONSTRAINT ai_article_job_steps_agent_type_check 
  CHECK (agent_type IN ('research', 'writer', 'seo', 'qa', 'project_manager', 'image_generator', 'outline'));

-- Part D: Insert default outline persona (idempotent)
INSERT INTO ai_personas (
  agent_type,
  name,
  description,
  system_prompt,
  provider,
  model,
  temperature,
  max_tokens,
  is_default,
  is_enabled
)
SELECT
  'outline',
  'Default Outline Agent',
  'Generates strategic content outlines based on research data',
  'You are an Outline Agent for SEO content planning.

Your job is to create a detailed content outline that:
1. Structures H2 and H3 headings for comprehensive topic coverage
2. Assigns target word counts to each section
3. Maps "People Also Ask" questions to relevant sections
4. Distributes secondary keywords across sections
5. Identifies key points each section should cover

Output structured JSON matching the OutlineOutput schema with sections, word counts, and guidance.
Be strategic - ensure the outline covers all aspects of the topic and answers user intent.',
  'anthropic',
  'claude-sonnet-4-20250514',
  0.5,
  4096,
  true,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM ai_personas 
  WHERE agent_type = 'outline' AND is_default = true
);
