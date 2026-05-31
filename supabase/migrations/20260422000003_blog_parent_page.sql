-- Create the /blog hub page so AI-generated articles publish under /blog/[slug]
-- UUID is fixed so batch-queue can reference it without a runtime lookup.

INSERT INTO pages (
  id,
  title,
  slug,
  full_path,
  depth,
  parent_id,
  template,
  status,
  description,
  content,
  meta_title,
  meta_keywords,
  sitemap_changefreq,
  sitemap_priority,
  metadata,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-4000-a000-000000000001',
  'Concrete Blog — Cost Guides, How-To, and Tips',
  'blog',
  '/blog',
  0,
  NULL,
  'default',
  'published',
  'Expert concrete cost guides, how-to tutorials, maintenance tips, and contractor hiring advice.',
  '<p>Expert concrete cost guides, step-by-step how-to tutorials, maintenance tips, and advice on hiring the right contractor. Everything homeowners need to know about concrete projects.</p>',
  'Concrete Blog — Cost Guides, How-To Guides & Tips | Cost of Concrete',
  ARRAY['concrete blog','concrete cost guides','concrete how to','concrete tips','hire concrete contractor'],
  'weekly',
  0.8,
  '{"aiGenerated": false}'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;
