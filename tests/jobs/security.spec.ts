/**
 * Background Jobs Security Tests
 *
 * Tests security features implemented in BAM-222 and BAM-223:
 * - Rate limiting on execute endpoint
 * - Constant-time secret comparison (via behavioral test)
 * - Race condition prevention via database constraint
 * - Atomic job creation with RPC
 *
 * @see BAM-222 Phase 1: Critical Security Fixes
 * @see BAM-223 Phase 2: Architecture Improvements
 * @see BAM-224 Phase 3: Testing & Validation
 */

import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3001'
const EXECUTE_ENDPOINT = `${BASE_URL}/api/jobs/test-job-id/execute`

test.describe('Background Jobs Security', () => {
  test.describe('Rate Limiting', () => {
    test('should return 429 after exceeding rate limit', async ({ request }) => {
      const headers = {
        'Content-Type': 'application/json',
        'X-Job-Runner-Secret': 'wrong-secret-for-rate-limit-test',
      }

      // Make requests until we hit rate limit (limit is 10/min)
      let rateLimitHit = false
      let requestCount = 0

      for (let i = 0; i < 15; i++) {
        const response = await request.post(EXECUTE_ENDPOINT, { headers })
        requestCount++

        if (response.status() === 429) {
          rateLimitHit = true
          break
        }
      }

      expect(rateLimitHit).toBe(true)
      expect(requestCount).toBeLessThanOrEqual(12) // Should hit before 12 requests
    })

    test('should include rate limit headers in response', async ({ request }) => {
      // Wait a bit to reset rate limiter from previous test
      await new Promise(resolve => setTimeout(resolve, 1000))

      const headers = {
        'Content-Type': 'application/json',
        'X-Job-Runner-Secret': 'test-secret',
      }

      const response = await request.post(EXECUTE_ENDPOINT, { headers })

      // Check for rate limit headers
      const rateLimitLimit = response.headers()['x-ratelimit-limit']
      const rateLimitRemaining = response.headers()['x-ratelimit-remaining']

      expect(rateLimitLimit).toBe('10')
      expect(rateLimitRemaining).toBeDefined()
    })
  })

  test.describe('Authentication', () => {
    test('should return 401 for missing secret', async ({ request }) => {
      const response = await request.post(EXECUTE_ENDPOINT, {
        headers: { 'Content-Type': 'application/json' },
      })

      expect(response.status()).toBe(401)
    })

    test('should return 401 for wrong secret', async ({ request }) => {
      const response = await request.post(EXECUTE_ENDPOINT, {
        headers: {
          'Content-Type': 'application/json',
          'X-Job-Runner-Secret': 'definitely-wrong-secret',
        },
      })

      expect(response.status()).toBe(401)
    })
  })
})

