-- =====================================================
-- Add public read policy for published pages
-- =====================================================
-- This migration adds a limited RLS policy that allows
-- unauthenticated users to view ONLY published pages.
-- This is necessary for the public-facing website to work.
-- 
-- Draft and archived pages remain protected and can only
-- be viewed by admins.
-- =====================================================

-- Drop the policy if it exists (idempotent)
DROP POLICY IF EXISTS "Public users can view published pages" ON pages;

-- Create policy to allow public read access to published pages only
CREATE POLICY "Public users can view published pages"
  ON pages FOR SELECT
  USING (status = 'published' AND deleted_at IS NULL);

-- After this migration, the SELECT policies on pages are:
-- 1. "Admins can read all pages" - allows admins to read all pages
-- 2. "Public users can view published pages" - allows public to read only published pages
-- 
-- This ensures:
-- - Public users can view the website (published pages only)
-- - Draft/archived pages are protected (admin-only)
-- - Admin API endpoints remain protected by requireAdmin helper

