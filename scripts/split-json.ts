/**
 * Usage: npx tsx scripts/split-json.ts [inputFile] [maxSizeMB]
 * Example: npx tsx scripts/split-json.ts app/mock-data/json/us-concrete-contractors.json 3
 */

import * as fs from 'fs'
import * as path from 'path'

const DEFAULT_MAX_SIZE_MB = 3
const BYTES_PER_MB = 1024 * 1024

interface SplitOptions {
  inputFile: string
  maxSizeBytes: number
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < BYTES_PER_MB) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / BYTES_PER_MB).toFixed(2)} MB`
}

function splitJsonArray(options: SplitOptions): void {
  const { inputFile, maxSizeBytes } = options

  if (!fs.existsSync(inputFile)) {
    console.error(`❌ File not found: ${inputFile}`)
    process.exit(1)
  }

  const inputStats = fs.statSync(inputFile)
  console.log(`📂 Input file: ${inputFile}`)
  console.log(`📊 Input size: ${formatBytes(inputStats.size)}`)
  console.log(`🎯 Max chunk size: ${formatBytes(maxSizeBytes)}`)
  console.log('')

  console.log('⏳ Reading JSON file...')
  const rawData = fs.readFileSync(inputFile, 'utf-8')
  const data: unknown[] = JSON.parse(rawData)

  if (!Array.isArray(data)) {
    console.error('❌ Input file must contain a JSON array')
    process.exit(1)
  }

  console.log(`✅ Parsed ${data.length} items`)
  console.log('')

  const inputDir = path.dirname(inputFile)
  const inputExt = path.extname(inputFile)
  const inputBase = path.basename(inputFile, inputExt)

  const chunks: unknown[][] = []
  let currentChunk: unknown[] = []
  let currentChunkSize = 2 // "[]" wrapper bytes

  for (const item of data) {
    const itemJson = JSON.stringify(item, null, 2)
    const itemSize = itemJson.length + 4 // +comma +newline between items

    if (currentChunk.length > 0 && currentChunkSize + itemSize > maxSizeBytes) {
      chunks.push(currentChunk)
      currentChunk = []
      currentChunkSize = 2
    }

    currentChunk.push(item)
    currentChunkSize += itemSize
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk)
  }

  console.log(`📦 Split into ${chunks.length} chunks`)
  console.log('')

  const outputFiles: string[] = []

  for (let i = 0; i < chunks.length; i++) {
    const chunkNumber = i + 1
    const outputFileName = `${inputBase}-${chunkNumber}${inputExt}`
    const outputPath = path.join(inputDir, outputFileName)

    const chunkJson = JSON.stringify(chunks[i], null, 2)
    fs.writeFileSync(outputPath, chunkJson)

    const outputSize = fs.statSync(outputPath).size
    outputFiles.push(outputFileName)

    console.log(`  ✅ ${outputFileName}: ${chunks[i].length} items, ${formatBytes(outputSize)}`)
  }

  console.log('')
  console.log(`🎉 Done! Created ${chunks.length} files:`)
  outputFiles.forEach(f => console.log(`   - ${f}`))
}

function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    const defaultInput = 'app/mock-data/json/us-concrete-contractors.json'
    console.log(`No input specified, using default: ${defaultInput}`)
    console.log('')

    splitJsonArray({
      inputFile: defaultInput,
      maxSizeBytes: DEFAULT_MAX_SIZE_MB * BYTES_PER_MB,
    })
  } else {
    const inputFile = args[0]
    const maxSizeMB = args[1] ? parseFloat(args[1]) : DEFAULT_MAX_SIZE_MB

    if (isNaN(maxSizeMB) || maxSizeMB <= 0) {
      console.error('❌ Invalid max size. Must be a positive number.')
      process.exit(1)
    }

    splitJsonArray({
      inputFile,
      maxSizeBytes: maxSizeMB * BYTES_PER_MB,
    })
  }
}

main()
