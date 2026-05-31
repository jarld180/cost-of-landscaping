-- =====================================================
-- Test Suite for Pages Table Schema
-- =====================================================
-- Description: Comprehensive tests for pages table functionality
-- Tests: CRUD operations, constraints, triggers, RLS policies
-- Created: 2025-11-08
-- =====================================================

-- =====================================================
-- TEST 1: Insert Root Page (depth 0)
-- =====================================================

INSERT INTO pages (
  slug,
  full_path,
  depth,
  template,
  title,
  description,
  content,
  status
) VALUES (
  'staining-concrete',
  '/staining-concrete',
  0,
  'hub',
  'Staining Concrete',
  'Complete guide to concrete staining techniques',
  '# Staining Concrete\n\nLearn everything about concrete staining.',
  'published'
);

-- Verify insertion
SELECT 
  id,
  slug,
  full_path,
  depth,
  template,
  title,
  status,
  created_at IS NOT NULL as has_created_at,
  updated_at IS NOT NULL as has_updated_at
FROM pages 
WHERE slug = 'staining-concrete';

-- =====================================================
-- TEST 2: Insert Child Page (depth 1)
-- =====================================================

-- Get parent ID
DO $$
DECLARE
  parent_page_id UUID;
BEGIN
  SELECT id INTO parent_page_id FROM pages WHERE slug = 'staining-concrete';
  
  INSERT INTO pages (
    parent_id,
    slug,
    full_path,
    depth,
    template,
    title,
    description,
    content,
    status
  ) VALUES (
    parent_page_id,
    'acid-staining',
    '/staining-concrete/acid-staining',
    1,
    'spoke',
    'Acid Staining',
    'Learn about acid-based concrete staining',
    '# Acid Staining\n\nAcid staining creates beautiful, variegated colors.',
    'published'
  );
END $$;

-- Verify parent-child relationship
SELECT 
  p.slug as parent_slug,
  c.slug as child_slug,
  c.full_path,
  c.depth,
  c.template
FROM pages p
INNER JOIN pages c ON c.parent_id = p.id
WHERE p.slug = 'staining-concrete';

-- =====================================================
-- TEST 3: Insert Grandchild Page (depth 2)
-- =====================================================

DO $$
DECLARE
  parent_page_id UUID;
BEGIN
  SELECT id INTO parent_page_id FROM pages WHERE slug = 'acid-staining';
  
  INSERT INTO pages (
    parent_id,
    slug,
    full_path,
    depth,
    template,
    title,
    description,
    content,
    status
  ) VALUES (
    parent_page_id,
    'color-options',
    '/staining-concrete/acid-staining/color-options',
    2,
    'sub-spoke',
    'Color Options',
    'Explore acid stain color options',
    '# Color Options\n\nAcid stains come in earth tones.',
    'draft'
  );
END $$;

-- Verify 3-level hierarchy
SELECT 
  slug,
  full_path,
  depth,
  template,
  status
FROM pages
ORDER BY depth, slug;

-- =====================================================
-- TEST 4: Test Unique Constraints
-- =====================================================

-- Test 4a: Duplicate full_path should fail
DO $$
BEGIN
  INSERT INTO pages (
    slug,
    full_path,
    depth,
    template,
    title,
    content
  ) VALUES (
    'duplicate',
    '/staining-concrete',  -- Duplicate path
    0,
    'hub',
    'Duplicate Page',
    'This should fail'
  );
  RAISE EXCEPTION 'Test failed: Duplicate full_path was allowed';
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'Test passed: Duplicate full_path rejected';
END $$;

-- Test 4b: Duplicate slug within same parent should fail
DO $$
DECLARE
  parent_page_id UUID;
BEGIN
  SELECT id INTO parent_page_id FROM pages WHERE slug = 'staining-concrete';
  
  INSERT INTO pages (
    parent_id,
    slug,
    full_path,
    depth,
    template,
    title,
    content
  ) VALUES (
    parent_page_id,
    'acid-staining',  -- Duplicate slug under same parent
    '/staining-concrete/duplicate-acid',
    1,
    'spoke',
    'Duplicate Slug',
    'This should fail'
  );
  RAISE EXCEPTION 'Test failed: Duplicate slug under same parent was allowed';
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'Test passed: Duplicate slug under same parent rejected';
END $$;

-- =====================================================
-- TEST 5: Test Slug Format Constraint
-- =====================================================

-- Test 5a: Invalid slug with uppercase should fail
DO $$
BEGIN
  INSERT INTO pages (
    slug,
    full_path,
    depth,
    template,
    title,
    content
  ) VALUES (
    'Invalid-Slug',  -- Uppercase not allowed
    '/invalid-slug',
    0,
    'hub',
    'Invalid Slug',
    'This should fail'
  );
  RAISE EXCEPTION 'Test failed: Invalid slug format was allowed';
EXCEPTION
  WHEN check_violation THEN
    RAISE NOTICE 'Test passed: Invalid slug format rejected';
END $$;

