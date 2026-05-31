-- Fix storage INSERT policy for contractors bucket
-- Allow uploads from:
-- 1. Authenticated admins (via uid() check)
-- 2. Service role / server-side operations (via auth.role() = 'service_role')

-- Drop the existing incomplete policy
DROP POLICY IF EXISTS "Admins can upload contractor images" ON storage.objects;

-- Create a proper policy that allows:
-- - Service role (for background jobs and server-side operations)
-- - Authenticated admins
CREATE POLICY "Allow contractor image uploads"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'contractors'
  AND (
    -- Service role can always upload (background jobs, server-side)
    auth.role() = 'service_role'
    OR
    -- Authenticated admins can upload
    EXISTS (
      SELECT 1 FROM account_profiles
      WHERE account_profiles.id = auth.uid()
      AND account_profiles.account_type = 'admin'
    )
  )
);

-- Note: Policy comment removed as storage.objects is owned by supabase_storage_admin
-- Policy: "Allow contractor image uploads" - Allows service role and authenticated admins to upload images to contractors bucket

