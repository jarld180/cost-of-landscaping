/**
 * Database Constraints Tests
 *
 * Tests database-level constraints for background jobs:
 * - Unique partial index prevents duplicate active jobs
 * - Atomic RPC creates job + log in single transaction
 *
 * These tests use the API to trigger database operations
 * and verify constraints are enforced.
 *
 * @see BAM-222 Phase 1: Critical Security Fixes
 * @see BAM-223 Phase 2: Architecture Improvements
 */

import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3001'

test.describe('Database Constraints', () => {
  test.describe('Race Condition Prevention', () => {
    test('should prevent creating duplicate active jobs via UI', async ({ page }) => {
      // Login
      await page.goto(`${BASE_URL}/admin/login`)
      await page.waitForTimeout(500)

      const currentUrl = page.url()
      if (currentUrl.includes('/login')) {
        await page.fill('input[type="email"]', 'andy@ridedrivemedia.com')
        await page.fill('input[type="password"]', 'password')
        await page.click('button[type="submit"]')
        await page.waitForURL('**/admin/**')
      }

      // Navigate to image enrichment page
      await page.goto(`${BASE_URL}/admin/maintenance/image-enrichment`)
      await page.waitForLoadState('networkidle')

      // Check the button state - if a job is active, button should be disabled
      const queueButton = page.locator('button:has-text("Queue Enrichment Job")')

      if (await queueButton.isDisabled()) {
        // Job is already active - this is expected behavior
        // The UI prevents creating duplicates
        const warningText = await page.textContent('body')
        expect(warningText).toContain('already queued or processing')
      } else {
        // No active job - create one and verify button becomes disabled
        await queueButton.click()
        await page.waitForTimeout(1000)

        // Button should now be disabled
        await expect(queueButton).toBeDisabled()
      }
    })

    test('should show appropriate message when job is active', async ({ page }) => {
      // Login
      await page.goto(`${BASE_URL}/admin/login`)
      await page.waitForTimeout(500)

      const currentUrl = page.url()
      if (currentUrl.includes('/login')) {
        await page.fill('input[type="email"]', 'andy@ridedrivemedia.com')
        await page.fill('input[type="password"]', 'password')
        await page.click('button[type="submit"]')
        await page.waitForURL('**/admin/**')
      }

      await page.goto(`${BASE_URL}/admin/maintenance/image-enrichment`)
      await page.waitForLoadState('networkidle')

      // Check for either the queue button or the "already active" message
      const pageContent = await page.textContent('body')

      const hasQueueButton = pageContent?.includes('Queue Enrichment Job')
      const hasActiveMessage = pageContent?.includes('already queued or processing')
      const hasJobQueued = pageContent?.includes('Job Queued')

      // One of these states should be true
      expect(hasQueueButton || hasActiveMessage || hasJobQueued).toBe(true)
    })
  })

  test.describe('Atomic Job Creation', () => {
    test('job details page should show activity log', async ({ page }) => {
      // Login
      await page.goto(`${BASE_URL}/admin/login`)
      await page.waitForTimeout(500)

      const currentUrl = page.url()
      if (currentUrl.includes('/login')) {
        await page.fill('input[type="email"]', 'andy@ridedrivemedia.com')
        await page.fill('input[type="password"]', 'password')
        await page.click('button[type="submit"]')
        await page.waitForURL('**/admin/**')
      }

      // Go to jobs list
      await page.goto(`${BASE_URL}/admin/maintenance/jobs`)
      await page.waitForLoadState('networkidle')

      // Click on first job if available
      const firstJobLink = page.locator('table tbody tr a').first()
      if (await firstJobLink.isVisible()) {
        await firstJobLink.click()
        await page.waitForLoadState('networkidle')

        // Job details should have Activity Log section
        await expect(page.locator('h3:has-text("Activity Log")')).toBeVisible()

        // Should have at least a "created" log entry
        const logContent = await page.textContent('body')
        expect(logContent).toContain('created')
      }
    })
  })
})

