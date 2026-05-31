/**
 * Google Maps Concrete Contractor Scraper
 * 
 * Scrapes contractor profiles from Google Maps for specified cities.
 * Run with: npx tsx scripts/scrape-contractors.ts
 */

import { chromium, type Page } from 'playwright-core'
import * as fs from 'fs'

interface Contractor {
  name: string
  address: string | null
  city: string
  state: string
  phone: string | null
  website: string | null
  category: string
  scrapedAt: string
}

const CITIES = [
  // Georgia
  { city: 'Atlanta', state: 'GA' },
  { city: 'Savannah', state: 'GA' },
  { city: 'Augusta', state: 'GA' },
  { city: 'Macon', state: 'GA' },
  { city: 'Columbus', state: 'GA' },
  
  // Tennessee
  { city: 'Nashville', state: 'TN' },
  { city: 'Memphis', state: 'TN' },
  { city: 'Knoxville', state: 'TN' },
  { city: 'Chattanooga', state: 'TN' },
  
  // Ohio
  { city: 'Cincinnati', state: 'OH' },
  { city: 'Columbus', state: 'OH' },
  { city: 'Cleveland', state: 'OH' },
  { city: 'Dayton', state: 'OH' },
  
  // Kentucky
  { city: 'Louisville', state: 'KY' },
  { city: 'Lexington', state: 'KY' },
  
  // Missouri
  { city: 'St. Louis', state: 'MO' },
  { city: 'Kansas City', state: 'MO' },
]

async function scrollAndLoadAll(page: Page): Promise<number> {
  const feed = await page.$('div[role="feed"]')
  if (!feed) return 0
  
  const scrollContainer = await feed.evaluateHandle(el => el.parentElement)
  
  let previousCount = 0
  let currentCount = 0
  let noChangeCount = 0
  
  for (let i = 0; i < 50; i++) {
    await scrollContainer.evaluate(el => {
      if (el) el.scrollTop = el.scrollTop + 2000
    })
    await page.waitForTimeout(1000)
    
    currentCount = await page.$$eval('a[href*="/maps/place/"]', links => {
      const seen = new Set()
      links.forEach(l => seen.add(l.getAttribute('aria-label')))
      return seen.size
    })
    
    if (currentCount === previousCount) {
      noChangeCount++
      if (noChangeCount >= 4) break
    } else {
      noChangeCount = 0
    }
    previousCount = currentCount
  }
  
  return currentCount
}

async function extractContractors(page: Page, city: string, state: string): Promise<Contractor[]> {
  return await page.evaluate((cityName: string, stateName: string) => {
    const feed = document.querySelector('div[role="feed"]')
    if (!feed) return []
    
    const businessLinks = feed.querySelectorAll('a[href*="/maps/place/"]')
    const businesses: Contractor[] = []
    const seen = new Set<string>()
    
    businessLinks.forEach(link => {
      let container = (link as HTMLElement).closest('div.Nv2PK') || 
                      link.parentElement?.parentElement?.parentElement?.parentElement
      if (!container) return
      
      const text = (container as HTMLElement).innerText
      const name = link.getAttribute('aria-label') || text.split('\n')[0]
      
      if (!name || seen.has(name) || name.length < 3) return
      seen.add(name)
      
      // Phone
      const phoneMatch = text.match(/\+1[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{4}|\(\d{3}\)\s*\d{3}[-.\s]?\d{4}/)
      
      // Website
      const allLinks = container.querySelectorAll('a[href]')
      let website: string | null = null
      for (const l of allLinks) {
        const href = (l as HTMLAnchorElement).href
        if (href && !href.includes('google.com') && !href.includes('/maps/') && !href.includes('goo.gl')) {
          website = href
          break
        }
      }
      
      // Address
      const addressMatch = text.match(/·\s*([\d]+[^·\n]+?)(?:\n|·|Closed|Open|$)/i)
      
      // Category
      const categoryMatch = text.match(/Concrete contractor|Concrete product supplier|Masonry contractor|General contractor|Paving contractor/i)
      
      businesses.push({
        name: name,
        address: addressMatch ? addressMatch[1].trim() : null,
        city: cityName,
        state: stateName,
        phone: phoneMatch ? phoneMatch[0] : null,
        website: website,
        category: categoryMatch ? categoryMatch[0] : 'Contractor',
        scrapedAt: new Date().toISOString()
      })
    })
    
    return businesses
  }, city, state)
}

async function scrapeCity(page: Page, city: string, state: string): Promise<Contractor[]> {
  const searchQuery = `concrete contractors ${city} ${state}`
  const url = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`
  
  console.log(`\nScraping: ${city}, ${state}`)
  console.log(`URL: ${url}`)
  
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(3000)
  
  // Wait for feed to load
  await page.waitForSelector('div[role="feed"]', { timeout: 10000 }).catch(() => null)
  
  // Scroll to load all results
  const count = await scrollAndLoadAll(page)
  console.log(`Loaded ${count} results after scrolling`)
  
  // Extract contractor data
  const contractors = await extractContractors(page, city, state)
  console.log(`Extracted ${contractors.length} contractors`)
  
  return contractors
}

async function main() {
  console.log('Starting Google Maps Concrete Contractor Scraper')
  console.log('================================================\n')
  
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
    ],
  })
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-US',
  })
  
  const page = await context.newPage()
  
  const allContractors: Contractor[] = []
  
  for (const { city, state } of CITIES) {
    try {
      const contractors = await scrapeCity(page, city, state)
      allContractors.push(...contractors)
      
      // Small delay between cities to be respectful
      await page.waitForTimeout(2000)
    } catch (error) {
      console.error(`Error scraping ${city}, ${state}:`, error)
    }
  }
  
  await browser.close()
  
  // Deduplicate by name + city + state
  const uniqueContractors = Array.from(
    new Map(allContractors.map(c => [`${c.name}-${c.city}-${c.state}`, c])).values()
  )
  
  // Save results
  const outputPath = 'scripts/output/contractors-scraped.json'
  fs.mkdirSync('scripts/output', { recursive: true })
  fs.writeFileSync(outputPath, JSON.stringify(uniqueContractors, null, 2))
  
  console.log('\n================================================')
  console.log(`Scraping complete!`)
  console.log(`Total contractors: ${uniqueContractors.length}`)
  console.log(`Output saved to: ${outputPath}`)
}

main().catch(console.error)
