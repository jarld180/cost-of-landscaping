-- Fix menu slug unique constraint to support soft deletes
-- 
-- Problem: The original UNIQUE constraint on menus.slug prevented reusing slugs
-- from soft-deleted menus, causing 409 errors when trying to update a menu with
-- a slug that was previously used by a deleted menu.
--
-- Solution: Replace the global unique constraint with a partial unique index that
-- only enforces uniqueness on active (non-deleted) menus.

-- Drop the existing unique constraint on slug
ALTER TABLE menus DROP CONSTRAINT IF EXISTS menus_slug_key;

-- Create a partial unique index that only enforces uniqueness on non-deleted menus
-- This allows deleted menus to have the same slug as active menus
CREATE UNIQUE INDEX IF NOT EXISTS menus_slug_unique_when_not_deleted 
ON menus(slug) 
WHERE deleted_at IS NULL;

-- Add comment explaining the index
COMMENT ON INDEX menus_slug_unique_when_not_deleted IS 'Ensures slug uniqueness only for active (non-deleted) menus, allowing slug reuse after soft delete';

