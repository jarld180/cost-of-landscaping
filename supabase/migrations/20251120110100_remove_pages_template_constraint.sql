-- =====================================================
-- Remove Pages Table Template Constraint
-- =====================================================
-- Description: Remove CHECK constraint on pages.template to allow dynamic templates
-- Related: BAM-53 (Refactor: Database-Driven Page Template System)
-- Batch: 2/6 - Remove Pages Table Constraint
-- Issue: BAM-55
-- =====================================================

-- =====================================================
-- WHY THIS CHANGE?
-- =====================================================
-- The current CHECK constraint limits template values to:
-- 'hub', 'spoke', 'sub-spoke', 'article', 'custom', 'default'
--
-- This prevents adding new templates dynamically via the page_templates table.
-- By removing this constraint, we allow any template slug value, with validation
-- happening against the page_templates.slug column instead.
--
-- This enables:
-- 1. Dynamic template creation via admin UI
-- 2. Custom templates for specific use cases
-- 3. Template evolution without schema migrations
-- =====================================================

-- =====================================================
-- 1. DROP TEMPLATE CONSTRAINT
-- =====================================================

ALTER TABLE pages DROP CONSTRAINT IF EXISTS valid_template;

-- =====================================================
-- 2. UPDATE COLUMN COMMENT
-- =====================================================

COMMENT ON COLUMN pages.template IS 'Page template slug (validated against page_templates.slug). Defaults to ''default'' if not specified.';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify the migration:
--
-- 1. Check constraints (valid_template should be gone):
-- SELECT conname, pg_get_constraintdef(oid) as definition
-- FROM pg_constraint
-- WHERE conrelid = 'pages'::regclass AND contype = 'c';
--
-- 2. Test inserting a custom template value:
-- INSERT INTO pages (slug, full_path, depth, template, title, content, status)
-- VALUES ('test-custom', '/test-custom', 0, 'my-custom-template', 'Test Custom', 'Test content', 'draft')
-- RETURNING id, slug, template;
--
-- 3. Clean up test data:
-- DELETE FROM pages WHERE slug = 'test-custom';
-- =====================================================

