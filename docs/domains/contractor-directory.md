---
discovery_date: 2026-01-22
last_updated: 2026-01-22
cartographer_version: 1.0
---

# Domain: Contractor Directory

## Business Purpose

The Contractor Directory is the **core business domain** of Cost of Concrete. It solves the problem of aggregating concrete contractors across the United States into a performant, SEO-friendly website that makes it easy for end users to find, explore, and contact quality contractors.

## Target Users

| User Type | Goals |
|-----------|-------|
| **Consumers** | Find local concrete contractors, compare options, get contact info |
| **Businesses** | Source contractors for commercial projects |

## Key Entities

### Contractor
The primary business entity.

```
contractors
├── company_name
├── website
├── phone
├── street_address
├── city_id → cities
├── coordinates (PostGIS)
├── status (active, inactive, pending)
├── metadata (JSONB)
│   ├── pending_images[]
│   ├── images[]
│   ├── reviews[]
│   └── enrichment_data
└── service_types (many-to-many)
```

### City
Geographic reference for location-based search.

```
cities
├── name
├── state_code
├── slug (URL-friendly)
└── coordinates
```

### Service Types
Categorization of concrete services offered.

```
service_types
├── name (e.g., "Driveways", "Foundations")
└── slug
```

## User Flows

### Contractor Search
```
1. User lands on /concrete-contractors
2. Optional: Filter by state → /concrete-contractors/california
3. Optional: Filter by city → /concrete-contractors/california/los-angeles
4. View contractor list with distance (if location shared)
5. Click contractor card → View detail page
6. Contact contractor via phone/website
```

### SEO Structure
```
/concrete-contractors                    # National listing
/concrete-contractors/{state}            # State listing
/concrete-contractors/{state}/{city}     # City listing
/concrete-contractors/{state}/{city}/{contractor-slug}  # Detail page
```

## Data Operations

### Contractor Import
1. Admin uploads CSV via `/admin/contractors/import`
2. System creates import job
3. Rows validated and contractors created with `status: pending`
4. Enrichment jobs queued automatically

### Enrichment Pipeline
Triggered when new contractors are added:

```
1. Profile Enrichment (ContractorEnrichmentService)
   - Crawl contractor website
   - AI extraction of business details
   - Service type classification

2. Image Enrichment (ImageEnrichmentService)
   - Download images from pending_images[]
   - Upload to Supabase Storage
   - Update metadata.images[]

3. Review Enrichment (ReviewImageService)
   - Fetch reviews from external sources
   - Process review images
```

## External APIs

| Service | Purpose | Used By |
|---------|---------|---------|
| Google Geocoding | Address → coordinates | GeocodingService |
| DataForSEO | Business data enrichment | DataForSeoService |
| Anthropic/OpenAI | AI content extraction | AIExtractionService |

## Key Files

| File | Purpose |
|------|---------|
| `server/services/ContractorEnrichmentService.ts` | Profile enrichment orchestration |
| `server/services/ImageEnrichmentService.ts` | Image processing |
| `server/repositories/ContractorRepository.ts` | Data access |
| `app/composables/useSearchFilters.ts` | Search UI state |
| `app/composables/useDistanceFilter.ts` | Location-based filtering |

## Gotchas

1. **State slugs must match exactly** - Custom routing in `nuxt.config.ts` constrains state params to valid US states
2. **PostGIS required** - Geospatial queries need PostGIS extension enabled
3. **Enrichment is async** - Jobs run in background, check `background_jobs` table for status
4. **Image URLs expire** - External image URLs may become invalid; always store copies in Supabase Storage

## Metrics

- Contractor count by state/city
- Search queries
- Enrichment success rate
- Image processing rate
