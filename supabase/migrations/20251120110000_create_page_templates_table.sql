-- =====================================================
-- Create Page Templates Table
-- =====================================================
-- Description: Migrate from hardcoded templates to database-driven system
-- Related: BAM-53 (Refactor: Database-Driven Page Template System)
-- Batch: 1/6 - Database Foundation
-- Issue: BAM-54
-- =====================================================

-- =====================================================
-- 1. CREATE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS page_templates (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,

  -- Component Mapping
  component_name TEXT NOT NULL,

  -- Metadata Configuration
  metadata_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  default_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- UI Configuration
  color TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,

  -- Status
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,

  -- Audit Fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),

  -- Soft Delete
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT valid_component_name_format CHECK (component_name ~ '^[A-Z][a-zA-Z0-9]*$')
);

-- =====================================================
-- 2. ADD TABLE COMMENTS
-- =====================================================

COMMENT ON TABLE page_templates IS 'Database-driven page template system for flexible template management';
COMMENT ON COLUMN page_templates.id IS 'Unique identifier for the template';
COMMENT ON COLUMN page_templates.slug IS 'URL-friendly identifier (kebab-case)';
COMMENT ON COLUMN page_templates.name IS 'Display name for the template';
COMMENT ON COLUMN page_templates.description IS 'Description of template purpose and usage';
COMMENT ON COLUMN page_templates.component_name IS 'Vue component name (PascalCase)';
COMMENT ON COLUMN page_templates.metadata_schema IS 'JSON Schema for validating template metadata';
COMMENT ON COLUMN page_templates.default_metadata IS 'Default metadata values for new pages';
COMMENT ON COLUMN page_templates.color IS 'Hex color for UI badges and visual identification';
COMMENT ON COLUMN page_templates.display_order IS 'Order for displaying templates in UI';
COMMENT ON COLUMN page_templates.is_enabled IS 'Whether template is available for use';
COMMENT ON COLUMN page_templates.is_system IS 'System templates cannot be deleted';
COMMENT ON COLUMN page_templates.created_at IS 'Timestamp when template was created';
COMMENT ON COLUMN page_templates.updated_at IS 'Timestamp when template was last updated';
COMMENT ON COLUMN page_templates.created_by IS 'User who created the template';
COMMENT ON COLUMN page_templates.updated_by IS 'User who last updated the template';
COMMENT ON COLUMN page_templates.deleted_at IS 'Timestamp when template was soft-deleted';

-- =====================================================
-- 3. CREATE INDEXES
-- =====================================================

CREATE INDEX idx_page_templates_slug ON page_templates(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_page_templates_enabled ON page_templates(is_enabled) WHERE deleted_at IS NULL;
CREATE INDEX idx_page_templates_display_order ON page_templates(display_order) WHERE deleted_at IS NULL;

-- =====================================================
-- 4. CREATE TRIGGER FOR UPDATED_AT
-- =====================================================

CREATE TRIGGER page_templates_updated_at
  BEFORE UPDATE ON page_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE page_templates ENABLE ROW LEVEL SECURITY;

-- Public read access for enabled templates
CREATE POLICY "Public can view enabled templates"
  ON page_templates FOR SELECT
  USING (deleted_at IS NULL AND is_enabled = true);

-- Admin full access (requires account_profiles.is_admin)
CREATE POLICY "Admins have full access to templates"
  ON page_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM account_profiles
      WHERE account_profiles.id = auth.uid()
      AND account_profiles.is_admin = true
    )
  );

-- =====================================================
-- 6. SEED INITIAL TEMPLATES
-- =====================================================
-- Migrating 6 templates from server/config/templates.ts
-- All marked as system templates (is_system = true)
-- Using neutral gray color (#6B7280) for all templates
-- =====================================================

-- 1. Hub Template
INSERT INTO page_templates (slug, name, description, component_name, metadata_schema, default_metadata, color, display_order, is_enabled, is_system)
VALUES (
  'hub',
  'Hub Template',
  'Top-level category page with child grid display',
  'HubTemplate',
  '{
    "type": "object",
    "properties": {
      "layout": {"type": "string", "enum": ["grid", "list", "featured"]},
      "columns": {"type": "number", "enum": [2, 3, 4]},
      "showChildGrid": {"type": "boolean"},
      "heroImage": {"type": "string", "format": "uri"},
      "featuredPages": {"type": "array", "items": {"type": "string", "format": "uuid"}},
      "callToAction": {
        "type": "object",
        "properties": {
          "text": {"type": "string"},
          "url": {"type": "string"},
          "style": {"type": "string", "enum": ["primary", "secondary", "outline"]}
        },
        "required": ["text", "url"]
      }
    },
    "required": ["layout", "showChildGrid"]
  }'::jsonb,
  '{
    "layout": "grid",
    "columns": 3,
    "showChildGrid": true
  }'::jsonb,
  '#6B7280',
  1,
  true,
  true
);

