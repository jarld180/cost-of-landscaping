-- =====================================================
-- Hub-and-Spoke CMS: Pages Table Migration
-- =====================================================
-- Description: Creates the core pages table for hierarchical content management
-- with template support, SEO fields, and flexible metadata
-- Created: 2025-11-08
-- =====================================================

-- =====================================================
-- 1. CREATE PAGES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS pages (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Hierarchy & Routing
  parent_id UUID REFERENCES pages(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  full_path TEXT NOT NULL,
  depth INTEGER NOT NULL DEFAULT 0,

  -- Template System
  template TEXT NOT NULL DEFAULT 'default',

  -- Content
  title TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,

  -- SEO & Metadata
  meta_title TEXT,
  meta_keywords TEXT[],
  og_image TEXT,

  -- Status & Publishing
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,

  -- Flexible Metadata (template-specific data)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Audit Fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),

  -- Soft Delete
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT unique_full_path UNIQUE (full_path),
  CONSTRAINT unique_slug_per_parent UNIQUE (parent_id, slug),
  CONSTRAINT valid_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT valid_template CHECK (
    template IN ('hub', 'spoke', 'sub-spoke', 'article', 'custom', 'default')
  ),
  CONSTRAINT valid_status CHECK (
    status IN ('draft', 'published', 'archived')
  )
);

-- =====================================================
-- 2. ADD TABLE COMMENTS
-- =====================================================

COMMENT ON TABLE pages IS 'Hierarchical page structure for hub-and-spoke CMS with template support';
COMMENT ON COLUMN pages.id IS 'Unique identifier for the page';
COMMENT ON COLUMN pages.parent_id IS 'Reference to parent page (NULL for root pages)';
COMMENT ON COLUMN pages.slug IS 'URL-friendly slug (lowercase, alphanumeric, hyphens only)';
COMMENT ON COLUMN pages.full_path IS 'Materialized path from root (e.g., /category/sub-page)';
COMMENT ON COLUMN pages.depth IS 'Depth in hierarchy (0 = root, 1 = child, etc.)';
COMMENT ON COLUMN pages.template IS 'Page template identifier: hub (depth 0), spoke (depth 1), sub-spoke (depth 2), article (depth 3+), custom, default';
COMMENT ON COLUMN pages.title IS 'Page title (used in navigation and SEO)';
COMMENT ON COLUMN pages.description IS 'Page description (used for meta description)';
COMMENT ON COLUMN pages.content IS 'Page content in Markdown format';
COMMENT ON COLUMN pages.meta_title IS 'Custom SEO title (falls back to title if NULL)';
COMMENT ON COLUMN pages.meta_keywords IS 'SEO keywords array';
COMMENT ON COLUMN pages.og_image IS 'Open Graph image URL for social sharing';
COMMENT ON COLUMN pages.status IS 'Publication status: draft, published, archived';
COMMENT ON COLUMN pages.published_at IS 'Timestamp when page was published';
COMMENT ON COLUMN pages.metadata IS 'Template-specific metadata in JSONB format (schema varies by template)';
COMMENT ON COLUMN pages.created_at IS 'Timestamp when page was created';
COMMENT ON COLUMN pages.updated_at IS 'Timestamp when page was last updated';
COMMENT ON COLUMN pages.created_by IS 'User who created the page';
COMMENT ON COLUMN pages.updated_by IS 'User who last updated the page';
COMMENT ON COLUMN pages.deleted_at IS 'Timestamp when page was soft deleted (NULL if active)';

-- =====================================================
-- 3. CREATE INDEXES
-- =====================================================

-- Fast path-based lookups (most common query)
CREATE INDEX idx_pages_full_path ON pages(full_path)
  WHERE deleted_at IS NULL;

-- Fast parent-child queries
CREATE INDEX idx_pages_parent_id ON pages(parent_id)
  WHERE deleted_at IS NULL;

-- Fast slug lookups within parent
CREATE INDEX idx_pages_slug_parent ON pages(slug, parent_id)
  WHERE deleted_at IS NULL;

-- Fast published page queries
CREATE INDEX idx_pages_status_published ON pages(status, published_at)
  WHERE deleted_at IS NULL AND status = 'published';

-- Fast depth-based queries
CREATE INDEX idx_pages_depth ON pages(depth)
  WHERE deleted_at IS NULL;

-- JSONB metadata queries (GIN index for flexible querying)
CREATE INDEX idx_pages_metadata ON pages USING GIN(metadata);

-- Template-based queries
CREATE INDEX idx_pages_template ON pages(template)
  WHERE deleted_at IS NULL;

-- =====================================================
-- 4. CREATE TRIGGER FUNCTION FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column() IS 'Automatically updates the updated_at timestamp on row update';

-- =====================================================
-- 5. CREATE TRIGGER
-- =====================================================

CREATE TRIGGER pages_updated_at
  BEFORE UPDATE ON pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TRIGGER pages_updated_at ON pages IS 'Automatically updates updated_at timestamp before each update';

-- =====================================================
-- 6. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 7. CREATE RLS POLICIES
-- =====================================================

-- Policy: Public can view published pages
CREATE POLICY "Public can view published pages"
  ON pages FOR SELECT
  USING (
    status = 'published'
    AND published_at <= NOW()
    AND deleted_at IS NULL
  );

COMMENT ON POLICY "Public can view published pages" ON pages IS 'Allows public access to published, non-deleted pages';

-- Policy: Authenticated users can view all pages
CREATE POLICY "Authenticated users can view all pages"
  ON pages FOR SELECT
  USING (auth.role() = 'authenticated');

COMMENT ON POLICY "Authenticated users can view all pages" ON pages IS 'Allows authenticated users to view all pages including drafts';

-- Policy: Authenticated users can create pages
CREATE POLICY "Authenticated users can create pages"
  ON pages FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

COMMENT ON POLICY "Authenticated users can create pages" ON pages IS 'Allows authenticated users to create new pages';

-- Policy: Authenticated users can update pages
CREATE POLICY "Authenticated users can update pages"
  ON pages FOR UPDATE
  USING (auth.role() = 'authenticated');

COMMENT ON POLICY "Authenticated users can update pages" ON pages IS 'Allows authenticated users to update existing pages';

-- Policy: Authenticated users can delete pages (soft delete)
CREATE POLICY "Authenticated users can delete pages"
  ON pages FOR DELETE
  USING (auth.role() = 'authenticated');

COMMENT ON POLICY "Authenticated users can delete pages" ON pages IS 'Allows authenticated users to delete pages (soft delete via updated_at trigger)';
