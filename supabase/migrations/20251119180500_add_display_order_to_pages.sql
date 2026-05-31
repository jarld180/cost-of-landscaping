-- Migration: Add display_order column to pages table for custom ordering
-- This enables drag-and-drop reordering of pages within the same parent

-- Add display_order column with default value of 0
ALTER TABLE pages
ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0;

-- Create index for efficient ordering queries
CREATE INDEX idx_pages_parent_order ON pages(parent_id, display_order);

-- Backfill existing pages with sequential order based on full_path
-- This ensures existing pages maintain their alphabetical order initially
WITH ordered_pages AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY parent_id ORDER BY full_path) - 1 AS new_order
  FROM pages
  WHERE deleted_at IS NULL
)
UPDATE pages
SET display_order = ordered_pages.new_order
FROM ordered_pages
WHERE pages.id = ordered_pages.id;

-- Add comment to column for documentation
COMMENT ON COLUMN pages.display_order IS 'Custom display order for pages within the same parent. Lower numbers appear first.';
