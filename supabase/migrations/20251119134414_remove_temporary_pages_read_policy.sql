-- =====================================================
-- Remove temporary public read policy on pages table
-- =====================================================
-- This migration removes the temporary policy that allowed
-- unauthenticated users to view all non-deleted pages.
-- After this migration, only admins can read pages via the API.
-- Public users can still access published pages through the
-- /api/pages/by-path endpoint which has its own logic.
-- =====================================================

-- Drop the temporary policy that was allowing public read access
DROP POLICY IF EXISTS "Temporary: Allow viewing all non-deleted pages" ON pages;

-- After this migration, the only SELECT policies on pages are:
-- 1. "Admins can read all pages" - allows admins to read all pages
-- 
-- Note: Public access to published pages is handled at the application
-- level in /api/pages/by-path endpoint, not through RLS policies.

