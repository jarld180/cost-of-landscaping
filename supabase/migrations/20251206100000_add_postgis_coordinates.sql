-- Migration: Add PostGIS Extension and GEOGRAPHY Columns
-- Phase 4: Public Frontend - Enable spatial queries for radius-based contractor search
--
-- This migration:
-- 1. Enables PostGIS extension
-- 2. Adds coordinates GEOGRAPHY column to contractors table
-- 3. Adds coordinates GEOGRAPHY column to cities table  
-- 4. Populates coordinates from existing lat/lng values
-- 5. Creates spatial indexes for performant queries

-- =============================================================================
-- STEP 1: Enable PostGIS Extension
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- =============================================================================
-- STEP 2: Add GEOGRAPHY Columns
-- =============================================================================

-- Add coordinates column to contractors table
ALTER TABLE contractors 
ADD COLUMN IF NOT EXISTS coordinates GEOGRAPHY(POINT, 4326);

-- Add coordinates column to cities table
ALTER TABLE cities 
ADD COLUMN IF NOT EXISTS coordinates GEOGRAPHY(POINT, 4326);

-- =============================================================================
-- STEP 3: Populate Coordinates from Existing lat/lng
-- =============================================================================

-- Populate contractors coordinates from lat/lng
-- ST_MakePoint takes (longitude, latitude) - note the order!
UPDATE contractors 
SET coordinates = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
WHERE lat IS NOT NULL 
  AND lng IS NOT NULL 
  AND coordinates IS NULL;

-- Populate cities coordinates from lat/lng
UPDATE cities 
SET coordinates = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
WHERE lat IS NOT NULL 
  AND lng IS NOT NULL 
  AND coordinates IS NULL;

-- =============================================================================
-- STEP 4: Create Spatial Indexes
-- =============================================================================

-- Create GIST index on contractors.coordinates for spatial queries
CREATE INDEX IF NOT EXISTS idx_contractors_coordinates 
ON contractors USING GIST (coordinates);

-- Create GIST index on cities.coordinates for spatial queries
CREATE INDEX IF NOT EXISTS idx_cities_coordinates 
ON cities USING GIST (coordinates);

-- =============================================================================
-- STEP 5: Create Trigger to Auto-Update Coordinates on lat/lng Change
-- =============================================================================

-- Function to update coordinates when lat/lng changes
CREATE OR REPLACE FUNCTION update_coordinates_from_latlng()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
    NEW.coordinates = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
  ELSE
    NEW.coordinates = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for contractors table
DROP TRIGGER IF EXISTS trigger_contractors_update_coordinates ON contractors;
CREATE TRIGGER trigger_contractors_update_coordinates
BEFORE INSERT OR UPDATE OF lat, lng ON contractors
FOR EACH ROW
EXECUTE FUNCTION update_coordinates_from_latlng();

-- Trigger for cities table
DROP TRIGGER IF EXISTS trigger_cities_update_coordinates ON cities;
CREATE TRIGGER trigger_cities_update_coordinates
BEFORE INSERT OR UPDATE OF lat, lng ON cities
FOR EACH ROW
EXECUTE FUNCTION update_coordinates_from_latlng();

-- =============================================================================
-- VERIFICATION (commented out for migration, useful for manual testing)
-- =============================================================================

-- Check contractors with coordinates:
-- SELECT id, company_name, lat, lng, ST_AsText(coordinates) FROM contractors WHERE coordinates IS NOT NULL LIMIT 5;

-- Check cities with coordinates:
-- SELECT id, name, lat, lng, ST_AsText(coordinates) FROM cities WHERE coordinates IS NOT NULL LIMIT 5;

-- Test radius query (find contractors within 25 miles of a city):
-- SELECT c.company_name, c.city_id, 
--        ST_Distance(c.coordinates, city.coordinates) / 1609.34 AS distance_miles
-- FROM contractors c
-- JOIN cities city ON c.city_id = city.id
-- WHERE ST_DWithin(c.coordinates, city.coordinates, 25 * 1609.34)
-- ORDER BY distance_miles
-- LIMIT 10;

