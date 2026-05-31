-- =====================================================
-- DROP CANONICAL URL AUTO-SET TRIGGER
-- =====================================================
-- This trigger was causing issues by auto-populating canonical_url
-- with a relative path (full_path), which failed form validation
-- because the schema expects a full URL.
--
-- The frontend SEO composable (usePageSeo.ts) already handles
-- self-referencing canonicals by falling back to full_path when
-- canonical_url is null, so this trigger is unnecessary.
--
-- Related ticket: BAM-190
-- =====================================================

-- Drop the trigger
DROP TRIGGER IF EXISTS pages_set_canonical_url ON pages;

-- Drop the function (optional, but keeps things clean)
DROP FUNCTION IF EXISTS set_canonical_url();

-- Clear any existing relative path canonical_urls that were auto-set
-- These will now be handled by the frontend fallback logic
UPDATE pages 
SET canonical_url = NULL 
WHERE canonical_url IS NOT NULL 
  AND canonical_url NOT LIKE 'http://%' 
  AND canonical_url NOT LIKE 'https://%';

