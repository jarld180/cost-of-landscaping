-- =====================================================
-- Auth Phase: Admin Roles & Pages RLS Hardening
-- =====================================================
-- 1) Create user_profiles table with is_admin flag
-- 2) Tighten RLS on pages so only admins can manage pages
-- =====================================================

-- 1. USER PROFILES TABLE ---------------------------------------

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE user_profiles IS 'Per-user profile and roles for application-level auth (e.g., is_admin)';
COMMENT ON COLUMN user_profiles.id IS 'FK to auth.users.id';
COMMENT ON COLUMN user_profiles.is_admin IS 'Indicates whether the user is an admin for the CMS';
COMMENT ON COLUMN user_profiles.created_at IS 'Timestamp when profile was created';
COMMENT ON COLUMN user_profiles.updated_at IS 'Timestamp when profile was last updated';

-- Reuse generic updated_at trigger function defined in pages migration
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own profile (but not modify it via the app)
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);


-- 2. PAGES RLS HARDENING ---------------------------------------

-- Drop broad authenticated-user policies
DROP POLICY IF EXISTS "Authenticated users can view all pages" ON pages;
DROP POLICY IF EXISTS "Authenticated users can create pages" ON pages;
DROP POLICY IF EXISTS "Authenticated users can update pages" ON pages;
DROP POLICY IF EXISTS "Authenticated users can delete pages" ON pages;

-- Keep existing public policy for published pages in place
-- (defined in 20251108035249_create_pages_table.sql as
--  "Public can view published pages")

-- Helper condition: check whether current user is an admin
-- Note: service_role bypasses RLS automatically.

CREATE POLICY "Admins can read all pages"
  ON pages FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.is_admin = TRUE
    )
  );

CREATE POLICY "Admins can create pages"
  ON pages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.is_admin = TRUE
    )
  );

CREATE POLICY "Admins can update pages"
  ON pages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.is_admin = TRUE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.is_admin = TRUE
    )
  );

CREATE POLICY "Admins can delete pages"
  ON pages FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.is_admin = TRUE
    )
  );

