-- Add image_generator agent type to CHECK constraints and insert default persona

-- Part A: ALTER CHECK constraints on ai_personas table
ALTER TABLE ai_personas 
  DROP CONSTRAINT IF EXISTS ai_personas_agent_type_check;
ALTER TABLE ai_personas 
  ADD CONSTRAINT ai_personas_agent_type_check 
  CHECK (agent_type IN ('research', 'writer', 'seo', 'qa', 'project_manager', 'image_generator'));

-- Part B: ALTER CHECK constraints on ai_article_jobs table
ALTER TABLE ai_article_jobs 
  DROP CONSTRAINT IF EXISTS ai_article_jobs_current_agent_check;
ALTER TABLE ai_article_jobs 
  ADD CONSTRAINT ai_article_jobs_current_agent_check 
  CHECK (current_agent IS NULL OR current_agent IN ('research', 'writer', 'seo', 'qa', 'project_manager', 'image_generator'));

-- Part C: ALTER CHECK constraints on ai_article_job_steps table
ALTER TABLE ai_article_job_steps 
  DROP CONSTRAINT IF EXISTS ai_article_job_steps_agent_type_check;
ALTER TABLE ai_article_job_steps 
  ADD CONSTRAINT ai_article_job_steps_agent_type_check 
  CHECK (agent_type IN ('research', 'writer', 'seo', 'qa', 'project_manager', 'image_generator'));

-- Part D: Insert default image_generator persona (idempotent)
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
  'image_generator',
  'Default Image Generator',
  'Generates contextual DALL-E 3 images for article H2 headings',
  'You generate image prompts for DALL-E 3. Create vivid, contextual prompts that capture the essence of article headings in a professional, concrete/construction industry style.',
  'openai',
  'gpt-4o-mini',
  0.7,
  1000,
  true,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM ai_personas 
  WHERE agent_type = 'image_generator' AND is_default = true
);
