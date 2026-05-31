-- =====================================================
-- Add link_type Column to Menu Items Table
-- =====================================================
-- Description: Adds explicit link_type column to support
-- three types of menu items:
-- - 'dropdown': Label-only dropdown trigger (no link)
-- - 'page': Link to internal page
-- - 'custom': Link to custom URL
--
-- This migration also updates constraints to:
-- - Allow NULL for both page_id and custom_url (for dropdowns)
-- - Enforce dropdowns are always top-level (no parent_id)
-- - Validate link_type values
--
-- Created: 2025-11-20
-- Related: BAM-30
-- =====================================================

-- =====================================================
-- 1. ADD link_type COLUMN
-- =====================================================

-- Add link_type column (NOT NULL with valid values)
ALTER TABLE menu_items
ADD COLUMN link_type TEXT NOT NULL DEFAULT 'page'
CHECK (link_type IN ('dropdown', 'page', 'custom'));

-- Add comment
COMMENT ON COLUMN menu_items.link_type IS 'Type of menu item: dropdown (label-only), page (internal link), or custom (external URL)';

-- =====================================================
-- 2. DROP OLD CONSTRAINT
-- =====================================================

-- Drop the old constraint that required either page_id OR custom_url
ALTER TABLE menu_items
DROP CONSTRAINT IF EXISTS link_source_required;

-- =====================================================
-- 3. ADD NEW CONSTRAINTS
-- =====================================================

-- Constraint: Validate link data based on link_type
ALTER TABLE menu_items
ADD CONSTRAINT link_source_valid CHECK (
  -- Dropdown: no link data, no parent
  (link_type = 'dropdown' AND page_id IS NULL AND custom_url IS NULL AND parent_id IS NULL) OR
  -- Page link: page_id required, no custom_url
  (link_type = 'page' AND page_id IS NOT NULL AND custom_url IS NULL) OR
  -- Custom URL: custom_url required, no page_id
  (link_type = 'custom' AND page_id IS NULL AND custom_url IS NOT NULL)
);

-- Constraint: Dropdowns must be top-level (no parent)
ALTER TABLE menu_items
ADD CONSTRAINT dropdown_must_be_top_level CHECK (
  link_type != 'dropdown' OR parent_id IS NULL
);

-- =====================================================
-- 4. CREATE INDEX FOR link_type
-- =====================================================

-- Index for filtering by link_type
CREATE INDEX idx_menu_items_link_type ON menu_items(link_type)
  WHERE deleted_at IS NULL;

-- =====================================================
-- 5. UPDATE TABLE COMMENT
-- =====================================================

COMMENT ON TABLE menu_items IS 'Menu items with support for dropdown menus (label-only), page links, and custom URLs';

