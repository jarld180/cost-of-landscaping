-- =====================================================
-- Contractor Profiles: Service Types Table Migration
-- =====================================================
-- Description: Creates the service_types table for concrete services
-- with flat structure (no hierarchy for MVP)
-- Created: 2025-12-04
-- Phase: 1 - Foundation (BAM-150)
-- =====================================================

-- =====================================================
-- 1. CREATE SERVICE_TYPES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS service_types (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,

  -- Display
  icon TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,

  -- Status
  is_enabled BOOLEAN NOT NULL DEFAULT true,

  -- Flexible Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Audit Fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Soft Delete
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_service_type_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

-- =====================================================
-- 2. ADD TABLE COMMENTS
-- =====================================================

COMMENT ON TABLE service_types IS 'Concrete service categories for contractor classification';
COMMENT ON COLUMN service_types.id IS 'Unique identifier for the service type';
COMMENT ON COLUMN service_types.name IS 'Display name (e.g., "Stamped Concrete")';
COMMENT ON COLUMN service_types.slug IS 'URL-friendly identifier (e.g., "stamped-concrete")';
COMMENT ON COLUMN service_types.icon IS 'Icon identifier for UI display';
COMMENT ON COLUMN service_types.display_order IS 'Order for display in listings';
COMMENT ON COLUMN service_types.is_enabled IS 'Whether this service type is publicly visible';
COMMENT ON COLUMN service_types.metadata IS 'Flexible JSONB for future extensibility';
COMMENT ON COLUMN service_types.created_at IS 'Timestamp when service type was created';
COMMENT ON COLUMN service_types.updated_at IS 'Timestamp when service type was last updated';
COMMENT ON COLUMN service_types.deleted_at IS 'Timestamp when service type was soft deleted (NULL if active)';

-- =====================================================
-- 3. CREATE INDEXES
-- =====================================================

-- Fast slug lookups
CREATE INDEX idx_service_types_slug ON service_types(slug)
  WHERE deleted_at IS NULL;

-- Fast enabled type queries (for public display)
CREATE INDEX idx_service_types_enabled ON service_types(display_order)
  WHERE deleted_at IS NULL AND is_enabled = true;

-- JSONB metadata queries
CREATE INDEX idx_service_types_metadata ON service_types USING GIN(metadata);

-- =====================================================
-- 4. CREATE UPDATED_AT TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_service_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_service_types_updated_at
  BEFORE UPDATE ON service_types
  FOR EACH ROW
  EXECUTE FUNCTION update_service_types_updated_at();

-- =====================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE service_types ENABLE ROW LEVEL SECURITY;

-- Public read access for enabled, non-deleted service types
CREATE POLICY "Public can view enabled service types"
  ON service_types FOR SELECT
  USING (deleted_at IS NULL AND is_enabled = true);

-- Admin full access (requires account_profiles.is_admin)
CREATE POLICY "Admins have full access to service types"
  ON service_types FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM account_profiles
      WHERE account_profiles.id = auth.uid()
      AND account_profiles.is_admin = true
    )
  );

