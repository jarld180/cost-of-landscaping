-- =====================================================
-- Dynamic Menus: Menu Items Table Migration
-- =====================================================
-- Description: Creates the menu_items table for managing
-- individual menu links with support for pages and custom URLs
-- Created: 2025-11-19
-- =====================================================

-- =====================================================
-- 1. CREATE MENU_ITEMS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS menu_items (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  page_id UUID REFERENCES pages(id) ON DELETE SET NULL,

  -- Link Configuration
  custom_url TEXT,
  label TEXT NOT NULL,
  description TEXT,

  -- Behavior
  open_in_new_tab BOOLEAN NOT NULL DEFAULT false,

  -- Ordering & Status
  display_order INTEGER NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT true,

  -- Flexible Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Audit Fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),

  -- Soft Delete
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT link_source_required CHECK (
    (page_id IS NOT NULL AND custom_url IS NULL) OR
    (page_id IS NULL AND custom_url IS NOT NULL)
  ),
  CONSTRAINT unique_order_per_parent UNIQUE (menu_id, parent_id, display_order)
);

-- =====================================================
-- 2. ADD TABLE COMMENTS
-- =====================================================

COMMENT ON TABLE menu_items IS 'Individual menu items with support for pages and custom URLs';
COMMENT ON COLUMN menu_items.id IS 'Unique identifier for the menu item';
COMMENT ON COLUMN menu_items.menu_id IS 'Reference to parent menu';
COMMENT ON COLUMN menu_items.parent_id IS 'Reference to parent item (NULL = top-level)';
COMMENT ON COLUMN menu_items.page_id IS 'Reference to page (mutually exclusive with custom_url)';
COMMENT ON COLUMN menu_items.custom_url IS 'Custom URL (mutually exclusive with page_id)';
COMMENT ON COLUMN menu_items.label IS 'Display text for the menu item';
COMMENT ON COLUMN menu_items.description IS 'Optional description (shown in dropdowns for child items)';
COMMENT ON COLUMN menu_items.open_in_new_tab IS 'Whether to open link in new tab';
COMMENT ON COLUMN menu_items.display_order IS 'Order within parent (0-indexed)';
COMMENT ON COLUMN menu_items.is_enabled IS 'Whether this item is visible';
COMMENT ON COLUMN menu_items.metadata IS 'Flexible JSONB for future extensibility';
COMMENT ON COLUMN menu_items.created_at IS 'Timestamp when item was created';
COMMENT ON COLUMN menu_items.updated_at IS 'Timestamp when item was last updated';
COMMENT ON COLUMN menu_items.created_by IS 'User who created the item';
COMMENT ON COLUMN menu_items.updated_by IS 'User who last updated the item';
COMMENT ON COLUMN menu_items.deleted_at IS 'Timestamp when item was soft deleted (NULL if active)';

-- =====================================================
-- 3. CREATE INDEXES
-- =====================================================

-- Fast menu item queries by menu
CREATE INDEX idx_menu_items_menu_id ON menu_items(menu_id)
  WHERE deleted_at IS NULL;

-- Fast parent-child queries
CREATE INDEX idx_menu_items_parent_id ON menu_items(parent_id)
  WHERE deleted_at IS NULL;

-- Fast page reference lookups
CREATE INDEX idx_menu_items_page_id ON menu_items(page_id)
  WHERE deleted_at IS NULL;

-- Fast ordering queries
CREATE INDEX idx_menu_items_order ON menu_items(menu_id, parent_id, display_order)
  WHERE deleted_at IS NULL;

-- JSONB metadata queries
CREATE INDEX idx_menu_items_metadata ON menu_items USING GIN(metadata);

-- =====================================================
-- 4. CREATE UPDATED_AT TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_menu_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW
  EXECUTE FUNCTION update_menu_items_updated_at();

-- =====================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Public read access for enabled items in enabled menus
CREATE POLICY "Public can view enabled menu items"
  ON menu_items FOR SELECT
  USING (
    deleted_at IS NULL
    AND is_enabled = true
    AND EXISTS (
      SELECT 1 FROM menus
      WHERE menus.id = menu_items.menu_id
      AND menus.deleted_at IS NULL
      AND menus.is_enabled = true
    )
  );

-- Admin full access
CREATE POLICY "Admins have full access to menu items"
  ON menu_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM account_profiles
      WHERE account_profiles.id = auth.uid()
      AND account_profiles.is_admin = true
    )
  );

