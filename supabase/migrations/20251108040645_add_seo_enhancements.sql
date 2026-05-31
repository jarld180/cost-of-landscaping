-- =====================================================
-- SEO Enhancements Migration
-- =====================================================
-- Description: Adds comprehensive SEO fields for Schema.org, Open Graph,
-- Twitter Cards, canonical URLs, robots directives, and sitemap configuration
-- Created: 2025-11-08
-- Approach: Hybrid (critical fields as columns, extended data in metadata.seo)
-- =====================================================

-- =====================================================
-- 1. ADD SEO COLUMNS TO PAGES TABLE
-- =====================================================

-- Canonical URL (prevents duplicate content issues)
ALTER TABLE pages ADD COLUMN IF NOT EXISTS
  canonical_url TEXT;

COMMENT ON COLUMN pages.canonical_url IS 'Canonical URL for this page (prevents duplicate content penalties)';

-- Meta Robots Directives (control crawling and indexing)
ALTER TABLE pages ADD COLUMN IF NOT EXISTS
  meta_robots TEXT[] DEFAULT ARRAY['index', 'follow'];

COMMENT ON COLUMN pages.meta_robots IS 'Robots meta directives (e.g., index, follow, noindex, nofollow, noarchive, nosnippet)';

-- Focus Keyword (primary SEO keyword for the page)
ALTER TABLE pages ADD COLUMN IF NOT EXISTS
  focus_keyword TEXT;

COMMENT ON COLUMN pages.focus_keyword IS 'Primary SEO keyword/keyphrase for this page';

-- Sitemap Priority (0.0 to 1.0)
ALTER TABLE pages ADD COLUMN IF NOT EXISTS
  sitemap_priority DECIMAL(2,1) DEFAULT 0.5;

COMMENT ON COLUMN pages.sitemap_priority IS 'XML sitemap priority (0.0 to 1.0, where 1.0 is highest priority)';

-- Sitemap Change Frequency
ALTER TABLE pages ADD COLUMN IF NOT EXISTS
  sitemap_changefreq TEXT DEFAULT 'weekly';

COMMENT ON COLUMN pages.sitemap_changefreq IS 'XML sitemap change frequency (always, hourly, daily, weekly, monthly, yearly, never)';

-- Redirect URL (for 301/302 redirects)
ALTER TABLE pages ADD COLUMN IF NOT EXISTS
  redirect_url TEXT;

COMMENT ON COLUMN pages.redirect_url IS 'Redirect URL if this page should redirect to another location';

-- Redirect Type (301, 302, 307, 308)
ALTER TABLE pages ADD COLUMN IF NOT EXISTS
  redirect_type INTEGER DEFAULT 301;

COMMENT ON COLUMN pages.redirect_type IS 'HTTP redirect status code (301 = permanent, 302 = temporary, 307 = temporary preserve method, 308 = permanent preserve method)';

-- =====================================================
-- 2. ADD CONSTRAINTS
-- =====================================================

-- Sitemap priority must be between 0.0 and 1.0
ALTER TABLE pages ADD CONSTRAINT valid_sitemap_priority
  CHECK (sitemap_priority BETWEEN 0.0 AND 1.0);

-- Sitemap change frequency must be valid
ALTER TABLE pages ADD CONSTRAINT valid_sitemap_changefreq
  CHECK (sitemap_changefreq IN ('always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'));

-- Redirect type must be valid HTTP status code
ALTER TABLE pages ADD CONSTRAINT valid_redirect_type
  CHECK (redirect_type IN (301, 302, 307, 308));

-- Meta robots must contain valid directives
ALTER TABLE pages ADD CONSTRAINT valid_meta_robots
  CHECK (
    meta_robots <@ ARRAY['index', 'noindex', 'follow', 'nofollow', 'noarchive', 'nosnippet', 'noimageindex', 'notranslate', 'none', 'all']
  );

