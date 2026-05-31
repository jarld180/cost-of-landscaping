---
discovery_date: 2026-01-22
last_updated: 2026-01-22
cartographer_version: 1.0
---

# Domain: Data Operations

## Business Purpose

The Data Operations domain handles bulk data import, automated enrichment, and background job processing. Enrichment jobs are **triggered when new contractors are added** to the system.

## Job System

### Architecture
```
pg_cron (scheduled trigger)
    ↓
POST /api/jobs/:id/execute
    ↓
JobService.execute()
    ↓
JobExecutorRegistry → Specific Executor
    ↓
Service (Import, Enrichment, etc.)
```

### Job States
```
pending → running → completed
                 → failed
         → cancelled
```

### Job Types

| Type | Executor | Purpose |
|------|----------|---------|
| `import` | ImportService | Bulk CSV import |
| `enrich-profile` | ContractorEnrichmentService | Website crawl + AI |
| `enrich-images` | ImageEnrichmentService | Image download/upload |
| `enrich-reviews` | ReviewImageService | Review data processing |
| `ai-article` | AIJobQueueService | Content generation |

## Import Pipeline

### Flow
```
1. Admin uploads CSV at /admin/contractors/import
2. POST /api/contractors/import-jobs creates import_job
3. CSV parsed, rows validated
4. Contractors created with status: pending
5. Enrichment jobs queued automatically
```

### Import Job Table
```
import_jobs
├── file_name
├── status
├── row_count
├── processed_count
├── error_rows (JSONB)
└── created_at
```

## Enrichment Services

### Profile Enrichment
`ContractorEnrichmentService`:
1. **Web Crawl** - `WebCrawlerService` fetches contractor website
2. **AI Extraction** - `AIExtractionService` parses business info
3. **Service Types** - Classifies services offered
4. **Update** - Stores enriched data in contractor metadata

### Image Enrichment
`ImageEnrichmentService`:
1. Read `metadata.pending_images[]`
2. Download each image (with timeout)
3. Upload to Supabase Storage (`contractor-images` bucket)
4. Update `metadata.images[]` with storage paths
5. Set `images_processed = true`

### Review Enrichment
`ReviewImageService`:
- Fetches review data from external sources
- Processes review images
- Stores in contractor metadata

## External APIs

| Service | API | Purpose |
|---------|-----|---------|
| **Google** | Geocoding API | Address → coordinates |
| **DataForSEO** | Business Data API | Company enrichment |
| **DataForSEO Labs** | Labs API | SEO analysis |
| **Anthropic** | Claude API | AI extraction |

## Background Jobs Table

```
background_jobs
├── id
├── type
├── status
├── payload (JSONB) - input data
├── result (JSONB) - output/errors
├── logs (JSONB) - execution log
├── created_at
├── started_at
├── completed_at
└── error_message
```

## Monitoring

### Admin UI
```
/admin/maintenance/jobs              # Job list
/admin/maintenance/jobs/[id]         # Job detail
/admin/maintenance/image-enrichment  # Image queue
/admin/maintenance/contractor-enrichment  # Profile queue
```

### SSE Streams
Real-time progress via Server-Sent Events:
```
GET /api/jobs/stream          # All jobs
GET /api/jobs/:id/stream      # Single job
GET /api/contractors/enrich-images/stream  # Image enrichment
```

## Key Files

| File | Purpose |
|------|---------|
| `server/services/JobService.ts` | Job orchestration |
| `server/services/ImportService.ts` | CSV import |
| `server/services/ContractorEnrichmentService.ts` | Profile enrichment |
| `server/services/ImageEnrichmentService.ts` | Image processing |
| `server/services/WebCrawlerService.ts` | Web scraping |
| `server/services/GeocodingService.ts` | Address geocoding |
| `server/repositories/JobRepository.ts` | Job persistence |

## Failure Handling

### Retry Logic
- Failed jobs can be retried via `POST /api/jobs/:id/retry`
- Retry resets status to `pending`

### Common Failures
| Failure | Cause | Resolution |
|---------|-------|------------|
| Bot blocked | Website has bot protection | Mark as `not_applicable` |
| Timeout | Slow website response | Retry or skip |
| Invalid URL | Malformed website URL | Mark as failed |
| Storage error | Supabase upload failed | Retry |

### Error Logging
- Errors stored in `background_jobs.result`
- System events in `system_logs` table

## Gotchas

1. **Enrichment is async** - Jobs run in background, poll for status
2. **Rate limits** - External APIs have rate limits; jobs may queue
3. **Image URLs expire** - Download promptly, store in Supabase
4. **Bot protection** - Some sites block crawlers; handle gracefully
5. **pg_cron timing** - Cron job polls for pending jobs periodically
