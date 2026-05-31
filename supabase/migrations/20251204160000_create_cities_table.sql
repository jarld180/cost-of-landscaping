-- =====================================================
-- Contractor Profiles: Cities Table Migration
-- =====================================================
-- Description: Creates the cities table for contractor locations
-- with lat/lng coordinates and state association
-- Created: 2025-12-04
-- Phase: 1 - Foundation (BAM-150)
-- =====================================================

-- =====================================================
-- 1. CREATE CITIES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS cities (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  state_code TEXT NOT NULL,

  -- Coordinates (simple NUMERIC, PostGIS deferred to Phase 4)
  lat NUMERIC,
  lng NUMERIC,

  -- Flexible Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Audit Fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Soft Delete
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_city_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT valid_state_code CHECK (state_code ~ '^[A-Z]{2}$'),
  CONSTRAINT unique_city_slug_per_state UNIQUE (slug, state_code)
);

-- =====================================================
-- 2. ADD TABLE COMMENTS
-- =====================================================

COMMENT ON TABLE cities IS 'Cities for contractor locations with geographic coordinates';
COMMENT ON COLUMN cities.id IS 'Unique identifier for the city';
COMMENT ON COLUMN cities.name IS 'Display name of the city (e.g., "Charlotte")';
COMMENT ON COLUMN cities.slug IS 'URL-friendly identifier (e.g., "charlotte")';
COMMENT ON COLUMN cities.state_code IS 'Two-letter state abbreviation (e.g., "NC")';
COMMENT ON COLUMN cities.lat IS 'Latitude coordinate (NUMERIC for Phases 1-3, PostGIS in Phase 4)';
COMMENT ON COLUMN cities.lng IS 'Longitude coordinate (NUMERIC for Phases 1-3, PostGIS in Phase 4)';
COMMENT ON COLUMN cities.metadata IS 'Flexible JSONB for future extensibility';
COMMENT ON COLUMN cities.created_at IS 'Timestamp when city was created';
COMMENT ON COLUMN cities.updated_at IS 'Timestamp when city was last updated';
COMMENT ON COLUMN cities.deleted_at IS 'Timestamp when city was soft deleted (NULL if active)';

-- =====================================================
-- 3. CREATE INDEXES
-- =====================================================

-- Fast slug + state lookups (most common query)
CREATE INDEX idx_cities_slug_state ON cities(slug, state_code)
  WHERE deleted_at IS NULL;

-- Fast name lookups
CREATE INDEX idx_cities_name ON cities(name)
  WHERE deleted_at IS NULL;

-- JSONB metadata queries
CREATE INDEX idx_cities_metadata ON cities USING GIN(metadata);

-- =====================================================
-- 4. CREATE UPDATED_AT TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_cities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cities_updated_at
  BEFORE UPDATE ON cities
  FOR EACH ROW
  EXECUTE FUNCTION update_cities_updated_at();

-- =====================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

-- Public read access for non-deleted cities
CREATE POLICY "Public can view cities"
  ON cities FOR SELECT
  USING (deleted_at IS NULL);

-- Admin full access (requires account_profiles.is_admin)
CREATE POLICY "Admins have full access to cities"
  ON cities FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM account_profiles
      WHERE account_profiles.id = auth.uid()
      AND account_profiles.is_admin = true
    )
  );

