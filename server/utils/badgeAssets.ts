/**
 * Badge Asset Loader
 *
 * Serves prebuilt PNG badge assets for maximum performance.
 * Assets are loaded once and cached in memory.
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

// In-memory cache for badge assets
let verifiedPng: Buffer | null = null
let placeholderPng: Buffer | null = null

/**
 * Load a prebuilt PNG badge asset.
 * Assets are cached in memory after first load.
 */
export async function loadBadgePng(kind: 'verified' | 'placeholder'): Promise<Buffer> {
  if (kind === 'verified') {
    if (!verifiedPng) {
      verifiedPng = await readFile(
        join(process.cwd(), 'server/assets/badges/verified.png')
      )
    }
    return verifiedPng
  }

  if (!placeholderPng) {
    placeholderPng = await readFile(
      join(process.cwd(), 'server/assets/badges/placeholder.png')
    )
  }
  return placeholderPng
}
