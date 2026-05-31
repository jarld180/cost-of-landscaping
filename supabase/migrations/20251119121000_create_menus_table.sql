-- =====================================================
-- Dynamic Menus: Menus Table Migration
-- =====================================================
-- Description: Creates the menus table for managing
-- navigation menus with header/footer placement controls
-- Created: 2025-11-19
-- =====================================================

-- =====================================================
-- 1. CREATE MENUS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS menus (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,

  -- Placement Controls
  show_in_header BOOLEAN NOT NULL DEFAULT false,
  show_in_footer BOOLEAN NOT NULL DEFAULT false,

  -- Status
  is_enabled BOOLEAN NOT NULL DEFAULT true,

  -- Ordering (for multiple menus in same location)
  display_order INTEGER NOT NULL DEFAULT 0,

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
  CONSTRAINT valid_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT at_least_one_location CHECK (show_in_header = true OR show_in_footer = true)
);

-- =====================================================
-- 2. ADD TABLE COMMENTS
-- =====================================================

COMMENT ON TABLE menus IS 'Navigation menus with header/footer placement controls';
COMMENT ON COLUMN menus.id IS 'Unique identifier for the menu';
COMMENT ON COLUMN menus.name IS 'Display name of the menu (e.g., "Main Navigation")';
COMMENT ON COLUMN menus.slug IS 'URL-friendly identifier (e.g., "main-nav")';
COMMENT ON COLUMN menus.description IS 'Admin notes about the menu purpose';
COMMENT ON COLUMN menus.show_in_header IS 'Whether this menu appears in the header';
COMMENT ON COLUMN menus.show_in_footer IS 'Whether this menu appears in the footer';
COMMENT ON COLUMN menus.is_enabled IS 'Master on/off switch for the entire menu';
COMMENT ON COLUMN menus.display_order IS 'Order when multiple menus in same location';
COMMENT ON COLUMN menus.metadata IS 'Flexible JSONB for future extensibility';
COMMENT ON COLUMN menus.created_at IS 'Timestamp when menu was created';
COMMENT ON COLUMN menus.updated_at IS 'Timestamp when menu was last updated';
COMMENT ON COLUMN menus.created_by IS 'User who created the menu';
COMMENT ON COLUMN menus.updated_by IS 'User who last updated the menu';
COMMENT ON COLUMN menus.deleted_at IS 'Timestamp when menu was soft deleted (NULL if active)';

-- =====================================================
-- 3. CREATE INDEXES
-- =====================================================

-- Fast slug lookups
CREATE INDEX idx_menus_slug ON menus(slug)
  WHERE deleted_at IS NULL;

-- Fast header menu queries
CREATE INDEX idx_menus_header ON menus(show_in_header, display_order)
  WHERE deleted_at IS NULL AND is_enabled = true;

-- Fast footer menu queries
CREATE INDEX idx_menus_footer ON menus(show_in_footer, display_order)
  WHERE deleted_at IS NULL AND is_enabled = true;

-- JSONB metadata queries
CREATE INDEX idx_menus_metadata ON menus USING GIN(metadata);

-- =====================================================
-- 4. CREATE UPDATED_AT TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_menus_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_menus_updated_at
  BEFORE UPDATE ON menus
  FOR EACH ROW
  EXECUTE FUNCTION update_menus_updated_at();

-- =====================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE menus ENABLE ROW LEVEL SECURITY;

-- Public read access for enabled menus
CREATE POLICY "Public can view enabled menus"
  ON menus FOR SELECT
  USING (deleted_at IS NULL AND is_enabled = true);

-- Admin full access (requires account_profiles.is_admin)
CREATE POLICY "Admins have full access to menus"
  ON menus FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM account_profiles
      WHERE account_profiles.id = auth.uid()
      AND account_profiles.is_admin = true
    )
  );

