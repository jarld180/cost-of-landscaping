/**
 * ZIP Code Import Script
 *
 * Imports US ZIP codes from SimpleMaps CSV into Supabase zip_codes table.
 * Filters out territories (PR, GU, VI, etc.) and military ZIP codes.
 *
 * Usage: npx tsx scripts/import-zip-codes.ts
 *
 * Prerequisites:
 * - Download uszips.csv from https://simplemaps.com/data/us-zips
 * - Place in imports/uszips.csv
 * - Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env.local
 */

import { createReadStream } from 'fs'
import { createInterface } from 'readline'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables from .env.local
config({ path: '.env.local' })

// const SUPABASE_URL = 'https://zhmqxclxgwikhrxkvhgm.supabase.co'
// const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY

const SUPABASE_URL = process.env.NUXT_PUBLIC_SUPABASE_URL
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local')
  process.exit(1)
}

// US state codes (excluding territories)
const US_STATES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC' // Include Washington DC
])

interface ZipRecord {
  zip: string
  city_name: string
  state_code: string
  state_name: string
  lat: number
  lng: number
  population: number
}

interface CityRecord {
  id: string
  name: string
  state_code: string
}

async function main() {
  console.log('🚀 Starting ZIP code import...')

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SECRET_KEY!)

  // Fetch existing cities for matching
  console.log('📍 Fetching existing cities...')
  const { data: cities, error: citiesError } = await supabase
    .from('cities')
    .select('id, name, state_code')

  if (citiesError) {
    console.error('Failed to fetch cities:', citiesError)
    process.exit(1)
  }

  // Create lookup map: "cityname_statecode" -> city_id
  const cityLookup = new Map<string, string>()
  for (const city of cities as CityRecord[]) {
    const key = `${city.name.toLowerCase()}_${city.state_code}`
    cityLookup.set(key, city.id)
  }
  console.log(`📊 Found ${cityLookup.size} cities for matching`)

  // Parse CSV
  const zipRecords: ZipRecord[] = []
  const filePath = 'imports/uszips.csv'

  const fileStream = createReadStream(filePath)
  const rl = createInterface({ input: fileStream, crlfDelay: Infinity })

  let isHeader = true
  let lineCount = 0

  for await (const line of rl) {
    if (isHeader) {
      isHeader = false
      continue
    }

    lineCount++
    const fields = parseCSVLine(line)

    // CSV columns: zip, lat, lng, city, state_id, state_name, ...
    const [zip, lat, lng, city, stateCode, stateName, , , population, , , , , , , military] = fields

    // Skip non-US states and military ZIP codes
    if (!US_STATES.has(stateCode) || military === 'TRUE') continue

    zipRecords.push({
      zip: zip.replace(/"/g, ''),
      city_name: city.replace(/"/g, ''),
      state_code: stateCode,
      state_name: stateName.replace(/"/g, ''),
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      population: parseInt(population) || 0
    })
  }

  console.log(`📄 Parsed ${lineCount} lines, ${zipRecords.length} US ZIP codes`)

  // Batch insert
  const BATCH_SIZE = 500
  let inserted = 0
  let matched = 0

  for (let i = 0; i < zipRecords.length; i += BATCH_SIZE) {
    const batch = zipRecords.slice(i, i + BATCH_SIZE).map(record => {
      const cityKey = `${record.city_name.toLowerCase()}_${record.state_code}`
      const cityId = cityLookup.get(cityKey) || null
      if (cityId) matched++

      return {
        zip: record.zip,
        city_name: record.city_name,
        state_code: record.state_code,
        state_name: record.state_name,
        lat: record.lat,
        lng: record.lng,
        population: record.population,
        city_id: cityId,
        coordinates: `POINT(${record.lng} ${record.lat})`
      }
    })

    const { error } = await supabase.from('zip_codes').upsert(batch, { onConflict: 'zip' })

    if (error) {
      console.error(`Batch ${i / BATCH_SIZE + 1} failed:`, error)
    } else {
      inserted += batch.length
      process.stdout.write(`\r⏳ Inserted ${inserted}/${zipRecords.length} ZIP codes...`)
    }
  }

  console.log(`\n✅ Import complete! ${inserted} ZIP codes, ${matched} matched to cities`)
}

// Simple CSV line parser (handles quoted fields)
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

main().catch(console.error)

