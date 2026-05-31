-- =====================================================
-- Migration: Create system_logs table
-- Description: Centralized logging for background jobs and system activity
-- Supports activity logs, audit trail, and error tracking
-- =====================================================

-- Create system_logs table
CREATE TABLE system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Log categorization
  log_type TEXT NOT NULL CHECK (log_type IN ('activity', 'audit', 'error')),
  category TEXT NOT NULL,
  action TEXT NOT NULL,
  
  -- Content
  message TEXT,
  level TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('debug', 'info', 'warn', 'error')),
  
  -- Context (what entity is this about)
  entity_type TEXT,
  entity_id UUID,
  
  -- Actor (who/what caused this)
  actor_type TEXT CHECK (actor_type IN ('user', 'system', 'job')),
  actor_id UUID,
  
  -- Flexible metadata
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Archival tracking (for future retention policies)
  archived_at TIMESTAMPTZ
);

-- Add comments for documentation
COMMENT ON TABLE system_logs IS 'Centralized logging for jobs, user actions, and system events. Supports indefinite retention with archival.';
COMMENT ON COLUMN system_logs.log_type IS 'Type: activity (system events), audit (user actions), error (failures)';
COMMENT ON COLUMN system_logs.category IS 'Category grouping (e.g., job, auth, cms, contractor)';
COMMENT ON COLUMN system_logs.action IS 'Specific action (e.g., job_started, job_completed, page_created)';
COMMENT ON COLUMN system_logs.message IS 'Human-readable log message';
COMMENT ON COLUMN system_logs.level IS 'Log level: debug, info, warn, error';
COMMENT ON COLUMN system_logs.entity_type IS 'Type of related entity (e.g., background_job, page, contractor)';
COMMENT ON COLUMN system_logs.entity_id IS 'UUID of the related entity';
COMMENT ON COLUMN system_logs.actor_type IS 'Who caused this: user, system, or job';
COMMENT ON COLUMN system_logs.actor_id IS 'ID of actor (user_id for user, job_id for job, null for system)';
COMMENT ON COLUMN system_logs.metadata IS 'Additional context data (JSONB)';
COMMENT ON COLUMN system_logs.archived_at IS 'When log was archived (null = active, for future retention)';

-- =====================================================
-- Indexes
-- =====================================================

-- Find logs by entity (e.g., all logs for a specific job)
CREATE INDEX idx_system_logs_entity ON system_logs(entity_type, entity_id, created_at DESC)
  WHERE entity_id IS NOT NULL;

-- Filter by category and action
CREATE INDEX idx_system_logs_category_action ON system_logs(category, action, created_at DESC);

-- Time-based queries for dashboard
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at DESC);

-- Find non-archived logs (active logs)
CREATE INDEX idx_system_logs_active ON system_logs(created_at DESC)
  WHERE archived_at IS NULL;

-- Error logs for monitoring
CREATE INDEX idx_system_logs_errors ON system_logs(created_at DESC)
  WHERE level = 'error';

-- =====================================================
-- Row Level Security
-- =====================================================

-- Enable RLS
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Admin-only read policy
CREATE POLICY "Admin users can read system logs"
  ON system_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM account_profiles
      WHERE account_profiles.id = auth.uid()
      AND account_profiles.account_type = 'admin'
    )
  );

-- System/service can insert logs (no user context required)
-- This uses service_role which bypasses RLS
-- But we also allow admins to insert for manual logging
CREATE POLICY "Admin users can create system logs"
  ON system_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM account_profiles
      WHERE account_profiles.id = auth.uid()
      AND account_profiles.account_type = 'admin'
    )
  );

-- No update policy - logs are immutable
-- No delete policy - logs should not be deleted (only archived)

