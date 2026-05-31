-- =====================================================
-- Contractor Profiles: Seed Service Types
-- =====================================================
-- Description: Inserts the 14 concrete service categories
-- Created: 2025-12-04
-- Phase: 1 - Foundation (BAM-150)
-- =====================================================

INSERT INTO service_types (name, slug, display_order, is_enabled) VALUES
  ('Concrete Driveways', 'concrete-driveways', 1, true),
  ('Concrete Patios', 'concrete-patios', 2, true),
  ('Stamped Concrete', 'stamped-concrete', 3, true),
  ('Concrete Foundations', 'concrete-foundations', 4, true),
  ('Sidewalks & Walkways', 'sidewalks-walkways', 5, true),
  ('Concrete Repair', 'concrete-repair', 6, true),
  ('Decorative Concrete', 'decorative-concrete', 7, true),
  ('Concrete Staining', 'concrete-staining', 8, true),
  ('Polished Concrete', 'polished-concrete', 9, true),
  ('Concrete Sealing', 'concrete-sealing', 10, true),
  ('Pool Decks', 'pool-decks', 11, true),
  ('Retaining Walls', 'retaining-walls', 12, true),
  ('Garage Floors', 'garage-floors', 13, true),
  ('Commercial Concrete', 'commercial-concrete', 14, true)
ON CONFLICT (slug) DO NOTHING;

