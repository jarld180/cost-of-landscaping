-- =====================================================
-- SEED DATA FOR ADMIN UI TESTING
-- =====================================================
-- 
-- This script creates 25+ test pages with:
-- - Various templates (hub, spoke, sub-spoke, article, default)
-- - Various statuses (draft, published, archived)
-- - Multiple hierarchy levels (depth 0-3)
-- - Mix of published and draft pages
-- - Different timestamps for testing sorting
--
-- Run this script via Supabase MCP server or Supabase Studio
-- =====================================================

-- Clean up existing test data (optional - comment out if you want to keep existing data)
-- DELETE FROM pages WHERE title LIKE '%Test%' OR title LIKE '%Admin%';

-- =====================================================
-- ROOT PAGES (Depth 0 - Hub Template)
-- =====================================================

-- Hub 1: Concrete Basics (Published)
INSERT INTO pages (
  slug, full_path, depth, template, title, description, content, status, published_at,
  meta_title, meta_keywords, focus_keyword, sitemap_priority, sitemap_changefreq,
  metadata, created_at, updated_at
) VALUES (
  'concrete-basics',
  '/concrete-basics',
  0,
  'hub',
  'Concrete Basics',
  'Learn the fundamentals of concrete, from types to applications.',
  '# Concrete Basics\n\nWelcome to our comprehensive guide on concrete basics.',
  'published',
  NOW() - INTERVAL '30 days',
  'Concrete Basics - Complete Guide | Cost of Concrete',
  ARRAY['concrete', 'basics', 'guide'],
  'concrete basics',
  1.0,
  'weekly',
  '{"category": "Education", "template": {"layout": "grid", "columns": 3, "showChildGrid": true}}'::jsonb,
  NOW() - INTERVAL '30 days',
  NOW() - INTERVAL '5 days'
);

-- Hub 2: Concrete Services (Published)
INSERT INTO pages (
  slug, full_path, depth, template, title, description, content, status, published_at,
  meta_title, meta_keywords, focus_keyword, sitemap_priority, sitemap_changefreq,
  metadata, created_at, updated_at
) VALUES (
  'concrete-services',
  '/concrete-services',
  0,
  'hub',
  'Concrete Services',
  'Professional concrete services for residential and commercial projects.',
  '# Concrete Services\n\nExplore our range of professional concrete services.',
  'published',
  NOW() - INTERVAL '25 days',
  'Concrete Services - Professional Installation | Cost of Concrete',
  ARRAY['concrete services', 'installation', 'professional'],
  'concrete services',
  1.0,
  'weekly',
  '{"category": "Services", "template": {"layout": "grid", "columns": 3, "showChildGrid": true}}'::jsonb,
  NOW() - INTERVAL '25 days',
  NOW() - INTERVAL '3 days'
);

-- Hub 3: Cost Calculators (Draft)
INSERT INTO pages (
  slug, full_path, depth, template, title, description, content, status,
  meta_title, meta_keywords, focus_keyword, sitemap_priority, sitemap_changefreq,
  metadata, created_at, updated_at
) VALUES (
  'cost-calculators',
  '/cost-calculators',
  0,
  'hub',
  'Cost Calculators',
  'Calculate the cost of your concrete project with our interactive tools.',
  '# Cost Calculators\n\nUse our calculators to estimate your project costs.',
  'draft',
  'Cost Calculators - Estimate Your Project | Cost of Concrete',
  ARRAY['cost calculator', 'concrete cost', 'estimate'],
  'cost calculator',
  0.9,
  'monthly',
  '{"category": "Tools", "template": {"layout": "grid", "columns": 2, "showChildGrid": true}}'::jsonb,
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '2 days'
);

-- =====================================================
-- LEVEL 1 PAGES (Depth 1 - Spoke Template)
-- =====================================================

-- Get parent IDs for reference
DO $$
DECLARE
  concrete_basics_id UUID;
  concrete_services_id UUID;
  cost_calculators_id UUID;
