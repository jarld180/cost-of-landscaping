-- Fix: search_contractors_by_radius was returning the SEARCH city's name/slug
-- for ALL contractors. Now JOINs cities on con.city_id so each contractor
-- gets its own city_name, city_slug, and state_code.

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
  search_city RECORD;
BEGIN
  SELECT c.id, c.coordinates, c.name, c.slug, c.state_code
  INTO search_city
  FROM cities c
  WHERE c.slug = p_city_slug
    AND c.deleted_at IS NULL
    AND (p_state_code IS NULL OR c.state_code = p_state_code)
  LIMIT 1;

  IF search_city IS NULL THEN
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
    contractor_city.name AS city_name,
    contractor_city.slug AS city_slug,
    contractor_city.state_code AS state_code,
    ROUND((ST_Distance(con.coordinates, search_city.coordinates) / 1609.34)::NUMERIC, 2) AS distance_miles,
    con.created_at,
    con.updated_at,
    con.verification_tier,
    con.phone_verified
  FROM contractors con
  JOIN cities contractor_city ON contractor_city.id = con.city_id AND contractor_city.deleted_at IS NULL
  WHERE con.deleted_at IS NULL
    AND con.status = 'active'
    AND con.coordinates IS NOT NULL
    AND ST_DWithin(con.coordinates, search_city.coordinates, p_radius_meters)
    AND (p_category IS NULL OR con.metadata->'categories' ? p_category)
  ORDER BY
    CASE con.verification_tier
      WHEN 'trusted_partner' THEN 0
      WHEN 'fully_verified'  THEN 1
      WHEN 'basic_verified'  THEN 2
      ELSE 3
    END ASC,
    CASE WHEN p_order_by = 'distance' AND p_order_direction = 'asc'  THEN ST_Distance(con.coordinates, search_city.coordinates) END ASC,
    CASE WHEN p_order_by = 'distance' AND p_order_direction = 'desc' THEN ST_Distance(con.coordinates, search_city.coordinates) END DESC,
    CASE WHEN p_order_by = 'rating'   AND p_order_direction = 'desc' THEN con.rating END DESC NULLS LAST,
    CASE WHEN p_order_by = 'rating'   AND p_order_direction = 'asc'  THEN con.rating END ASC NULLS LAST,
    CASE WHEN p_order_by = 'review_count' AND p_order_direction = 'desc' THEN con.review_count END DESC NULLS LAST,
    CASE WHEN p_order_by = 'review_count' AND p_order_direction = 'asc'  THEN con.review_count END ASC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION search_contractors_by_radius TO anon, authenticated;
