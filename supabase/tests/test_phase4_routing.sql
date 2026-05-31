-- =====================================================
-- Phase 4: Dynamic Routing - Test Data
-- =====================================================
-- This script creates test pages to verify the catch-all route
-- and DefaultTemplate component work correctly
--
-- Test Pages Created:
-- 1. /test-default - Default template test page
-- 2. /test-hub - Hub template test page (will use DefaultTemplate for now)
-- 3. /test-hub/test-spoke - Spoke template test page (child of hub)
--
-- Run this script to create test data:
-- Execute in Supabase SQL Editor or via psql
-- =====================================================

-- Clean up any existing test pages
DELETE FROM pages WHERE slug LIKE 'test-%';

-- =====================================================
-- Test Page 1: Default Template (Root Level)
-- =====================================================
INSERT INTO pages (
  slug,
  full_path,
  depth,
  template,
  title,
  description,
  content,
  meta_title,
  meta_keywords,
  og_image,
  canonical_url,
  meta_robots,
  focus_keyword,
  sitemap_priority,
  sitemap_changefreq,
  status,
  published_at,
  metadata
) VALUES (
  'test-default',
  '/test-default',
  0,
  'default',
  'Test Default Template Page',
  'This is a test page using the default template to verify Phase 4 routing works correctly.',
  E'# Welcome to the Test Page\n\nThis is a **test page** using the `DefaultTemplate` component.\n\n## Features Being Tested\n\n- Catch-all route (`[...slug].vue`)\n- Dynamic page fetching from database\n- Markdown rendering with `marked` library\n- SEO meta tags generation\n- Breadcrumb navigation\n\n## Markdown Rendering\n\nThis content is stored as markdown in the database and rendered dynamically.\n\n### Lists Work\n\n- Item 1\n- Item 2\n- Item 3\n\n### Links Work\n\nHere is a [link to the home page](/).\n\n### Code Blocks Work\n\n```javascript\nconst test = "Hello World";\nconsole.log(test);\n```\n\n## Conclusion\n\nIf you can see this page with proper formatting, Phase 4 Batch 1 is working! 🎉',
  'Test Default Template - Phase 4 Routing',
  ARRAY['test', 'default template', 'phase 4', 'routing'],
  '/images/test-default.jpg',
  '/test-default',
  ARRAY['index', 'follow'],
  'test default template',
  0.5,
  'weekly',
  'published',
  NOW(),
  '{
    "template": {
      "showBreadcrumbs": true,
      "showChildList": false
    },
    "seo": {
      "og": {
        "title": "Test Default Template Page",
        "description": "Testing Phase 4 dynamic routing with default template",
        "type": "website"
      },
      "twitter": {
        "card": "summary_large_image",
        "title": "Test Default Template Page",
        "description": "Testing Phase 4 dynamic routing"
      },
      "schema": {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": "Test Default Template Page",
        "description": "Testing Phase 4 dynamic routing with default template"
      }
    }
  }'::jsonb
);

-- =====================================================
-- Test Page 2: Hub Template (Root Level)
-- =====================================================
INSERT INTO pages (
  slug,
  full_path,
  depth,
  template,
  title,
  description,
  content,
  meta_title,
  status,
  published_at,
  metadata
) VALUES (
  'test-hub',
  '/test-hub',
  0,
  'hub',
  'Test Hub Template Page',
  'This is a test hub page that will use DefaultTemplate as fallback until HubTemplate is created in Batch 3.',
  E'# Test Hub Page\n\nThis page uses the `hub` template but will render with `DefaultTemplate` until Batch 3.\n\n## What This Tests\n\n- Template selection logic in catch-all route\n- Fallback to DefaultTemplate when specific template not available\n- Parent-child relationship (this page has children)\n\nIn **Batch 3**, this page will render with the full Hub template including:\n- Sidebar navigation\n- Topic cards grid for children\n- Hero image support',
  'Test Hub Template - Phase 4',
  'published',
  NOW(),
  '{
    "template": {
      "layout": "grid",
      "columns": 3,
      "showChildGrid": true,
      "heroImage": "/images/test-hub-hero.jpg"
    }
  }'::jsonb
);

-- =====================================================
-- Test Page 3: Spoke Template (Child of Hub)
-- =====================================================
INSERT INTO pages (
  parent_id,
  slug,
  full_path,
  depth,
  template,
  title,
  description,
  content,
  meta_title,
  status,
  published_at,
  metadata
) VALUES (
  (SELECT id FROM pages WHERE slug = 'test-hub'),
  'test-spoke',
  '/test-hub/test-spoke',
  1,
  'spoke',
  'Test Spoke Template Page',
  'This is a child page of the test hub, using the spoke template.',
  E'# Test Spoke Page\n\nThis is a **child page** of the test hub.\n\n## Hierarchy Test\n\n- Parent: Test Hub Template Page\n- This Page: Test Spoke Template Page\n- Depth: 1\n- Template: spoke (fallback to default for now)\n\n## Breadcrumbs\n\nYou should see breadcrumbs at the top:\n`Home / Test Hub Template Page / Test Spoke Template Page`\n\nIn **Batch 4**, this page will render with the full Spoke template including:\n- Sidebar navigation\n- Optional child list\n- Call-to-action buttons',
  'Test Spoke Template - Phase 4',
  'published',
  NOW(),
  '{
    "template": {
      "showSidebar": true,
      "sidebarPosition": "right",
      "showChildList": false,
      "callToAction": {
        "text": "Get Started",
        "url": "/search",
        "style": "primary"
      }
    }
  }'::jsonb
);

-- =====================================================
-- Verify Test Data
-- =====================================================
SELECT 
  id,
  title,
  slug,
  full_path,
  depth,
  template,
  status,
  parent_id IS NOT NULL as has_parent
FROM pages 
WHERE slug LIKE 'test-%'
ORDER BY depth, slug;

-- =====================================================
-- Test URLs to Visit
-- =====================================================
-- After running this script, visit these URLs in your browser:
--
-- 1. http://localhost:3019/test-default
--    - Should render DefaultTemplate
--    - Should show markdown content
--    - Should have SEO meta tags
--
-- 2. http://localhost:3019/test-hub
--    - Should render DefaultTemplate (fallback)
--    - Template field is 'hub' but HubTemplate not created yet
--
-- 3. http://localhost:3019/test-hub/test-spoke
--    - Should render DefaultTemplate (fallback)
--    - Should show breadcrumbs
--    - Parent-child relationship working
--
-- 4. http://localhost:3019/non-existent-page
--    - Should show 404 error (will be custom in Batch 6)
-- =====================================================

