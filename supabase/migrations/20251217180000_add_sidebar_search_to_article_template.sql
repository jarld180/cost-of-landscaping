-- Migration: Add showSidebarSearch option to Article template
-- Description: Adds a toggle for displaying a search box in the article sidebar

UPDATE page_templates
SET 
  metadata_schema = jsonb_set(
    metadata_schema,
    '{properties,showSidebarSearch}',
    '{"type": "boolean", "description": "Show search box in sidebar"}'::jsonb
  ),
  default_metadata = jsonb_set(
    default_metadata,
    '{showSidebarSearch}',
    'false'::jsonb
  ),
  updated_at = NOW()
WHERE slug = 'article';