-- =====================================================
-- 3. ADD INDEXES FOR SEO QUERIES
-- =====================================================

-- Index for canonical URL lookups
CREATE INDEX idx_pages_canonical_url ON pages(canonical_url)
  WHERE canonical_url IS NOT NULL AND deleted_at IS NULL;

-- Index for sitemap generation (priority + changefreq)
CREATE INDEX idx_pages_sitemap ON pages(sitemap_priority DESC, sitemap_changefreq)
  WHERE status = 'published' AND deleted_at IS NULL;

-- Index for focus keyword searches
CREATE INDEX idx_pages_focus_keyword ON pages(focus_keyword)
  WHERE focus_keyword IS NOT NULL AND deleted_at IS NULL;

-- Index for redirect lookups
CREATE INDEX idx_pages_redirect_url ON pages(redirect_url)
  WHERE redirect_url IS NOT NULL AND deleted_at IS NULL;

-- =====================================================
-- 4. UPDATE EXISTING PAGES WITH DEFAULT SEO VALUES
-- =====================================================

-- Set default sitemap priority based on depth
-- Root pages (depth 0) = 1.0 priority
-- Level 1 pages = 0.8 priority
-- Level 2 pages = 0.6 priority
-- Level 3+ pages = 0.5 priority
UPDATE pages
SET sitemap_priority = CASE
  WHEN depth = 0 THEN 1.0
  WHEN depth = 1 THEN 0.8
  WHEN depth = 2 THEN 0.6
  ELSE 0.5
END
WHERE sitemap_priority = 0.5;  -- Only update if still default

-- Set canonical_url to full_path for all existing pages
UPDATE pages
SET canonical_url = full_path
WHERE canonical_url IS NULL;

-- =====================================================
-- 5. CREATE FUNCTION TO AUTO-SET CANONICAL URL
-- =====================================================

CREATE OR REPLACE FUNCTION set_canonical_url()
RETURNS TRIGGER AS $$
BEGIN
  -- If canonical_url is not explicitly set, default to full_path
  IF NEW.canonical_url IS NULL THEN
    NEW.canonical_url := NEW.full_path;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_canonical_url() IS 'Automatically sets canonical_url to full_path if not explicitly provided';

-- =====================================================
-- 6. CREATE TRIGGER FOR CANONICAL URL
-- =====================================================

CREATE TRIGGER pages_set_canonical_url
  BEFORE INSERT OR UPDATE ON pages
  FOR EACH ROW
  EXECUTE FUNCTION set_canonical_url();

COMMENT ON TRIGGER pages_set_canonical_url ON pages IS 'Automatically sets canonical_url to full_path if not provided';

-- =====================================================
-- 7. ADD COMMENTS FOR METADATA.SEO STRUCTURE
-- =====================================================

COMMENT ON COLUMN pages.metadata IS 'Template-specific metadata in JSONB format.

Structure:
{
  "seo": {
    "og": {
      "title": "Open Graph title",
      "description": "Open Graph description",
      "type": "article|website",
      "url": "https://example.com/page",
      "site_name": "Site Name",
      "locale": "en_US",
      "image": {
        "url": "https://example.com/image.jpg",
        "width": 1200,
        "height": 630,
        "alt": "Image description"
      }
    },
    "twitter": {
      "card": "summary_large_image|summary",
      "site": "@username",
      "creator": "@username",
      "title": "Twitter card title",
      "description": "Twitter card description",
      "image": "https://example.com/image.jpg"
    },
    "schema": {
      "@context": "https://schema.org",
      "@type": "Article|HowTo|FAQPage|LocalBusiness|...",
      "headline": "Article headline",
      "description": "Article description",
      "author": {...},
      "publisher": {...},
      "datePublished": "2025-11-08",
      "dateModified": "2025-11-08",
      "image": "https://example.com/image.jpg"
    }
  },
  "template": {
    // Template-specific data (layout, columns, etc.)
  }
}';
