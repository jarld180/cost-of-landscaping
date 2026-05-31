---
discovery_date: 2026-01-22
last_updated: 2026-01-22
cartographer_version: 1.0
---

# Domain: Content Management

## Business Purpose

The Content Management domain provides a CMS for creating SEO-optimized content that supports the contractor directory. Content is primarily **AI-generated** via backend agents and published as articles or blog posts.

## Content Types

### Pages
Dynamic content stored in database with template-driven rendering.

| Field | Purpose |
|-------|---------|
| `slug` | URL path (e.g., `/about`, `/blog/concrete-trends`) |
| `title` | Page title |
| `content` | JSONB content matching template schema |
| `template_slug` | References page_templates |
| `status` | draft, published |
| `seo_title` | Override for meta title |
| `seo_description` | Meta description |

### Templates
Predefined content structures. Limited set focused on:
- **Articles/Blogs** - Primary content type
- **Landing pages** - Static informational content

```
page_templates
├── slug (e.g., "article", "landing")
├── name (display)
└── schema (JSONB field definitions)
```

## Content Workflow

```
1. AI agents generate content draft
2. Content saved with status: draft
3. Admin reviews in /admin/pages
4. Admin publishes → status: published
5. Public can view at /[slug]
```

### AI Content Creation
- Content created via backend AI agents
- Located in `server/services/ai/`
- Uses `AIOrchestrator` and agent system
- Quality controls include evals and grading

## Navigation

### Menus
Database-driven navigation:
```
menus
├── slug
├── name
├── location (header, footer)
└── menu_items[]
    ├── label
    ├── href
    ├── order
    └── link_type (internal, external)
```

## Rich Text

### Editor
TipTap-based rich text editor for content fields.

| Extension | Purpose |
|-----------|---------|
| StarterKit | Basic formatting |
| Image | Image embedding |
| BubbleMenu | Contextual toolbar |

### Image Upload
`useTipTapImageUpload` composable handles:
- Client-side upload to Supabase Storage
- URL insertion into editor
- `page-images` bucket

## Key Files

| File | Purpose |
|------|---------|
| `server/services/PageService.ts` | Page CRUD, slug generation |
| `server/services/PageTemplateService.ts` | Template management |
| `server/services/ai/AIOrchestrator.ts` | AI content generation |
| `app/components/templates/` | Template renderers |
| `app/composables/usePage.ts` | Page data fetching |

## Routes

### Admin
```
/admin/pages              # List all pages
/admin/pages/new          # Create page
/admin/pages/[id]/edit    # Edit page
```

### Public
```
/[...slug]                # Catch-all for CMS pages
```

## Gotchas

1. **Slug conflicts** - CMS slugs cannot match reserved routes (`/admin`, `/login`, state names)
2. **Template schema validation** - Content must match template's JSONB schema
3. **Draft visibility** - Only `published` pages visible to public (RLS enforced)
4. **AI-generated content** - Most content comes from AI, not manual entry

## SEO Considerations

- `seo_title` overrides `title` in meta tags
- `seo_description` used for meta description
- Structured data for articles
- Sitemap includes published pages only