-- Test 5b: Invalid slug with special characters should fail
DO $$
BEGIN
  INSERT INTO pages (
    slug,
    full_path,
    depth,
    template,
    title,
    content
  ) VALUES (
    'invalid_slug!',  -- Special chars not allowed
    '/invalid-slug-2',
    0,
    'hub',
    'Invalid Slug 2',
    'This should fail'
  );
  RAISE EXCEPTION 'Test failed: Invalid slug with special chars was allowed';
EXCEPTION
  WHEN check_violation THEN
    RAISE NOTICE 'Test passed: Invalid slug with special chars rejected';
END $$;

-- =====================================================
-- TEST 6: Test Template Constraint
-- =====================================================

DO $$
BEGIN
  INSERT INTO pages (
    slug,
    full_path,
    depth,
    template,
    title,
    content
  ) VALUES (
    'invalid-template',
    '/invalid-template',
    0,
    'invalid-template-name',  -- Not in allowed list
    'Invalid Template',
    'This should fail'
  );
  RAISE EXCEPTION 'Test failed: Invalid template was allowed';
EXCEPTION
  WHEN check_violation THEN
    RAISE NOTICE 'Test passed: Invalid template rejected';
END $$;

-- =====================================================
-- TEST 7: Test Status Constraint
-- =====================================================

DO $$
BEGIN
  INSERT INTO pages (
    slug,
    full_path,
    depth,
    template,
    title,
    content,
    status
  ) VALUES (
    'invalid-status',
    '/invalid-status',
    0,
    'hub',
    'Invalid Status',
    'This should fail',
    'invalid-status'  -- Not in allowed list
  );
  RAISE EXCEPTION 'Test failed: Invalid status was allowed';
EXCEPTION
  WHEN check_violation THEN
    RAISE NOTICE 'Test passed: Invalid status rejected';
END $$;

-- =====================================================
-- TEST 8: Test Updated_At Trigger
-- =====================================================

-- Get initial updated_at
DO $$
DECLARE
  initial_updated_at TIMESTAMPTZ;
  new_updated_at TIMESTAMPTZ;
  page_id UUID;
BEGIN
  SELECT id, updated_at INTO page_id, initial_updated_at 
  FROM pages 
  WHERE slug = 'staining-concrete';
  
  -- Wait a moment
  PERFORM pg_sleep(1);
  
  -- Update the page
  UPDATE pages 
  SET title = 'Staining Concrete - Updated'
  WHERE id = page_id;
  
  -- Get new updated_at
  SELECT updated_at INTO new_updated_at 
  FROM pages 
  WHERE id = page_id;
  
  IF new_updated_at > initial_updated_at THEN
    RAISE NOTICE 'Test passed: updated_at trigger working';
  ELSE
    RAISE EXCEPTION 'Test failed: updated_at not updated';
  END IF;
END $$;

-- =====================================================
-- TEST 9: Test Cascade Delete
-- =====================================================

-- Create a test page with children
DO $$
DECLARE
  parent_id UUID;
  child_id UUID;
BEGIN
  -- Insert parent
  INSERT INTO pages (slug, full_path, depth, template, title, content)
  VALUES ('test-parent', '/test-parent', 0, 'hub', 'Test Parent', 'Content')
  RETURNING id INTO parent_id;
  
  -- Insert child
  INSERT INTO pages (parent_id, slug, full_path, depth, template, title, content)
  VALUES (parent_id, 'test-child', '/test-parent/test-child', 1, 'spoke', 'Test Child', 'Content')
  RETURNING id INTO child_id;
  
  -- Delete parent (should cascade to child)
  DELETE FROM pages WHERE id = parent_id;
  
  -- Check if child was deleted
  IF EXISTS (SELECT 1 FROM pages WHERE id = child_id) THEN
    RAISE EXCEPTION 'Test failed: Cascade delete did not work';
  ELSE
    RAISE NOTICE 'Test passed: Cascade delete working';
  END IF;
END $$;

-- =====================================================
-- TEST 10: Test Metadata JSONB
-- =====================================================

-- Insert page with metadata
INSERT INTO pages (
  slug,
  full_path,
  depth,
  template,
  title,
  content,
  metadata
) VALUES (
  'test-metadata',
  '/test-metadata',
  0,
  'hub',
  'Test Metadata',
  'Content',
  '{"layout": "grid", "columns": 3, "showChildGrid": true}'::jsonb
);

-- Query metadata
SELECT 
  slug,
  metadata->>'layout' as layout,
  (metadata->>'columns')::int as columns,
  (metadata->>'showChildGrid')::boolean as show_child_grid
FROM pages
WHERE slug = 'test-metadata';

-- =====================================================
-- CLEANUP
-- =====================================================

-- Delete test pages
DELETE FROM pages WHERE slug IN ('test-metadata');

-- =====================================================
-- SUMMARY
-- =====================================================

SELECT 
  COUNT(*) as total_pages,
  COUNT(*) FILTER (WHERE depth = 0) as root_pages,
  COUNT(*) FILTER (WHERE depth = 1) as level_1_pages,
  COUNT(*) FILTER (WHERE depth = 2) as level_2_pages,
  COUNT(*) FILTER (WHERE status = 'published') as published_pages,
  COUNT(*) FILTER (WHERE status = 'draft') as draft_pages
FROM pages
WHERE deleted_at IS NULL;

