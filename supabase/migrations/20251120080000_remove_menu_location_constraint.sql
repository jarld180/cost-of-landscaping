-- =====================================================
-- Migration: Remove Menu Location Constraint
-- =====================================================
-- Description: Remove the at_least_one_location constraint to allow
--              menus to have neither header nor footer location.
--              This supports the new "None" location option in the UI.
-- =====================================================

-- Remove constraint that requires menu to be in at least one location
ALTER TABLE menus DROP CONSTRAINT IF EXISTS at_least_one_location;

-- Update table comment to reflect new behavior
COMMENT ON TABLE menus IS 'Navigation menus with location controls. A menu can be in Header, Footer, or None (not displayed).';

