-- Migration: Contractor Verification Tier System
-- Adds trusted_partner / fully_verified / basic_verified tiers
-- Powers ranking: trusted_partner always #1, then by tier, then by rating

-- =============================================================================
-- 1. ADD VERIFICATION COLUMNS TO CONTRACTORS
-- =============================================================================

ALTER TABLE contractors
  ADD COLUMN IF NOT EXISTS verification_tier TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_tier IN ('trusted_partner', 'fully_verified', 'basic_verified', 'unverified')),
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;

-- Numeric rank for correct sort order in non-RPC queries (Supabase client can't do CASE ordering)
ALTER TABLE contractors
  ADD COLUMN IF NOT EXISTS verification_rank INT GENERATED ALWAYS AS (
    CASE verification_tier
      WHEN 'trusted_partner' THEN 0
      WHEN 'fully_verified'  THEN 1
      WHEN 'basic_verified'  THEN 2
      ELSE 3
    END
  ) STORED;

-- Index for fast tier-based ordering
CREATE INDEX IF NOT EXISTS idx_contractors_verification_rank
  ON contractors (verification_rank ASC, rating DESC NULLS LAST);

-- =============================================================================
-- 2. CREATE CONTRACTOR_VERIFICATIONS TABLE (COI submissions)
-- =============================================================================

CREATE TABLE IF NOT EXISTS contractor_verifications (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id          UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  type                   TEXT NOT NULL DEFAULT 'coi' CHECK (type IN ('coi')),
  status                 TEXT NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  document_url           TEXT,                    -- Path in private contractor-documents bucket
  additional_insured_name TEXT,                   -- Must be "Cost of Concrete" to approve
  coverage_amount        NUMERIC,
  policy_expires_at      DATE,
  reviewed_by            UUID REFERENCES account_profiles(id),
  reviewed_at            TIMESTAMPTZ,
  rejection_reason       TEXT,
  submitted_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contractor_verifications_contractor_id
  ON contractor_verifications (contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractor_verifications_status
  ON contractor_verifications (status);
CREATE INDEX IF NOT EXISTS idx_contractor_verifications_expires
  ON contractor_verifications (policy_expires_at) WHERE status = 'approved';

-- Auto-update updated_at
CREATE OR REPLACE TRIGGER set_contractor_verifications_updated_at
  BEFORE UPDATE ON contractor_verifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 3. RLS POLICIES FOR CONTRACTOR_VERIFICATIONS
-- =============================================================================

ALTER TABLE contractor_verifications ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "Admins full access to contractor_verifications"
  ON contractor_verifications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM account_profiles
      WHERE id = auth.uid() AND is_admin = true AND status = 'active'
    )
  );

-- Contractors: can see and insert their own verifications only
CREATE POLICY "Contractors can view own verifications"
  ON contractor_verifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contractors c
      WHERE c.id = contractor_verifications.contractor_id
        AND c.claimed_by = auth.uid()
    )
  );

CREATE POLICY "Contractors can submit own verifications"
  ON contractor_verifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contractors c
      WHERE c.id = contractor_verifications.contractor_id
        AND c.claimed_by = auth.uid()
    )
  );

-- =============================================================================
-- 4. PRIVATE STORAGE BUCKET FOR COI DOCUMENTS
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contractor-documents',
  'contractor-documents',
  false,  -- private — not publicly accessible
  10485760,  -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Admins can read all documents
CREATE POLICY "Admins can read contractor documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'contractor-documents'
    AND EXISTS (
      SELECT 1 FROM account_profiles
      WHERE id = auth.uid() AND is_admin = true AND status = 'active'
    )
  );

-- Contractors can upload their own documents
CREATE POLICY "Contractors can upload their documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'contractor-documents'
    AND auth.uid() IS NOT NULL
  );

-- =============================================================================
-- 5. FUNCTION: auto-expire COI badges nightly
-- Downgrades verification_tier when insurance lapses
-- =============================================================================

