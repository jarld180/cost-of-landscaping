/**
 * Sanitization utilities for API inputs
 *
 * Provides functions to sanitize and normalize user inputs before schema validation.
 * This keeps schema validation pure (validation only) and separates data transformation concerns.
 */

/**
 * Sanitize secondary keywords: trim, dedupe, filter empty, limit to 10
 *
 * Applies the following transformations in order:
 * 1. Trim whitespace from each keyword
 * 2. Filter out empty strings
 * 3. Remove duplicates (case-sensitive)
 * 4. Limit to 10 items maximum
 *
 * @param keywords - Array of keyword strings to sanitize
 * @returns Sanitized array of keywords, or undefined if input is undefined
 *
 * @example
 * sanitizeSecondaryKeywords(['  foo  ', 'bar', '', 'foo', '  ', 'baz'])
 * // Returns: ['foo', 'bar', 'baz']
 *
 * @example
 * sanitizeSecondaryKeywords(undefined)
 * // Returns: undefined
 */
export function sanitizeSecondaryKeywords(keywords?: string[]): string[] | undefined {
  if (!keywords) return undefined

  return keywords
    .map(kw => kw.trim())
    .filter(kw => kw.length > 0)
    .filter((kw, i, arr) => arr.indexOf(kw) === i)
    .slice(0, 10)
}
