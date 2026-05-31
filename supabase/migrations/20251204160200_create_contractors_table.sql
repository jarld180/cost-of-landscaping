-- =====================================================
-- Contractor Profiles: Contractors Table Migration
-- =====================================================
-- Description: Creates the contractors table for business profiles
-- with Google Places integration and JSONB metadata
-- Created: 2025-12-04
-- Phase: 1 - Foundation (BAM-150)
-- =====================================================

-- =====================================================
-- 1. CREATE CONTRACTORS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS contractors (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Google Places Integration
  google_place_id TEXT UNIQUE,
  google_cid TEXT,

  -- Business Info
  company_name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,

  -- Location (FK to cities)
  city_id UUID REFERENCES cities(id) ON DELETE SET NULL,
  street_address TEXT,
  postal_code TEXT,

  -- Coordinates (simple NUMERIC, PostGIS deferred to Phase 4)
  lat NUMERIC,
  lng NUMERIC,

  -- Contact
  phone TEXT,
  website TEXT,
  email TEXT,

  -- Ratings
  rating NUMERIC(2,1) CHECK (rating >= 1.0 AND rating <= 5.0),
  review_count INTEGER DEFAULT 0,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending',
  images_processed BOOLEAN NOT NULL DEFAULT false,

  -- Flexible Metadata (categories, images, social_links, etc.)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Audit Fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Soft Delete
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_contractor_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT valid_contractor_status CHECK (status IN ('pending', 'active', 'suspended')),
  CONSTRAINT unique_contractor_slug_per_city UNIQUE (city_id, slug)
);

-- =====================================================
-- 2. ADD TABLE COMMENTS
-- =====================================================

COMMENT ON TABLE contractors IS 'Contractor business profiles with Google Places integration';
COMMENT ON COLUMN contractors.id IS 'Unique identifier for the contractor';
COMMENT ON COLUMN contractors.google_place_id IS 'Google Places ID for deduplication (from Apify)';
COMMENT ON COLUMN contractors.google_cid IS 'Google CID for direct links';
COMMENT ON COLUMN contractors.company_name IS 'Business name';
COMMENT ON COLUMN contractors.slug IS 'URL-friendly identifier (unique per city)';
COMMENT ON COLUMN contractors.description IS 'Business description (from Google or AI-generated)';
COMMENT ON COLUMN contractors.city_id IS 'Reference to city (NULL if geocoding failed)';
COMMENT ON COLUMN contractors.street_address IS 'Street address';
COMMENT ON COLUMN contractors.postal_code IS 'ZIP/postal code';
COMMENT ON COLUMN contractors.lat IS 'Latitude (NUMERIC for Phases 1-3, PostGIS in Phase 4)';
COMMENT ON COLUMN contractors.lng IS 'Longitude (NUMERIC for Phases 1-3, PostGIS in Phase 4)';
COMMENT ON COLUMN contractors.phone IS 'Business phone number';
COMMENT ON COLUMN contractors.website IS 'Business website URL';
COMMENT ON COLUMN contractors.email IS 'Business email';
COMMENT ON COLUMN contractors.rating IS 'Google rating (1.0-5.0)';
COMMENT ON COLUMN contractors.review_count IS 'Number of Google reviews';
COMMENT ON COLUMN contractors.status IS 'Moderation status: pending, active, suspended';
COMMENT ON COLUMN contractors.images_processed IS 'Whether async image enrichment has completed';
COMMENT ON COLUMN contractors.metadata IS 'JSONB: images[], pending_images[], categories[], social_links, opening_hours, geocoding_failed';
COMMENT ON COLUMN contractors.created_at IS 'Timestamp when contractor was created';
COMMENT ON COLUMN contractors.updated_at IS 'Timestamp when contractor was last updated';
COMMENT ON COLUMN contractors.deleted_at IS 'Timestamp when contractor was soft deleted (NULL if active)';

-- =====================================================
-- 3. CREATE INDEXES
-- =====================================================

-- Google Place ID lookup (deduplication)
CREATE UNIQUE INDEX idx_contractors_google_place_id ON contractors(google_place_id)
  WHERE google_place_id IS NOT NULL AND deleted_at IS NULL;

-- City + slug lookup (URL resolution)
CREATE INDEX idx_contractors_city_slug ON contractors(city_id, slug)
  WHERE deleted_at IS NULL;

-- City listing
CREATE INDEX idx_contractors_city_id ON contractors(city_id)
  WHERE deleted_at IS NULL;

-- Status filtering
CREATE INDEX idx_contractors_status ON contractors(status)
  WHERE deleted_at IS NULL;

-- Image processing queue
CREATE INDEX idx_contractors_pending_images ON contractors(images_processed)
  WHERE deleted_at IS NULL AND images_processed = false;

-- JSONB metadata queries (categories, etc.)
CREATE INDEX idx_contractors_metadata ON contractors USING GIN(metadata);

-- Active contractors for public display
CREATE INDEX idx_contractors_active ON contractors(city_id, company_name)
  WHERE deleted_at IS NULL AND status = 'active';

-- =====================================================
-- 4. CREATE UPDATED_AT TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_contractors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_contractors_updated_at
  BEFORE UPDATE ON contractors
  FOR EACH ROW
  EXECUTE FUNCTION update_contractors_updated_at();

-- =====================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;

-- Public read access for active, non-deleted contractors
CREATE POLICY "Public can view active contractors"
  ON contractors FOR SELECT
  USING (deleted_at IS NULL AND status = 'active');

-- Admin full access (requires account_profiles.is_admin)
CREATE POLICY "Admins have full access to contractors"
  ON contractors FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM account_profiles
      WHERE account_profiles.id = auth.uid()
      AND account_profiles.is_admin = true
    )
  );

-- =====================================================
-- 6. CITY DELETION PROTECTION
-- =====================================================
-- Note: Application-level check in LookupRepository.softDeleteCity()
-- prevents soft-deleting cities with active contractors.
-- The ON DELETE SET NULL allows the FK to gracefully handle edge cases.

