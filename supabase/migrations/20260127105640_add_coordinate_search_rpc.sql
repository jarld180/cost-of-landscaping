-- Migration: Add PostGIS RPC functions for coordinate-based contractor search
-- These functions enable radius-based search from user-provided coordinates (lat/lng)
-- Used when searching by ZIP code or user's geolocation

-- =============================================================================
-- Function to search contractors within radius of given coordinates
-- =============================================================================
CREATE OR REPLACE FUNCTION search_contractors_by_coordinates(
  p_lat NUMERIC,
  p_lng NUMERIC,
  p_radius_meters FLOAT DEFAULT 40233.6, -- 25 miles in meters
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
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  search_point GEOGRAPHY;
BEGIN
  -- Create a geography point from the provided coordinates
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
    con.updated_at
  FROM contractors con
  LEFT JOIN cities c ON con.city_id = c.id
  WHERE con.deleted_at IS NULL
    AND con.status = 'active'
    AND con.coordinates IS NOT NULL
    AND ST_DWithin(con.coordinates, search_point, p_radius_meters)
    AND (p_category IS NULL OR con.metadata->'categories' ? p_category)
    AND (p_min_rating IS NULL OR con.rating >= p_min_rating)
  ORDER BY
    CASE WHEN p_order_by = 'distance' AND p_order_direction = 'asc' THEN ST_Distance(con.coordinates, search_point) END ASC,
    CASE WHEN p_order_by = 'distance' AND p_order_direction = 'desc' THEN ST_Distance(con.coordinates, search_point) END DESC,
    CASE WHEN p_order_by = 'rating' AND p_order_direction = 'desc' THEN con.rating END DESC NULLS LAST,
    CASE WHEN p_order_by = 'rating' AND p_order_direction = 'asc' THEN con.rating END ASC NULLS LAST,
    CASE WHEN p_order_by = 'review_count' AND p_order_direction = 'desc' THEN con.review_count END DESC NULLS LAST,
    CASE WHEN p_order_by = 'review_count' AND p_order_direction = 'asc' THEN con.review_count END ASC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================================================
-- Function to count contractors within radius of given coordinates (for pagination)
-- =============================================================================
CREATE OR REPLACE FUNCTION count_contractors_by_coordinates(
  p_lat NUMERIC,
  p_lng NUMERIC,
  p_radius_meters FLOAT DEFAULT 40233.6,
  p_category TEXT DEFAULT NULL,
  p_min_rating NUMERIC DEFAULT NULL
)
RETURNS INT AS $$
DECLARE
  search_point GEOGRAPHY;
  result_count INT;
BEGIN
  -- Create a geography point from the provided coordinates
  search_point := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography;
  
  SELECT COUNT(*)::INT INTO result_count
  FROM contractors con
  WHERE con.deleted_at IS NULL
    AND con.status = 'active'
    AND con.coordinates IS NOT NULL
    AND ST_DWithin(con.coordinates, search_point, p_radius_meters)
    AND (p_category IS NULL OR con.metadata->'categories' ? p_category)
    AND (p_min_rating IS NULL OR con.rating >= p_min_rating);
  
  RETURN result_count;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================================================
-- Grant execute permissions
-- =============================================================================
GRANT EXECUTE ON FUNCTION search_contractors_by_coordinates TO anon, authenticated;
GRANT EXECUTE ON FUNCTION count_contractors_by_coordinates TO anon, authenticated;

-- =============================================================================
-- Comments
-- =============================================================================
COMMENT ON FUNCTION search_contractors_by_coordinates IS 'Search contractors within radius of given lat/lng coordinates. Used for ZIP code and geolocation-based searches.';
COMMENT ON FUNCTION count_contractors_by_coordinates IS 'Count contractors within radius of given lat/lng coordinates. Used for pagination.';
