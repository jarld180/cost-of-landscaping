---
discovery_date: 2026-01-22
last_updated: 2026-01-22
source_patterns: ["vitest.config.ts", "playwright.config.ts", "server/__tests__/**", "tests/**"]
confidence: high
cartographer_version: 1.0
---

# Testing Contract

Test frameworks, patterns, and coverage expectations.

---

## Test Frameworks

| Type | Framework | Location |
|------|-----------|----------|
| Unit/Integration | Vitest | `server/**/*.test.ts` |
| E2E | Playwright | `tests/**/*.spec.ts` |

---

## Unit Tests (Vitest)

### Configuration
`vitest.config.ts`:
```typescript
export default defineConfig({
  test: {
    include: ['server/**/*.test.ts'],
    environment: 'node',
    globals: true,
    setupFiles: ['./server/__tests__/setup.ts'],
  },
})
```

### Commands
```bash
pnpm test:unit          # Run once
pnpm test:unit:watch    # Watch mode
pnpm test:unit:coverage # With coverage
```

### File Naming
```
server/services/ContractorService.ts
server/services/__tests__/ContractorService.test.ts
```

### Test Pattern
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('ContractorService', () => {
  let service: ContractorService
  let mockRepo: MockedObject<ContractorRepository>

  beforeEach(() => {
    mockRepo = vi.mocked(new ContractorRepository())
    service = new ContractorService(mockRepo)
  })

  it('should find contractor by id', async () => {
    mockRepo.findById.mockResolvedValue({ id: '123', name: 'Test' })

    const result = await service.getContractor('123')

    expect(result.name).toBe('Test')
    expect(mockRepo.findById).toHaveBeenCalledWith('123')
  })
})
```

### Coverage Targets
```typescript
coverage: {
  include: ['server/services/**', 'server/repositories/**'],
}
```

---

## E2E Tests (Playwright)

### Configuration
`playwright.config.ts`:
```typescript
export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:3019',
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3019',
  },
})
```

### Commands
```bash
pnpm test:e2e           # Run tests
pnpm test:e2e:ui        # Interactive UI
pnpm test:e2e:headed    # Visible browser
pnpm test:e2e:debug     # Debug mode
pnpm test:e2e:report    # View report
```

### Authentication
Tests use saved auth state:
```typescript
// tests/auth.setup.ts
await page.goto('/login')
await page.fill('[name=email]', 'test@example.com')
await page.fill('[name=password]', 'password')
await page.click('button[type=submit]')
await page.context().storageState({ path: 'playwright/.auth/user.json' })
```

### Test Pattern
```typescript
import { test, expect } from '@playwright/test'

test.describe('Admin Pages', () => {
  test('should list pages', async ({ page }) => {
    await page.goto('/admin/pages')

    await expect(page.locator('h1')).toContainText('Pages')
    await expect(page.locator('table')).toBeVisible()
  })

  test('should create new page', async ({ page }) => {
    await page.goto('/admin/pages/new')

    await page.fill('[name=title]', 'Test Page')
    await page.fill('[name=slug]', 'test-page')
    await page.click('button[type=submit]')

    await expect(page).toHaveURL(/\/admin\/pages\/.*\/edit/)
  })
})
```

---

## Test Organization

```
server/
├── __tests__/
│   ├── setup.ts              # Global setup
│   └── helpers/              # Test utilities
├── services/
│   └── __tests__/
│       └── *.test.ts         # Service tests
└── repositories/
    └── __tests__/
        └── *.test.ts         # Repository tests

tests/
├── auth.setup.ts             # Auth setup
├── pages/
│   └── *.spec.ts             # Page E2E tests
└── jobs/
    └── *.spec.ts             # Job E2E tests
```

---

## Mocking

### Vitest Mocks
```typescript
import { vi } from 'vitest'

// Mock module
vi.mock('~/server/services/EmailService')

// Mock function
const mockFn = vi.fn().mockResolvedValue({ success: true })

// Spy
const spy = vi.spyOn(service, 'process')
```

### Supabase Mock
In `server/__tests__/setup.ts`:
```typescript
vi.mock('#supabase/server', () => ({
  serverSupabaseClient: vi.fn(),
  serverSupabaseServiceRole: vi.fn(),
}))
```

---

## Test Data

### Factories
Create test data factories for common entities:
```typescript
function createContractor(overrides = {}) {
  return {
    id: randomUUID(),
    name: 'Test Contractor',
    status: 'active',
    ...overrides,
  }
}
```

### Fixtures
Static test data in `tests/fixtures/` or inline.

---

## Assertions

### Vitest
```typescript
expect(value).toBe(expected)
expect(array).toContain(item)
expect(fn).toHaveBeenCalledWith(args)
expect(promise).rejects.toThrow()
```

### Playwright
```typescript
await expect(locator).toBeVisible()
await expect(locator).toHaveText('text')
await expect(page).toHaveURL('/path')
```

---

## CI Integration

Tests should run in CI:
```yaml
# Example GitHub Actions
- run: pnpm test:unit
- run: pnpm test:e2e
```

### CI-specific Config
```typescript
// playwright.config.ts
retries: process.env.CI ? 2 : 0,
workers: process.env.CI ? 1 : undefined,
```

---

## Testing Invariants

1. **All services** should have unit tests
2. **All repositories** should have unit tests
3. **Critical user flows** should have E2E tests
4. **Tests must pass** before merge to main
5. **No test pollution** - each test isolated
6. **Mocks over real services** in unit tests