-- 2. Spoke Template
INSERT INTO page_templates (slug, name, description, component_name, metadata_schema, default_metadata, color, display_order, is_enabled, is_system)
VALUES (
  'spoke',
  'Spoke Template',
  'Mid-level content page with sidebar',
  'SpokeTemplate',
  '{
    "type": "object",
    "properties": {
      "showSidebar": {"type": "boolean"},
      "sidebarPosition": {"type": "string", "enum": ["left", "right"]},
      "sidebarContent": {"type": "string", "enum": ["toc", "related", "custom"]},
      "relatedPages": {"type": "array", "items": {"type": "string", "format": "uuid"}},
      "showChildList": {"type": "boolean"},
      "callToAction": {
        "type": "object",
        "properties": {
          "text": {"type": "string"},
          "url": {"type": "string"},
          "style": {"type": "string", "enum": ["primary", "secondary", "outline"]}
        },
        "required": ["text", "url"]
      }
    },
    "required": ["showSidebar", "showChildList"]
  }'::jsonb,
  '{
    "showSidebar": true,
    "sidebarPosition": "right",
    "sidebarContent": "toc",
    "showChildList": true
  }'::jsonb,
  '#6B7280',
  2,
  true,
  true
);

-- 3. Sub-Spoke Template
INSERT INTO page_templates (slug, name, description, component_name, metadata_schema, default_metadata, color, display_order, is_enabled, is_system)
VALUES (
  'sub-spoke',
  'Sub-Spoke Template',
  'Detailed content page with table of contents',
  'SubSpokeTemplate',
  '{
    "type": "object",
    "properties": {
      "showTableOfContents": {"type": "boolean"},
      "tocPosition": {"type": "string", "enum": ["sidebar", "top", "floating"]},
      "showBreadcrumbs": {"type": "boolean"},
      "showChildList": {"type": "boolean"},
      "relatedPages": {"type": "array", "items": {"type": "string", "format": "uuid"}},
      "showAuthor": {"type": "boolean"},
      "showPublishDate": {"type": "boolean"}
    },
    "required": ["showTableOfContents", "showBreadcrumbs", "showChildList"]
  }'::jsonb,
  '{
    "showTableOfContents": true,
    "tocPosition": "sidebar",
    "showBreadcrumbs": true,
    "showChildList": true
  }'::jsonb,
  '#6B7280',
  3,
  true,
  true
);

-- 4. Article Template
INSERT INTO page_templates (slug, name, description, component_name, metadata_schema, default_metadata, color, display_order, is_enabled, is_system)
VALUES (
  'article',
  'Article Template',
  'Deep-level article page',
  'ArticleTemplate',
  '{
    "type": "object",
    "properties": {
      "showTableOfContents": {"type": "boolean"},
      "showBreadcrumbs": {"type": "boolean"},
      "showAuthor": {"type": "boolean"},
      "showPublishDate": {"type": "boolean"},
      "showReadingTime": {"type": "boolean"},
      "relatedArticles": {"type": "array", "items": {"type": "string", "format": "uuid"}},
      "tags": {"type": "array", "items": {"type": "string"}}
    },
    "required": ["showTableOfContents", "showBreadcrumbs"]
  }'::jsonb,
  '{
    "showTableOfContents": true,
    "showBreadcrumbs": true,
    "showAuthor": true,
    "showPublishDate": true,
    "showReadingTime": true
  }'::jsonb,
  '#6B7280',
  4,
  true,
  true
);

-- 5. Default Template
INSERT INTO page_templates (slug, name, description, component_name, metadata_schema, default_metadata, color, display_order, is_enabled, is_system)
VALUES (
  'default',
  'Default Template',
  'Basic fallback template',
  'DefaultTemplate',
  '{
    "type": "object",
    "properties": {
      "showBreadcrumbs": {"type": "boolean"},
      "showChildList": {"type": "boolean"}
    }
  }'::jsonb,
  '{
    "showBreadcrumbs": true,
    "showChildList": false
  }'::jsonb,
  '#6B7280',
  5,
  true,
  true
);

-- 6. Custom Template
INSERT INTO page_templates (slug, name, description, component_name, metadata_schema, default_metadata, color, display_order, is_enabled, is_system)
VALUES (
  'custom',
  'Custom Template',
  'Fully customizable template',
  'DefaultTemplate',
  '{
    "type": "object",
    "additionalProperties": true
  }'::jsonb,
  '{}'::jsonb,
  '#6B7280',
  6,
  true,
  true
);