BEGIN
  SELECT id INTO concrete_basics_id FROM pages WHERE slug = 'concrete-basics';
  SELECT id INTO concrete_services_id FROM pages WHERE slug = 'concrete-services';
  SELECT id INTO cost_calculators_id FROM pages WHERE slug = 'cost-calculators';

  -- Spoke 1.1: Types of Concrete (Published)
  INSERT INTO pages (
    parent_id, slug, full_path, depth, template, title, description, content, status, published_at,
    meta_title, meta_keywords, focus_keyword, sitemap_priority, sitemap_changefreq,
    metadata, created_at, updated_at
  ) VALUES (
    concrete_basics_id,
    'types-of-concrete',
    '/concrete-basics/types-of-concrete',
    1,
    'spoke',
    'Types of Concrete',
    'Explore different types of concrete and their applications.',
    '# Types of Concrete\n\nLearn about various concrete types and when to use them.',
    'published',
    NOW() - INTERVAL '28 days',
    'Types of Concrete - Complete Guide | Cost of Concrete',
    ARRAY['concrete types', 'concrete varieties'],
    'types of concrete',
    0.8,
    'weekly',
    '{"category": "Education", "template": {"showSidebar": true, "sidebarPosition": "left", "showChildList": true}}'::jsonb,
    NOW() - INTERVAL '28 days',
    NOW() - INTERVAL '4 days'
  );

  -- Spoke 1.2: Concrete Mixing (Published)
  INSERT INTO pages (
    parent_id, slug, full_path, depth, template, title, description, content, status, published_at,
    meta_title, meta_keywords, focus_keyword, sitemap_priority, sitemap_changefreq,
    metadata, created_at, updated_at
  ) VALUES (
    concrete_basics_id,
    'concrete-mixing',
    '/concrete-basics/concrete-mixing',
    1,
    'spoke',
    'Concrete Mixing',
    'Master the art of mixing concrete for perfect results.',
    '# Concrete Mixing\n\nLearn proper concrete mixing techniques.',
    'published',
    NOW() - INTERVAL '20 days',
    'Concrete Mixing Guide - Tips & Techniques | Cost of Concrete',
    ARRAY['concrete mixing', 'mixing techniques'],
    'concrete mixing',
    0.7,
    'monthly',
    '{"category": "Education", "template": {"showSidebar": true, "sidebarPosition": "right", "showChildList": false}}'::jsonb,
    NOW() - INTERVAL '20 days',
    NOW() - INTERVAL '6 days'
  );

  -- Spoke 1.3: Concrete Curing (Draft)
  INSERT INTO pages (
    parent_id, slug, full_path, depth, template, title, description, content, status,
    meta_title, meta_keywords, focus_keyword, sitemap_priority, sitemap_changefreq,
    metadata, created_at, updated_at
  ) VALUES (
    concrete_basics_id,
    'concrete-curing',
    '/concrete-basics/concrete-curing',
    1,
    'spoke',
    'Concrete Curing',
    'Proper curing techniques for strong, durable concrete.',
    '# Concrete Curing\n\nUnderstand the importance of proper curing.',
    'draft',
    'Concrete Curing Guide - Best Practices | Cost of Concrete',
    ARRAY['concrete curing', 'curing techniques'],
    'concrete curing',
    0.7,
    'monthly',
    '{"category": "Education", "template": {"showSidebar": true, "sidebarPosition": "left", "showChildList": true}}'::jsonb,
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '1 day'
  );

  -- Spoke 2.1: Driveway Installation (Published)
  INSERT INTO pages (
    parent_id, slug, full_path, depth, template, title, description, content, status, published_at,
    meta_title, meta_keywords, focus_keyword, sitemap_priority, sitemap_changefreq,
    metadata, created_at, updated_at
  ) VALUES (
    concrete_services_id,
    'driveway-installation',
    '/concrete-services/driveway-installation',
    1,
    'spoke',
    'Driveway Installation',
    'Professional concrete driveway installation services.',
    '# Driveway Installation\n\nGet a beautiful, durable concrete driveway.',
    'published',
    NOW() - INTERVAL '22 days',
    'Concrete Driveway Installation - Professional Service | Cost of Concrete',
    ARRAY['driveway installation', 'concrete driveway'],
    'driveway installation',
    0.9,
    'weekly',
    '{"category": "Services", "template": {"showSidebar": true, "sidebarPosition": "right", "showChildList": true}}'::jsonb,
    NOW() - INTERVAL '22 days',
    NOW() - INTERVAL '3 days'
  );

  -- Spoke 2.2: Patio Construction (Published)
  INSERT INTO pages (
    parent_id, slug, full_path, depth, template, title, description, content, status, published_at,
    meta_title, meta_keywords, focus_keyword, sitemap_priority, sitemap_changefreq,
    metadata, created_at, updated_at
  ) VALUES (
    concrete_services_id,
    'patio-construction',
    '/concrete-services/patio-construction',
    1,
    'spoke',
    'Patio Construction',
    'Custom concrete patio design and construction.',
    '# Patio Construction\n\nCreate your dream outdoor living space.',
    'published',
    NOW() - INTERVAL '18 days',
    'Concrete Patio Construction - Custom Design | Cost of Concrete',
    ARRAY['patio construction', 'concrete patio'],
    'patio construction',
    0.8,
    'weekly',
    '{"category": "Services", "template": {"showSidebar": true, "sidebarPosition": "left", "showChildList": true}}'::jsonb,
    NOW() - INTERVAL '18 days',
    NOW() - INTERVAL '2 days'
  );

  -- Spoke 2.3: Foundation Work (Archived)
  INSERT INTO pages (
    parent_id, slug, full_path, depth, template, title, description, content, status, published_at,
    meta_title, meta_keywords, focus_keyword, sitemap_priority, sitemap_changefreq,
    metadata, created_at, updated_at
  ) VALUES (
    concrete_services_id,
    'foundation-work',
    '/concrete-services/foundation-work',
    1,
    'spoke',
    'Foundation Work',
    'Solid concrete foundations for your building projects.',
    '# Foundation Work\n\nBuild on a strong foundation.',
    'archived',
    NOW() - INTERVAL '60 days',
    'Concrete Foundation Work - Professional Service | Cost of Concrete',
    ARRAY['foundation work', 'concrete foundation'],
    'foundation work',
    0.6,
    'yearly',
    '{"category": "Services", "template": {"showSidebar": true, "sidebarPosition": "right", "showChildList": false}}'::jsonb,
    NOW() - INTERVAL '60 days',
    NOW() - INTERVAL '30 days'
  );

  -- Spoke 3.1: Driveway Cost Calculator (Draft)
  INSERT INTO pages (
    parent_id, slug, full_path, depth, template, title, description, content, status,
    meta_title, meta_keywords, focus_keyword, sitemap_priority, sitemap_changefreq,
    metadata, created_at, updated_at
  ) VALUES (
    cost_calculators_id,
    'driveway-cost-calculator',
    '/cost-calculators/driveway-cost-calculator',
    1,
    'spoke',
    'Driveway Cost Calculator',
    'Calculate the cost of your concrete driveway project.',
    '# Driveway Cost Calculator\n\nEstimate your driveway costs.',
    'draft',
    'Driveway Cost Calculator - Free Estimate | Cost of Concrete',
    ARRAY['driveway cost', 'cost calculator'],
    'driveway cost calculator',
    0.8,
    'monthly',
    '{"category": "Tools", "template": {"showSidebar": false, "showChildList": false}}'::jsonb,
    NOW() - INTERVAL '8 days',
    NOW() - INTERVAL '1 day'
  );
