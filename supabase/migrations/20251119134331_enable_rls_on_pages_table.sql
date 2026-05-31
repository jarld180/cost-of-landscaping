-- =====================================================
-- Re-enable RLS on pages table
-- =====================================================
-- This migration ensures RLS is enabled on the pages table.
-- RLS was previously enabled in 20251108035249_create_pages_table.sql
-- but may have been disabled during development iterations.
-- This migration is idempotent and safe to run multiple times.
-- =====================================================

-- Enable RLS on pages table (idempotent - safe to run even if already enabled)
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

-- Verify all existing policies are still in place
-- (This is a comment for documentation - the policies should already exist from previous migrations)

-- Expected policies on pages table:
-- 1. "Admins can read all pages" (admin SELECT)
-- 2. "Admins can create pages" (admin INSERT)
-- 3. "Admins can update pages" (admin UPDATE)
-- 4. "Admins can delete pages" (admin DELETE)

