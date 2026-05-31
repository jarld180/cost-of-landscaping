-- Add embed verification columns to contractors table
-- These columns support the hotlinked badge verification system

ALTER TABLE contractors ADD COLUMN IF NOT EXISTS embed_token UUID UNIQUE;
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS embed_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS embed_verified_at TIMESTAMPTZ;
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS embed_verified_domain TEXT;

-- Unique index for token lookups (partial index excludes nulls for efficiency)
CREATE UNIQUE INDEX IF NOT EXISTS idx_contractors_embed_token
  ON contractors(embed_token)
  WHERE embed_token IS NOT NULL;
