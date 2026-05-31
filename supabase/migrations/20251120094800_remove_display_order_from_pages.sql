-- Migration: Remove display_order column from pages table
-- Pages will now be ordered by created_at DESC instead of manual sorting

-- Drop the index first
DROP INDEX IF EXISTS idx_pages_parent_order;

-- Drop the display_order column
ALTER TABLE pages DROP COLUMN IF EXISTS display_order;

-- Add comment to document the change
COMMENT ON TABLE pages IS 'Pages table - ordered by created_at DESC (newest first)';

