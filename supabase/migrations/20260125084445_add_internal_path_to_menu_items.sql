-- Add internal_path column and 'internal' link type to menu_items
-- This allows linking to internal routes like /find, /login without storing full URLs

-- 1. Add internal_path column
ALTER TABLE menu_items
ADD COLUMN IF NOT EXISTS internal_path TEXT;

COMMENT ON COLUMN menu_items.internal_path IS 'Internal route path (e.g., /find, /login) for internal link type';

-- 2. Drop the old constraint that validates link_type values
ALTER TABLE menu_items
DROP CONSTRAINT IF EXISTS menu_items_link_type_check;

-- 3. Add updated constraint that includes 'internal' as valid link_type
ALTER TABLE menu_items
ADD CONSTRAINT menu_items_link_type_check 
CHECK (link_type IN ('dropdown', 'page', 'internal', 'custom'));

-- 4. Drop the old link_source_valid constraint
ALTER TABLE menu_items
DROP CONSTRAINT IF EXISTS link_source_valid;

-- 5. Add updated constraint that validates link data based on link_type
ALTER TABLE menu_items
ADD CONSTRAINT link_source_valid CHECK (
  (link_type = 'dropdown' AND page_id IS NULL AND custom_url IS NULL AND internal_path IS NULL AND parent_id IS NULL) OR
  (link_type = 'page' AND page_id IS NOT NULL AND custom_url IS NULL AND internal_path IS NULL) OR
  (link_type = 'internal' AND internal_path IS NOT NULL AND page_id IS NULL AND custom_url IS NULL) OR
  (link_type = 'custom' AND custom_url IS NOT NULL AND page_id IS NULL AND internal_path IS NULL)
);

-- 6. Create index for internal_path
CREATE INDEX IF NOT EXISTS idx_menu_items_internal_path ON menu_items(internal_path)
  WHERE internal_path IS NOT NULL AND deleted_at IS NULL;
