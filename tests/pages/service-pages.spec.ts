import { test, expect } from '@playwright/test'

const services = [
  { slug: 'concrete-driveways', h1: 'Find Concrete Driveway Contractors' },
  { slug: 'concrete-patios', h1: 'Find Concrete Patio Contractors' },
  { slug: 'concrete-foundations', h1: 'Find Concrete Foundation Contractors' },
  { slug: 'sidewalks-walkways', h1: 'Find Sidewalk & Walkway Contractors' },
  { slug: 'stamped-decorative', h1: 'Find Stamped & Decorative Concrete Contractors' },
  { slug: 'concrete-repair', h1: 'Find Concrete Repair Contractors' },
]

const faqFirstQuestions: Record<string, string> = {
  'concrete-driveways': 'How much does a concrete driveway cost?',
  'concrete-patios': 'How much does a concrete patio cost?',
  'concrete-foundations': 'How much does a concrete foundation cost?',
  'sidewalks-walkways': 'How much do concrete walkways cost?',
  'stamped-decorative': 'How much does stamped concrete cost?',
  'concrete-repair': 'How much does concrete repair cost?',
}

test.describe('Service Pages', () => {
  for (const service of services) {
    test(`${service.slug} page loads correctly`, async ({ page }) => {
      await page.goto(`/${service.slug}`)

      await expect(page.locator('h1')).toHaveText(service.h1)

      const faqQuestion = faqFirstQuestions[service.slug]
      await expect(page.getByText(faqQuestion)).toBeVisible()

      await expect(page.getByRole('link', { name: 'California' })).toBeVisible()

      await expect(page.getByRole('link', { name: /Get Listed/ })).toBeVisible()
    })
  }
})

test.describe('PopularServices Navigation', () => {
  test('all service links are present on /find page', async ({ page }) => {
    await page.goto('/find')
    
    for (const service of services) {
      const link = page.locator(`a[href="/${service.slug}"]`)
      await expect(link).toBeVisible()
    }
  })
})