CREATE OR REPLACE FUNCTION expire_lapsed_coi_verifications()
RETURNS void AS $$
BEGIN
  -- Mark expired COI records
  UPDATE contractor_verifications
  SET status = 'expired', updated_at = now()
  WHERE status = 'approved'
    AND policy_expires_at < CURRENT_DATE;

  -- Downgrade contractors whose only approved COI has now expired
  UPDATE contractors c
  SET
    verification_tier = CASE
      WHEN c.phone_verified THEN 'basic_verified'
      ELSE 'unverified'
    END,
    updated_at = now()
  WHERE c.verification_tier = 'fully_verified'
    AND NOT EXISTS (
      SELECT 1 FROM contractor_verifications cv
      WHERE cv.contractor_id = c.id
        AND cv.status = 'approved'
        AND (cv.policy_expires_at IS NULL OR cv.policy_expires_at >= CURRENT_DATE)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule nightly at 2am UTC
SELECT cron.schedule(
  'expire-lapsed-coi-verifications',
  '0 2 * * *',
  $$SELECT expire_lapsed_coi_verifications()$$
);

-- =============================================================================
-- 6. UPDATE search_contractors_by_radius RPC (add tier-based ordering)
-- =============================================================================

CREATE OR REPLACE FUNCTION search_contractors_by_radius(
  p_city_slug TEXT,
  p_radius_meters FLOAT DEFAULT 40233.6,
  p_category TEXT DEFAULT NULL,
  p_state_code TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0,
  p_order_by TEXT DEFAULT 'rating',
  p_order_direction TEXT DEFAULT 'desc'
)
RETURNS TABLE (
  id UUID,
  company_name TEXT,
  slug TEXT,
  description TEXT,
  street_address TEXT,
  postal_code TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  rating NUMERIC,
  review_count INT,
  status TEXT,
  metadata JSONB,
  images_processed BOOLEAN,
  lat NUMERIC,
  lng NUMERIC,
  city_id UUID,
  city_name TEXT,
  city_slug TEXT,
  state_code TEXT,
  distance_miles NUMERIC,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  verification_tier TEXT,
  phone_verified BOOLEAN
) AS $$
DECLARE
  city_record RECORD;
BEGIN
  SELECT c.id, c.coordinates, c.name, c.slug, c.state_code
  INTO city_record
  FROM cities c
  WHERE c.slug = p_city_slug
    AND c.deleted_at IS NULL
    AND (p_state_code IS NULL OR c.state_code = p_state_code)
  LIMIT 1;

  IF city_record IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    con.id,
    con.company_name,
    con.slug,
    con.description,
    con.street_address,
    con.postal_code,
    con.phone,
    con.email,
    con.website,
    con.rating,
    con.review_count,
    con.status,
    con.metadata,
    con.images_processed,
    con.lat,
    con.lng,
    con.city_id,
    city_record.name AS city_name,
    city_record.slug AS city_slug,
    city_record.state_code AS state_code,
    ROUND((ST_Distance(con.coordinates, city_record.coordinates) / 1609.34)::NUMERIC, 2) AS distance_miles,
    con.created_at,
    con.updated_at,
    con.verification_tier,
    con.phone_verified
  FROM contractors con
  WHERE con.deleted_at IS NULL
    AND con.status = 'active'
    AND con.coordinates IS NOT NULL
    AND ST_DWithin(con.coordinates, city_record.coordinates, p_radius_meters)
    AND (p_category IS NULL OR con.metadata->'categories' ? p_category)
  ORDER BY
    -- Tier ranking always takes priority over user-selected sort
    CASE con.verification_tier
      WHEN 'trusted_partner' THEN 0
      WHEN 'fully_verified'  THEN 1
      WHEN 'basic_verified'  THEN 2
      ELSE 3
    END ASC,
    -- Within each tier, apply user-selected sort
    CASE WHEN p_order_by = 'distance' AND p_order_direction = 'asc'  THEN ST_Distance(con.coordinates, city_record.coordinates) END ASC,
    CASE WHEN p_order_by = 'distance' AND p_order_direction = 'desc' THEN ST_Distance(con.coordinates, city_record.coordinates) END DESC,
    CASE WHEN p_order_by = 'rating'   AND p_order_direction = 'desc' THEN con.rating END DESC NULLS LAST,
    CASE WHEN p_order_by = 'rating'   AND p_order_direction = 'asc'  THEN con.rating END ASC NULLS LAST,
    CASE WHEN p_order_by = 'review_count' AND p_order_direction = 'desc' THEN con.review_count END DESC NULLS LAST,
    CASE WHEN p_order_by = 'review_count' AND p_order_direction = 'asc'  THEN con.review_count END ASC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================================================
-- 7. UPDATE search_contractors_by_coordinates RPC (add tier-based ordering)
-- =============================================================================

CREATE OR REPLACE FUNCTION search_contractors_by_coordinates(
  p_lat NUMERIC,
  p_lng NUMERIC,
  p_radius_meters FLOAT DEFAULT 40233.6,
  p_category TEXT DEFAULT NULL,
  p_min_rating NUMERIC DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0,
  p_order_by TEXT DEFAULT 'distance',
  p_order_direction TEXT DEFAULT 'asc'
)
RETURNS TABLE (
  id UUID,
  company_name TEXT,
  slug TEXT,
  description TEXT,
  street_address TEXT,
  postal_code TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  rating NUMERIC,
  review_count INT,
  status TEXT,
  metadata JSONB,
  images_processed BOOLEAN,
  lat NUMERIC,
  lng NUMERIC,
  city_id UUID,
  city_name TEXT,
  city_slug TEXT,
  state_code TEXT,
  distance_miles NUMERIC,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  verification_tier TEXT,
  phone_verified BOOLEAN
) AS $$
DECLARE
  search_point GEOGRAPHY;
BEGIN
  search_point := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography;

  RETURN QUERY
  SELECT
    con.id,
    con.company_name,
    con.slug,
    con.description,
    con.street_address,
    con.postal_code,
    con.phone,
    con.email,
    con.website,
    con.rating,
    con.review_count,
    con.status,
    con.metadata,
    con.images_processed,
    con.lat,
    con.lng,
    con.city_id,
    c.name AS city_name,
    c.slug AS city_slug,
    c.state_code AS state_code,
    ROUND((ST_Distance(con.coordinates, search_point) / 1609.34)::NUMERIC, 2) AS distance_miles,
    con.created_at,
    con.updated_at,
    con.verification_tier,
    con.phone_verified
  FROM contractors con
  LEFT JOIN cities c ON con.city_id = c.id
  WHERE con.deleted_at IS NULL
    AND con.status = 'active'
    AND con.coordinates IS NOT NULL
    AND ST_DWithin(con.coordinates, search_point, p_radius_meters)
    AND (p_category IS NULL OR con.metadata->'categories' ? p_category)
    AND (p_min_rating IS NULL OR con.rating >= p_min_rating)
  ORDER BY
    CASE con.verification_tier
      WHEN 'trusted_partner' THEN 0
      WHEN 'fully_verified'  THEN 1
      WHEN 'basic_verified'  THEN 2
      ELSE 3
    END ASC,
    CASE WHEN p_order_by = 'distance' AND p_order_direction = 'asc'  THEN ST_Distance(con.coordinates, search_point) END ASC,
    CASE WHEN p_order_by = 'distance' AND p_order_direction = 'desc' THEN ST_Distance(con.coordinates, search_point) END DESC,
    CASE WHEN p_order_by = 'rating'   AND p_order_direction = 'desc' THEN con.rating END DESC NULLS LAST,
    CASE WHEN p_order_by = 'rating'   AND p_order_direction = 'asc'  THEN con.rating END ASC NULLS LAST,
    CASE WHEN p_order_by = 'review_count' AND p_order_direction = 'desc' THEN con.review_count END DESC NULLS LAST,
    CASE WHEN p_order_by = 'review_count' AND p_order_direction = 'asc'  THEN con.review_count END ASC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Re-grant execute permissions
GRANT EXECUTE ON FUNCTION search_contractors_by_radius TO anon, authenticated;
GRANT EXECUTE ON FUNCTION search_contractors_by_coordinates TO anon, authenticated;
GRANT EXECUTE ON FUNCTION expire_lapsed_coi_verifications TO service_role;
