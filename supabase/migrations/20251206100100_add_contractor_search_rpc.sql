-- Migration: Add PostGIS RPC functions for contractor search
-- These functions enable efficient radius-based search from Supabase client

-- Function to search contractors within radius of a city
CREATE OR REPLACE FUNCTION search_contractors_by_radius(
  p_city_slug TEXT,
  p_radius_meters FLOAT DEFAULT 40233.6, -- 25 miles in meters
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
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  city_record RECORD;
BEGIN
  -- Get the city coordinates
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
    con.updated_at
  FROM contractors con
  WHERE con.deleted_at IS NULL
    AND con.status = 'active'
    AND con.coordinates IS NOT NULL
    AND ST_DWithin(con.coordinates, city_record.coordinates, p_radius_meters)
    AND (p_category IS NULL OR con.metadata->'categories' ? p_category)
  ORDER BY
    CASE WHEN p_order_by = 'distance' AND p_order_direction = 'asc' THEN ST_Distance(con.coordinates, city_record.coordinates) END ASC,
    CASE WHEN p_order_by = 'distance' AND p_order_direction = 'desc' THEN ST_Distance(con.coordinates, city_record.coordinates) END DESC,
    CASE WHEN p_order_by = 'rating' AND p_order_direction = 'desc' THEN con.rating END DESC NULLS LAST,
    CASE WHEN p_order_by = 'rating' AND p_order_direction = 'asc' THEN con.rating END ASC NULLS LAST,
    CASE WHEN p_order_by = 'review_count' AND p_order_direction = 'desc' THEN con.review_count END DESC NULLS LAST,
    CASE WHEN p_order_by = 'review_count' AND p_order_direction = 'asc' THEN con.review_count END ASC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to count contractors within radius (for pagination)
CREATE OR REPLACE FUNCTION count_contractors_by_radius(
  p_city_slug TEXT,
  p_radius_meters FLOAT DEFAULT 40233.6,
  p_category TEXT DEFAULT NULL,
  p_state_code TEXT DEFAULT NULL
)
RETURNS INT AS $$
DECLARE
  city_coords GEOGRAPHY;
  result_count INT;
BEGIN
  -- Get the city coordinates
  SELECT c.coordinates INTO city_coords
  FROM cities c
  WHERE c.slug = p_city_slug
    AND c.deleted_at IS NULL
    AND (p_state_code IS NULL OR c.state_code = p_state_code)
  LIMIT 1;
  
  IF city_coords IS NULL THEN
    RETURN 0;
  END IF;
  
  SELECT COUNT(*)::INT INTO result_count
  FROM contractors con
  WHERE con.deleted_at IS NULL
    AND con.status = 'active'
    AND con.coordinates IS NOT NULL
    AND ST_DWithin(con.coordinates, city_coords, p_radius_meters)
    AND (p_category IS NULL OR con.metadata->'categories' ? p_category);
  
  RETURN result_count;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION search_contractors_by_radius TO anon, authenticated;
GRANT EXECUTE ON FUNCTION count_contractors_by_radius TO anon, authenticated;

