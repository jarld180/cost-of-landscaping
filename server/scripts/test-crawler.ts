/**
 * Test script to debug Playwright crawling
 * Run with: npx tsx server/scripts/test-crawler.ts [url]
 */

import { chromium } from 'playwright-core'

const TEST_URL = process.argv[2] || 'https://brundagebone.com'

async function testCrawl() {
  console.log(`\n=== Testing URL: ${TEST_URL} ===\n`)

  console.log('--- Test with Human-like Chromium ---')
  console.log('Launching browser...')

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
  })

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/New_York',
    colorScheme: 'light',
    extraHTTPHeaders: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
    },
  })

  // Hide webdriver
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
  })

  const page = await context.newPage()

  console.log(`Navigating to: ${TEST_URL}`)
  await page.goto(TEST_URL, { waitUntil: 'networkidle', timeout: 30000 })

  // Human-like: wait and scroll
  console.log('Simulating human behavior (wait + scroll)...')
  await new Promise(r => setTimeout(r, 1000))

  // Scroll like a human
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.3))
    await new Promise(r => setTimeout(r, 200))
  }
  await page.evaluate(() => window.scrollTo(0, 0))

  const title = await page.title()
  console.log(`Title: ${title}`)

  // Check if blocked
  if (title.includes('403') || title.includes('Forbidden') || title.includes('Access Denied')) {
    console.log('\n❌ BLOCKED - Site returned 403/Forbidden')
    console.log('This site has aggressive bot protection.')
  } else {
    console.log('\n✅ Page loaded successfully!')
  }

  const html = await page.content()
  console.log(`HTML length: ${html.length}`)

  // Check for nav elements
  console.log('\n--- Navigation Elements ---')
  const navLinks = await page.$$eval('nav a, header a, [role="navigation"] a, .nav a, .menu a', links =>
    links.map(a => ({ text: a.textContent?.trim(), href: a.getAttribute('href') }))
  )
  console.log(`Found ${navLinks.length} nav links:`)
  navLinks.slice(0, 10).forEach(l => console.log(`  - ${l.text}: ${l.href}`))

  // Get body text
  console.log('\n--- Body Text Sample ---')
  const bodyText = await page.$eval('body', el => el.innerText)
  console.log(`Body text length: ${bodyText.length}`)
  console.log(`First 500 chars:\n${bodyText.substring(0, 500)}`)

  // Screenshot for visual debug
  await page.screenshot({ path: 'test-crawl-screenshot.png', fullPage: true })
  console.log('\nScreenshot saved: test-crawl-screenshot.png')

  await browser.close()
  console.log('\nDone!')
}

testCrawl().catch(console.error)

