-- =====================================================
-- Seed local development vault secrets for job runner
-- =====================================================
-- These secrets are required for pg_cron to dispatch background jobs.
-- For production, set these via Supabase Dashboard instead.

-- Only insert if not already present
DO $$
BEGIN
  -- JOB_RUNNER_API_URL: Local Nuxt server via Docker host
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'JOB_RUNNER_API_URL') THEN
    PERFORM vault.create_secret(
      'http://host.docker.internal:3001',
      'JOB_RUNNER_API_URL',
      'Local dev API URL for job runner'
    );
  END IF;

  -- JOB_RUNNER_SECRET: Shared secret for authenticating job execution
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'JOB_RUNNER_SECRET') THEN
    PERFORM vault.create_secret(
      '79c0497ce51a5917c5f2c63f30a1cbe9d78d333372d49500a2dee0c26482772f',
      'JOB_RUNNER_SECRET',
      'Local dev job runner secret - CHANGE IN PRODUCTION'
    );
  END IF;
END $$;