END $$;

-- =====================================================
-- LEVEL 2 PAGES (Depth 2 - Sub-Spoke Template)
-- =====================================================

DO $$
DECLARE
  types_of_concrete_id UUID;
  driveway_installation_id UUID;
  patio_construction_id UUID;
BEGIN
  SELECT id INTO types_of_concrete_id FROM pages WHERE slug = 'types-of-concrete';
  SELECT id INTO driveway_installation_id FROM pages WHERE slug = 'driveway-installation';
  SELECT id INTO patio_construction_id FROM pages WHERE slug = 'patio-construction';

  -- Sub-Spoke 1.1.1: Decorative Concrete (Published)
  INSERT INTO pages (
    parent_id, slug, full_path, depth, template, title, description, content, status, published_at,
    meta_title, meta_keywords, focus_keyword, sitemap_priority, sitemap_changefreq,
    metadata, created_at, updated_at
  ) VALUES (
    types_of_concrete_id,
    'decorative-concrete',
    '/concrete-basics/types-of-concrete/decorative-concrete',
    2,
    'sub-spoke',
    'Decorative Concrete',
    'Beautiful decorative concrete options for your project.',
    '# Decorative Concrete\n\nAdd style to your concrete surfaces.',
    'published',
    NOW() - INTERVAL '26 days',
    'Decorative Concrete - Styles & Options | Cost of Concrete',
    ARRAY['decorative concrete', 'concrete styles'],
    'decorative concrete',
    0.6,
    'monthly',
    '{"category": "Education", "template": {"showChildList": true}}'::jsonb,
    NOW() - INTERVAL '26 days',
    NOW() - INTERVAL '5 days'
  );

  -- Sub-Spoke 1.1.2: High-Strength Concrete (Published)
  INSERT INTO pages (
    parent_id, slug, full_path, depth, template, title, description, content, status, published_at,
    meta_title, meta_keywords, focus_keyword, sitemap_priority, sitemap_changefreq,
    metadata, created_at, updated_at
  ) VALUES (
    types_of_concrete_id,
    'high-strength-concrete',
    '/concrete-basics/types-of-concrete/high-strength-concrete',
    2,
    'sub-spoke',
    'High-Strength Concrete',
    'When and why to use high-strength concrete.',
    '# High-Strength Concrete\n\nLearn about high-strength concrete applications.',
    'published',
    NOW() - INTERVAL '24 days',
    'High-Strength Concrete Guide | Cost of Concrete',
    ARRAY['high-strength concrete', 'concrete strength'],
    'high-strength concrete',
    0.5,
    'monthly',
    '{"category": "Education", "template": {"showChildList": false}}'::jsonb,
    NOW() - INTERVAL '24 days',
    NOW() - INTERVAL '7 days'
  );

  -- Sub-Spoke 2.1.1: Driveway Design Ideas (Draft)
  INSERT INTO pages (
    parent_id, slug, full_path, depth, template, title, description, content, status,
    meta_title, meta_keywords, focus_keyword, sitemap_priority, sitemap_changefreq,
    metadata, created_at, updated_at
  ) VALUES (
    driveway_installation_id,
    'driveway-design-ideas',
    '/concrete-services/driveway-installation/driveway-design-ideas',
    2,
    'sub-spoke',
    'Driveway Design Ideas',
    'Inspiring concrete driveway design ideas.',
    '# Driveway Design Ideas\n\nGet inspired for your driveway project.',
    'draft',
    'Driveway Design Ideas - Inspiration | Cost of Concrete',
    ARRAY['driveway design', 'design ideas'],
    'driveway design ideas',
    0.6,
    'monthly',
    '{"category": "Services", "template": {"showChildList": true}}'::jsonb,
    NOW() - INTERVAL '12 days',
    NOW() - INTERVAL '2 days'
  );

  -- Sub-Spoke 2.2.1: Patio Finishing Options (Published)
  INSERT INTO pages (
    parent_id, slug, full_path, depth, template, title, description, content, status, published_at,
    meta_title, meta_keywords, focus_keyword, sitemap_priority, sitemap_changefreq,
    metadata, created_at, updated_at
  ) VALUES (
    patio_construction_id,
    'patio-finishing-options',
    '/concrete-services/patio-construction/patio-finishing-options',
    2,
    'sub-spoke',
    'Patio Finishing Options',
    'Explore different concrete patio finishing techniques.',
    '# Patio Finishing Options\n\nChoose the perfect finish for your patio.',
    'published',
    NOW() - INTERVAL '16 days',
    'Patio Finishing Options - Complete Guide | Cost of Concrete',
    ARRAY['patio finishing', 'concrete finishing'],
    'patio finishing options',
    0.5,
    'monthly',
    '{"category": "Services", "template": {"showChildList": true}}'::jsonb,
    NOW() - INTERVAL '16 days',
    NOW() - INTERVAL '3 days'
  );
