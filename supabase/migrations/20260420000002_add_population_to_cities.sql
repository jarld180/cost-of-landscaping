-- Migration: Add population column to cities table
-- Required for filtering cities over 30K population for listicle generation

ALTER TABLE cities
  ADD COLUMN IF NOT EXISTS population INT;

CREATE INDEX IF NOT EXISTS idx_cities_population
  ON cities (population DESC NULLS LAST)
  WHERE deleted_at IS NULL;
