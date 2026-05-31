---
discovery_date: 2026-01-22
last_updated: 2026-01-22
source_patterns: ["app/components/**", "server/services/**", "server/repositories/**", "app/composables/**"]
confidence: high
cartographer_version: 1.0
---

# Modules & Components

## Server Services

Business logic layer in `server/services/`.

### Core Services

| Service | File | Responsibility |
|---------|------|----------------|
| **PageService** | `PageService.ts` | CMS page CRUD, slug generation |
| **PageTemplateService** | `PageTemplateService.ts` | Page template management |
| **MenuService** | `MenuService.ts` | Menu/navigation management |
| **JobService** | `JobService.ts` | Background job orchestration |
| **SystemLogService** | `SystemLogService.ts` | System event logging |

### Contractor Services

| Service | File | Responsibility |
|---------|------|----------------|
| **ImportService** | `ImportService.ts` | CSV/bulk contractor import |
| **ContractorEnrichmentService** | `ContractorEnrichmentService.ts` | Data enrichment pipeline |
| **ImageEnrichmentService** | `ImageEnrichmentService.ts` | Image scraping/processing |
| **ReviewImageService** | `ReviewImageService.ts` | Review image handling |
| **GeocodingService** | `GeocodingService.ts` | Address→coordinates |

### AI Services

| Service | File | Responsibility |
|---------|------|----------------|
| **AIExtractionService** | `AIExtractionService.ts` | AI data extraction |
| **AIJobQueueService** | `AIJobQueueService.ts` | AI job management |
| **DataForSeoService** | `DataForSeoService.ts` | DataForSEO integration |
| **DataForSeoLabsService** | `DataForSeoLabsService.ts` | DataForSEO Labs API |

### Communication Services

| Service | File | Responsibility |
|---------|------|----------------|
| **EmailService** | `EmailService.ts` | Transactional email (Resend) |
| **WebCrawlerService** | `WebCrawlerService.ts` | Web page scraping |

---

## Server Repositories

Data access layer in `server/repositories/`.

| Repository | Table(s) | Purpose |
|------------|----------|---------|
| **ContractorRepository** | `contractors`, `cities` | Contractor CRUD, search |
| **PageRepository** | `pages` | Page CRUD |
| **PageTemplateRepository** | `page_templates` | Template definitions |
| **MenuRepository** | `menus` | Menu CRUD |
| **MenuItemRepository** | `menu_items` | Menu item CRUD |
| **JobRepository** | `background_jobs` | Job persistence |
| **ImportJobRepository** | `import_jobs` | Import job tracking |
| **LookupRepository** | `cities`, `service_types` | Reference data |
| **ReviewRepository** | - | Review data access |
| **SystemLogRepository** | `system_logs` | Log persistence |
| **AIArticleJobRepository** | `ai_article_jobs` | AI article jobs |
| **AIEvalRepository** | - | AI evaluation data |
| **AIGoldenExampleRepository** | - | AI training examples |
| **AIJobStepRepository** | - | AI job steps |
| **AIPersonaRepository** | `ai_personas` | AI persona management |

---

## Frontend Composables

Reusable Vue composition functions in `app/composables/`.

### Admin Composables

| Composable | Purpose |
|------------|---------|
| **useAdminPages** | Page CRUD for admin |
| **useAdminContractors** | Contractor CRUD for admin |
| **useAdminContractorAccounts** | Contractor account management |
| **useAdminSystemAccounts** | System user management |
| **useAdminClaims** | Business claim management |

### Data Composables

| Composable | Purpose |
|------------|---------|
| **useMenus** | Menu data fetching |
| **useMenuItems** | Menu item operations |
| **usePage** | Single page fetching |
| **useTemplateSchema** | Page template schema |
| **useAuthUser** | Current user state |

### SEO Composables

| Composable | Purpose |
|------------|---------|
| **useContractorSeo** | Contractor page meta |
| **useContractorSearchSeo** | Search results meta |
| **useCategoryListingSeo** | Category page meta |
| **usePageSeo** | CMS page meta |

### Search Composables

| Composable | Purpose |
|------------|---------|
| **useSearchFilters** | Filter state management |
| **useSearchLocation** | Location-based search |
| **useDistanceFilter** | Distance calculations |

### Utility Composables

| Composable | Purpose |
|------------|---------|
| **usePagination** | Generic pagination |
| **useMarkdown** | Markdown rendering |
| **useTipTapImageUpload** | Rich text image upload |
| **useContractorEnrichment** | Enrichment UI state |
| **useReviewEnrichment** | Review enrichment UI |
| **useComponentDocs** | Dev component docs |

---

## Frontend Components

### Component Directories

| Directory | Purpose | Prefix |
|-----------|---------|--------|
| `app/components/ui/` | Public UI components | None |
| `app/components/admin-ui/` | Admin UI (shadcn) | `Ui` |
| `app/components/admin/` | Admin-specific | None |
| `app/components/contractor/` | Contractor displays | None |
| `app/components/owner/` | Owner portal | None |
| `app/components/templates/` | Page template renderers | None |
| `app/components/auth/` | Authentication | None |

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| **AuthSignIn** | `components/` | Login form |
| **Breadcrumbs** | `components/` | Navigation breadcrumbs |
| **PasswordInput** | `components/` | Password field with toggle |
| **LayoutAuth** | `components/` | Auth page wrapper |

### Layouts

| Layout | File | Purpose |
|--------|------|---------|
| **default** | `layouts/default.vue` | Public pages |
| **admin** | `layouts/admin.vue` | Admin dashboard |
| **owner** | `layouts/owner.vue` | Owner portal |
| **blank** | `layouts/blank.vue` | No chrome |
| **page** | `layouts/page.vue` | CMS pages |
| **dev** | `layouts/dev.vue` | Development |

---

## Schemas

Zod schemas for validation.

### Server Schemas (`server/schemas/`)

| Schema File | Purpose |
|-------------|---------|
| `contractor.schemas.ts` | Contractor validation |
| `page.schemas.ts` | Page validation |
| `menu.schemas.ts` | Menu validation |
| `job.schemas.ts` | Job validation |
| `import.schemas.ts` | Import validation |
| `ai.schemas.ts` | AI request/response |
| `dataforseo.schemas.ts` | DataForSEO types |
| `dataforseo-labs.schemas.ts` | DataForSEO Labs |
| `review.schemas.ts` | Review validation |
| `image-upload.schema.ts` | Image upload |

### Client Schemas (`app/schemas/`)

| Directory | Purpose |
|-----------|---------|
| `admin/` | Admin form schemas |
| `owner/` | Owner form schemas |