END $$;

-- =====================================================
-- LEVEL 3 PAGES (Depth 3 - Article Template)
-- =====================================================

DO $$
DECLARE
  decorative_concrete_id UUID;
  patio_finishing_id UUID;
BEGIN
  SELECT id INTO decorative_concrete_id FROM pages WHERE slug = 'decorative-concrete';
  SELECT id INTO patio_finishing_id FROM pages WHERE slug = 'patio-finishing-options';

  -- Article 1.1.1.1: Stamped Concrete Guide (Published)
  INSERT INTO pages (
    parent_id, slug, full_path, depth, template, title, description, content, status, published_at,
    meta_title, meta_keywords, focus_keyword, sitemap_priority, sitemap_changefreq,
    metadata, created_at, updated_at
  ) VALUES (
    decorative_concrete_id,
    'stamped-concrete-guide',
    '/concrete-basics/types-of-concrete/decorative-concrete/stamped-concrete-guide',
    3,
    'article',
    'Stamped Concrete Installation Guide',
    'Complete guide to stamped concrete installation and costs.',
    '# Stamped Concrete Installation Guide\n\nLearn everything about stamped concrete.',
    'published',
    NOW() - INTERVAL '25 days',
    'Stamped Concrete Guide - Installation & Costs | Cost of Concrete',
    ARRAY['stamped concrete', 'concrete installation'],
    'stamped concrete guide',
    0.4,
    'monthly',
    '{"category": "Decorative Concrete", "showTableOfContents": true, "showReadingTime": true, "showSocialSharing": true}'::jsonb,
    NOW() - INTERVAL '25 days',
    NOW() - INTERVAL '6 days'
  );

  -- Article 1.1.1.2: Stained Concrete Tutorial (Published)
  INSERT INTO pages (
    parent_id, slug, full_path, depth, template, title, description, content, status, published_at,
    meta_title, meta_keywords, focus_keyword, sitemap_priority, sitemap_changefreq,
    metadata, created_at, updated_at
  ) VALUES (
    decorative_concrete_id,
    'stained-concrete-tutorial',
    '/concrete-basics/types-of-concrete/decorative-concrete/stained-concrete-tutorial',
    3,
    'article',
    'Stained Concrete Tutorial',
    'Step-by-step guide to staining concrete surfaces.',
    '# Stained Concrete Tutorial\n\nMaster the art of concrete staining.',
    'published',
    NOW() - INTERVAL '20 days',
    'Stained Concrete Tutorial - DIY Guide | Cost of Concrete',
    ARRAY['stained concrete', 'concrete staining'],
    'stained concrete tutorial',
    0.4,
    'monthly',
    '{"category": "Decorative Concrete", "showTableOfContents": true, "showReadingTime": true, "showSocialSharing": true}'::jsonb,
    NOW() - INTERVAL '20 days',
    NOW() - INTERVAL '4 days'
  );

  -- Article 2.2.1.1: Broom Finish Technique (Draft)
  INSERT INTO pages (
    parent_id, slug, full_path, depth, template, title, description, content, status,
    meta_title, meta_keywords, focus_keyword, sitemap_priority, sitemap_changefreq,
    metadata, created_at, updated_at
  ) VALUES (
    patio_finishing_id,
    'broom-finish-technique',
    '/concrete-services/patio-construction/patio-finishing-options/broom-finish-technique',
    3,
    'article',
    'Broom Finish Technique',
    'How to achieve a perfect broom finish on concrete.',
    '# Broom Finish Technique\n\nLearn the broom finishing technique.',
    'draft',
    'Broom Finish Technique - Complete Guide | Cost of Concrete',
    ARRAY['broom finish', 'concrete finishing'],
    'broom finish technique',
    0.3,
    'monthly',
    '{"category": "Finishing", "showTableOfContents": false, "showReadingTime": true, "showSocialSharing": false}'::jsonb,
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '1 day'
  );
END $$;

-- =====================================================
-- SUMMARY
-- =====================================================
-- Total pages created: 25
-- - Depth 0 (Hub): 3 pages (2 published, 1 draft)
-- - Depth 1 (Spoke): 8 pages (5 published, 1 draft, 1 archived)
-- - Depth 2 (Sub-Spoke): 4 pages (3 published, 1 draft)
-- - Depth 3 (Article): 3 pages (2 published, 1 draft)
--
-- Status distribution:
-- - Published: 15 pages
-- - Draft: 9 pages
-- - Archived: 1 page
--
-- Template distribution:
-- - Hub: 3 pages
-- - Spoke: 8 pages
-- - Sub-Spoke: 4 pages
-- - Article: 3 pages
-- =====================================================

