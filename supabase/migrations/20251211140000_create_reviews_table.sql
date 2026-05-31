-- =====================================================
-- Reviews Table Migration
-- =====================================================
-- Description: Creates the reviews table to store Google reviews
-- imported from Apify JSON exports. Supports inline review 
-- enrichment during contractor import.
-- Created: 2025-12-11
-- Issue: BAM-226 (Phase 1 of BAM-225)
-- =====================================================

-- =====================================================
-- 1. CREATE REVIEWS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS reviews (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Key (cascade delete with contractor)
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  
  -- Google Review Identifiers (for deduplication)
  google_review_id TEXT NOT NULL,
  review_url TEXT,
  
  -- Reviewer Info
  reviewer_id TEXT,
  reviewer_url TEXT,
  reviewer_name TEXT NOT NULL,
  reviewer_photo_url TEXT,
  reviewer_review_count INTEGER DEFAULT 0,
  is_local_guide BOOLEAN DEFAULT false,
  
  -- Review Content
  review_text TEXT,
  review_text_translated TEXT,
  stars INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 5),
  likes_count INTEGER DEFAULT 0,
  
  -- Review Metadata
  published_at TIMESTAMPTZ,
  published_at_relative TEXT,
  review_origin TEXT DEFAULT 'Google',
  original_language TEXT,
  
  -- Owner Response
  owner_response_text TEXT,
  owner_response_date TIMESTAMPTZ,
  
  -- Rich Context (JSONB for flexibility)
  review_context JSONB DEFAULT '{}'::jsonb,
  detailed_rating JSONB DEFAULT '{}'::jsonb,
  review_image_urls TEXT[] DEFAULT '{}',
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_google_review UNIQUE (contractor_id, google_review_id)
);

-- =====================================================
-- 2. ADD TABLE COMMENTS
-- =====================================================

COMMENT ON TABLE reviews IS 'Google reviews imported from Apify JSON exports';
COMMENT ON COLUMN reviews.id IS 'Unique identifier for the review';
COMMENT ON COLUMN reviews.contractor_id IS 'FK to contractor this review belongs to';
COMMENT ON COLUMN reviews.google_review_id IS 'Google review ID for deduplication';
COMMENT ON COLUMN reviews.review_url IS 'Direct link to Google review';
COMMENT ON COLUMN reviews.reviewer_id IS 'Google reviewer account ID';
COMMENT ON COLUMN reviews.reviewer_url IS 'Link to reviewer Google Maps profile';
COMMENT ON COLUMN reviews.reviewer_name IS 'Display name of reviewer';
COMMENT ON COLUMN reviews.reviewer_photo_url IS 'Reviewer profile photo URL';
COMMENT ON COLUMN reviews.reviewer_review_count IS 'Number of reviews by this reviewer';
COMMENT ON COLUMN reviews.is_local_guide IS 'Whether reviewer is a Google Local Guide';
COMMENT ON COLUMN reviews.review_text IS 'Review text content';
COMMENT ON COLUMN reviews.review_text_translated IS 'Translated review text if applicable';
COMMENT ON COLUMN reviews.stars IS 'Star rating (1-5)';
COMMENT ON COLUMN reviews.likes_count IS 'Number of helpful votes on review';
COMMENT ON COLUMN reviews.published_at IS 'When review was originally published';
COMMENT ON COLUMN reviews.published_at_relative IS 'Relative time string (e.g., "a year ago")';
COMMENT ON COLUMN reviews.review_origin IS 'Source of review (default: Google)';
COMMENT ON COLUMN reviews.original_language IS 'ISO language code of original review';
COMMENT ON COLUMN reviews.owner_response_text IS 'Business owner response text';
COMMENT ON COLUMN reviews.owner_response_date IS 'When owner responded';
COMMENT ON COLUMN reviews.review_context IS 'JSONB: positive attributes, categories';
COMMENT ON COLUMN reviews.detailed_rating IS 'JSONB: sub-ratings if available';
COMMENT ON COLUMN reviews.review_image_urls IS 'Array of image URLs attached to review';
COMMENT ON COLUMN reviews.created_at IS 'When review was imported into system';
COMMENT ON COLUMN reviews.updated_at IS 'When review was last updated';

-- =====================================================
-- 3. CREATE INDEXES
-- =====================================================

-- Contractor lookup (for listing reviews by contractor)
CREATE INDEX idx_reviews_contractor_id ON reviews(contractor_id);

-- Chronological listing (newest first)
CREATE INDEX idx_reviews_published_at ON reviews(published_at DESC NULLS LAST);

-- Star rating filtering
CREATE INDEX idx_reviews_stars ON reviews(stars);

-- Composite for contractor + chronological
CREATE INDEX idx_reviews_contractor_published ON reviews(contractor_id, published_at DESC NULLS LAST);

-- =====================================================
-- 4. CREATE UPDATED_AT TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_reviews_updated_at();

-- =====================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Admin full access (read/write all reviews)
CREATE POLICY "Admins have full access to reviews"
  ON reviews FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM account_profiles
      WHERE account_profiles.id = auth.uid()
      AND account_profiles.is_admin = true
    )
  );

-- Public read access for reviews of active contractors
CREATE POLICY "Public can view reviews for active contractors"
  ON reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contractors c
      WHERE c.id = reviews.contractor_id
        AND c.status = 'active'
        AND c.deleted_at IS NULL
    )
  );

