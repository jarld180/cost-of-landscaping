/**
 * Text Sanitization Utilities
 *
 * Provides functions for cleaning and normalizing text data during imports.
 * Used primarily by ImportService for contractor data.
 *
 * @see BAM-252 Import Service Refactoring
 */

/**
 * Remove punctuation characters from the start and end of a company name.
 *
 * @param name - The company name to sanitize
 * @returns The sanitized company name with leading/trailing punctuation removed
 *
 * @example
 * sanitizeCompanyName("Cruzen landscape Inc,") // "Cruzen landscape Inc"
 * sanitizeCompanyName("...ABC Company...") // "ABC Company"
 * sanitizeCompanyName("Normal Name") // "Normal Name"
 */
export function sanitizeCompanyName(name: string | null | undefined): string {
  if (!name) return ''

  // Trim whitespace first
  let result = name.trim()

  // Remove punctuation from start and end
  // Matches: . , ; : ! ? ' " ` ~ - _ ( ) [ ] { } < > / \ | @ # $ % ^ & * + =
  const punctuationPattern = /^[.,;:!?'""`~\-_()[\]{}<>/\\|@#$%^&*+=\s]+|[.,;:!?'""`~\-_()[\]{}<>/\\|@#$%^&*+=\s]+$/g

  result = result.replace(punctuationPattern, '')

  return result.trim()
}

/**
 * Check if a string is all lowercase letters (ignoring non-letter characters).
 */
function isAllLowercase(str: string): boolean {
  const letters = str.replace(/[^a-zA-Z]/g, '')
  if (letters.length === 0) return false
  return letters === letters.toLowerCase()
}

/**
 * Check if a string is all uppercase letters (ignoring non-letter characters).
 */
function isAllUppercase(str: string): boolean {
  const letters = str.replace(/[^a-zA-Z]/g, '')
  if (letters.length === 0) return false
  return letters === letters.toUpperCase()
}

/**
 * Convert a string to title case (first letter of each word capitalized).
 */
function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Normalize the case of a company name.
 * - If ALL LOWERCASE: convert to Title Case
 * - If ALL UPPERCASE: convert to Title Case
 * - If Mixed Case: leave unchanged
 *
 * @param name - The company name to normalize
 * @returns The case-normalized company name
 *
 * @example
 * normalizeCase("harbor stone landscape") // "Harbor Stone landscape"
 * normalizeCase("ABC CONCRETE LLC") // "Abc landscape Llc"
 * normalizeCase("Mixed Case Name") // "Mixed Case Name" (unchanged)
 */
export function normalizeCase(name: string | null | undefined): string {
  if (!name) return ''

  const trimmed = name.trim()
  if (trimmed.length === 0) return ''

  // Check if all lowercase or all uppercase
  if (isAllLowercase(trimmed) || isAllUppercase(trimmed)) {
    return toTitleCase(trimmed)
  }

  // Mixed case - return as-is
  return trimmed
}

/**
 * Sanitize a website URL:
 * 1. Prepend https:// if no protocol exists
 * 2. Remove query parameters
 * 3. Remove trailing slashes
 *
 * @param url - The URL to sanitize
 * @returns The sanitized URL with https:// protocol
 *
 * @example
 * sanitizeWebsiteUrl("www.example.com/?utm_campaign=gmb") // "https://www.example.com"
 * sanitizeWebsiteUrl("https://example.com/page?foo=bar") // "https://example.com/page"
 * sanitizeWebsiteUrl("www.masonryaugusta.com/") // "https://www.masonryaugusta.com"
 * sanitizeWebsiteUrl("example.com") // "https://example.com"
 * sanitizeWebsiteUrl("http://example.com") // "http://example.com" (preserves http)
 */
export function sanitizeWebsiteUrl(url: string | null | undefined): string {
  if (!url) return ''

  let result = url.trim()
  if (result.length === 0) return ''

  // Prepend https:// if no protocol exists
  if (!result.startsWith('http://') && !result.startsWith('https://')) {
    result = 'https://' + result
  }

  // Remove query string and everything after it
  const queryIndex = result.indexOf('?')
  if (queryIndex !== -1) {
    result = result.substring(0, queryIndex)
  }

  // Remove trailing slash (but not if it's the only character after protocol)
  // e.g., "https://example.com/" → "https://example.com"
  if (result.endsWith('/') && !result.endsWith('://')) {
    result = result.slice(0, -1)
  }

  return result
}

/**
 * Apply all sanitization to a company name in one call.
 * 1. Sanitize (remove punctuation from start/end)
 * 2. Normalize case (title case if all lowercase or all uppercase)
 *
 * @param name - The company name to process
 * @returns The fully sanitized and normalized company name
 */
export function processCompanyName(name: string | null | undefined): string {
  return normalizeCase(sanitizeCompanyName(name))
}

