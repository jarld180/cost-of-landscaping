-- =====================================================
-- contractor_service_types junction table
-- Links contractors to their service types with AI confidence scores
-- =====================================================

CREATE TABLE contractor_service_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  service_type_id UUID NOT NULL REFERENCES service_types(id) ON DELETE CASCADE,
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  source TEXT NOT NULL DEFAULT 'ai_enrichment' CHECK (source IN ('ai_enrichment', 'manual', 'import')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT contractor_service_types_unique UNIQUE(contractor_id, service_type_id)
);

-- Indexes for efficient lookups
CREATE INDEX idx_contractor_service_types_contractor ON contractor_service_types(contractor_id);
CREATE INDEX idx_contractor_service_types_service ON contractor_service_types(service_type_id);

-- Enable RLS
ALTER TABLE contractor_service_types ENABLE ROW LEVEL SECURITY;

-- Public read access (for frontend filtering/display)
CREATE POLICY "contractor_service_types_public_read" 
  ON contractor_service_types 
  FOR SELECT 
  USING (true);

-- Admin write access
CREATE POLICY "contractor_service_types_admin_insert" 
  ON contractor_service_types 
  FOR INSERT 
  WITH CHECK (
    EXISTS (SELECT 1 FROM account_profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "contractor_service_types_admin_update" 
  ON contractor_service_types 
  FOR UPDATE 
  USING (
    EXISTS (SELECT 1 FROM account_profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "contractor_service_types_admin_delete" 
  ON contractor_service_types 
  FOR DELETE 
  USING (
    EXISTS (SELECT 1 FROM account_profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Comment for documentation
COMMENT ON TABLE contractor_service_types IS 'Junction table linking contractors to their service types with AI-inferred confidence scores';

