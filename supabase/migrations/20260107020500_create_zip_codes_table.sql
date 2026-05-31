-- =====================================================
-- Create zip_codes table for US ZIP code lookups
-- =====================================================
-- Used for location-based search and city matching

CREATE TABLE IF NOT EXISTS zip_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ZIP code (unique identifier)
  zip TEXT NOT NULL UNIQUE,
  
  -- Location info
  city_name TEXT NOT NULL,
  state_code TEXT NOT NULL,
  state_name TEXT NOT NULL,
  
  -- Coordinates
  lat NUMERIC NOT NULL,
  lng NUMERIC NOT NULL,
  coordinates GEOGRAPHY(POINT, 4326),
  
  -- Demographics
  population INTEGER,
  
  -- Link to cities table (nullable - not all ZIPs match a city in our system)
  city_id UUID REFERENCES cities(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE zip_codes ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_zip_codes_zip ON zip_codes(zip);
CREATE INDEX IF NOT EXISTS idx_zip_codes_city_name ON zip_codes(city_name);
CREATE INDEX IF NOT EXISTS idx_zip_codes_state_code ON zip_codes(state_code);
CREATE INDEX IF NOT EXISTS idx_zip_codes_city_id ON zip_codes(city_id) WHERE city_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_zip_codes_coordinates ON zip_codes USING GIST(coordinates);

-- Trigger to auto-populate coordinates from lat/lng
CREATE OR REPLACE FUNCTION update_zip_codes_coordinates()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
    NEW.coordinates = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_zip_codes_coordinates
  BEFORE INSERT OR UPDATE ON zip_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_zip_codes_coordinates();

-- RLS Policies (ZIP codes are public data)
CREATE POLICY "Anyone can read zip_codes"
  ON zip_codes FOR SELECT
  USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage zip_codes"
  ON zip_codes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM account_profiles
      WHERE account_profiles.id = auth.uid()
        AND account_profiles.is_admin = TRUE
    )
  );

-- Comments
COMMENT ON TABLE zip_codes IS 'US ZIP codes with coordinates for location-based search';
COMMENT ON COLUMN zip_codes.zip IS 'US ZIP code (5 digits)';
COMMENT ON COLUMN zip_codes.city_id IS 'Optional FK to cities table for ZIPs that match a city in our system';
