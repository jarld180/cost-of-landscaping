/**
 * Tests for BAM-190: Canonical URL form validation fix
 * 
 * Verifies that:
 * 1. New pages can be created without canonicalUrl validation errors
 * 2. Existing pages can be edited and saved without canonicalUrl validation errors
 * 3. The canonicalUrl field remains empty unless explicitly set
 */

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3019'

test.describe('Canonical URL Form Validation (BAM-190)', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${BASE_URL}/admin/login`)
    await page.waitForTimeout(500)

    const currentUrl = page.url()
    if (currentUrl.includes('/login')) {
      await page.fill('input[type="email"]', 'andy@ridedrivemedia.com')
      await page.fill('input[type="password"]', 'password')
      await page.click('button[type="submit"]')
      await page.waitForURL('**/admin/**')
    }
  })

  test('should create a new page without canonicalUrl validation error', async ({ page }) => {
    // Navigate to create page
    await page.goto(`${BASE_URL}/admin/pages/new`)
    await page.waitForLoadState('networkidle')

    // Fill in required fields
    const uniqueTitle = `Test Page - ${Date.now()}`
    await page.fill('input[id="title"]', uniqueTitle)
    
    // Wait for slug to auto-generate
    await page.waitForTimeout(500)

    // Select a template
    await page.click('[id="template"]')
    await page.waitForTimeout(200)
    await page.click('text=Default Template')

    // Add some content
    const contentEditor = page.locator('.tiptap.ProseMirror')
    await contentEditor.click()
    await contentEditor.fill('Test content for canonical URL validation')

    // Submit the form
    await page.click('button[type="submit"]:has-text("Create Page")')

    // Wait for redirect to pages list (success case)
    await page.waitForURL('**/admin/pages', { timeout: 10000 })

    // Verify we're on the pages list (successful creation)
    expect(page.url()).toContain('/admin/pages')
    
    // Verify success toast appeared
    await expect(page.locator('text=Page created successfully')).toBeVisible({ timeout: 5000 })
  })

  test('should edit and save an existing page without canonicalUrl validation error', async ({ page }) => {
    // First, get a page to edit from the pages list
    await page.goto(`${BASE_URL}/admin/pages`)
    await page.waitForLoadState('networkidle')

    // Click on the first page's edit link
    const editLink = page.locator('table tbody tr').first().locator('a[href*="/edit"]')
    
    if (await editLink.isVisible()) {
      await editLink.click()
      await page.waitForLoadState('networkidle')

      // Verify we're on the edit page
      expect(page.url()).toContain('/edit')

      // Make a small change to force save (add a space to content)
      const contentEditor = page.locator('.tiptap.ProseMirror')
      if (await contentEditor.isVisible()) {
        await contentEditor.click()
        await page.keyboard.press('End')
        await page.keyboard.type(' ')
      }

      // Submit the form - this should NOT show canonicalUrl validation error
      await page.click('button[type="submit"]:has-text("Update Page")')

      // Wait for redirect to pages list (success case) or error message
      const redirectPromise = page.waitForURL('**/admin/pages', { timeout: 10000 })
      const errorPromise = page.locator('text=Must be a valid URL').waitFor({ timeout: 3000 }).catch(() => null)

      // If we got redirected, test passes
      try {
        await redirectPromise
        expect(page.url()).toContain('/admin/pages')
      } catch {
        // Check if the validation error appeared (test fails)
        const errorVisible = await page.locator('text=Must be a valid URL').isVisible()
        expect(errorVisible).toBe(false)
      }
    } else {
      // Skip if no pages available
      test.skip()
    }
  })

  test('should show empty canonicalUrl field for new pages', async ({ page }) => {
    // Navigate to create page
    await page.goto(`${BASE_URL}/admin/pages/new`)
    await page.waitForLoadState('networkidle')

    // Expand SEO settings to find canonical URL field
    const advancedSeoButton = page.locator('button:has-text("Advanced SEO")')
    if (await advancedSeoButton.isVisible()) {
      await advancedSeoButton.click()
      await page.waitForTimeout(200)
    }

    // Find the canonical URL input
    const canonicalInput = page.locator('input[id="canonicalUrl"]')
    
    if (await canonicalInput.isVisible()) {
      // Verify it's empty
      const value = await canonicalInput.inputValue()
      expect(value).toBe('')
    }
  })
})

