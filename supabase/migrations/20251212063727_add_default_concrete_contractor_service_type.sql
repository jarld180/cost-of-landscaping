-- =====================================================
-- Insert default "Concrete Contractor" service type
-- Used as fallback when AI extraction fails
-- =====================================================

INSERT INTO service_types (name, slug, display_order, is_enabled, metadata)
VALUES (
  'Concrete Contractor', 
  'concrete-contractor', 
  0, 
  true,
  '{"description": "General concrete contractor - default fallback category"}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

