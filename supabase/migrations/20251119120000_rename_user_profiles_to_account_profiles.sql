-- =====================================================
-- Auth Phase: Introduce account_profiles for admin & business accounts
-- =====================================================
-- 1) Rename user_profiles -> account_profiles
-- 2) Add account_type + metadata columns
-- 3) Convert is_admin to computed column based on account_type
-- 4) Update pages RLS policies to reference account_profiles
-- =====================================================

-- 1. Rename user_profiles table to account_profiles
ALTER TABLE user_profiles RENAME TO account_profiles;

-- Ensure RLS remains enabled (idempotent)
ALTER TABLE account_profiles ENABLE ROW LEVEL SECURITY;

-- 2. Add account_type + metadata columns
ALTER TABLE account_profiles
  ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'business',
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 3. Backfill account_type for existing admin rows
UPDATE account_profiles
SET account_type = 'admin'
WHERE is_admin = TRUE;

-- 4. Refresh comments to reflect new table name / semantics
COMMENT ON TABLE account_profiles IS 'Per-account profile and roles for application-level auth (admin vs business, etc.)';
COMMENT ON COLUMN account_profiles.id IS 'FK to auth.users.id';
COMMENT ON COLUMN account_profiles.account_type IS 'Account type (e.g., admin, business).';
COMMENT ON COLUMN account_profiles.metadata IS 'Flexible JSONB bag for per-account settings and future expansion.';
COMMENT ON COLUMN account_profiles.created_at IS 'Timestamp when profile was created';
COMMENT ON COLUMN account_profiles.updated_at IS 'Timestamp when profile was last updated';

-- 5. Drop existing admin pages policies (they reference legacy user_profiles.is_admin)
DROP POLICY IF EXISTS "Admins can read all pages" ON pages;
DROP POLICY IF EXISTS "Admins can create pages" ON pages;
DROP POLICY IF EXISTS "Admins can update pages" ON pages;
DROP POLICY IF EXISTS "Admins can delete pages" ON pages;

-- 6. Replace legacy is_admin boolean with a computed column
ALTER TABLE account_profiles DROP COLUMN is_admin;

ALTER TABLE account_profiles
  ADD COLUMN is_admin BOOLEAN
    GENERATED ALWAYS AS (account_type = 'admin') STORED;

COMMENT ON COLUMN account_profiles.is_admin IS 'Computed flag indicating whether this account is an admin.';

-- 7. Re-create pages admin policies using account_profiles
CREATE POLICY "Admins can read all pages"
  ON pages FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM account_profiles
      WHERE account_profiles.id = auth.uid()
        AND account_profiles.is_admin = TRUE
    )
  );

CREATE POLICY "Admins can create pages"
  ON pages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM account_profiles
      WHERE account_profiles.id = auth.uid()
        AND account_profiles.is_admin = TRUE
    )
  );

CREATE POLICY "Admins can update pages"
  ON pages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM account_profiles
      WHERE account_profiles.id = auth.uid()
        AND account_profiles.is_admin = TRUE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM account_profiles
      WHERE account_profiles.id = auth.uid()
        AND account_profiles.is_admin = TRUE
    )
  );

CREATE POLICY "Admins can delete pages"
  ON pages FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM account_profiles
      WHERE account_profiles.id = auth.uid()
        AND account_profiles.is_admin = TRUE
    )
  );
