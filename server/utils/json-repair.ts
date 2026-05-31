/**
 * JSON Repair Utility
 *
 * Handles malformed JSON responses from LLMs by attempting various repair strategies.
 * Common issues include:
 * - JSON wrapped in markdown code blocks
 * - Trailing commas
 * - Unescaped quotes
 * - Missing closing brackets
 */

import { consola } from 'consola'
import type { z } from 'zod'

/**
 * Result of JSON repair attempt
 */
export interface JSONRepairResult<T = unknown> {
  /** Whether repair was successful */
  success: boolean
  /** Parsed and validated data (if successful) */
  data?: T
  /** Error message (if failed) */
  error?: string
  /** Which repair strategy succeeded */
  strategy?: string
}

/**
 * Extract JSON from markdown code blocks
 * Handles: ```json\n{...}\n``` or ```\n{...}\n```
 * Also handles cases where LLM wraps entire response in code block
 */
function extractFromMarkdown(text: string): string {
  let cleaned = text.trim()

  // First, strip any leading/trailing backticks with optional language tag
  // This handles: ```json\n{...}\n``` including multi-line
  if (cleaned.startsWith('```')) {
    // Remove opening code fence (```json or ``` on first line)
    cleaned = cleaned.replace(/^```[a-z]*\s*\n?/i, '')
    // Remove closing code fence
    cleaned = cleaned.replace(/\n?```\s*$/, '')
  }

  // Try to extract from code blocks (for embedded code blocks)
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim()
  }

  // Try to find JSON object or array boundaries
  // This handles cases where there's extra text before/after JSON
  const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/m)
  if (jsonMatch) {
    return jsonMatch[1].trim()
  }

  return cleaned.trim()
}

/**
 * Remove trailing commas from JSON string
 */
function removeTrailingCommas(text: string): string {
  // Remove trailing commas before closing brackets/braces
  return text
    .replace(/,(\s*[}\]])/g, '$1')
    .replace(/,(\s*$)/gm, '')
}

/**
 * Attempt to fix common JSON formatting issues
 */
function fixCommonIssues(text: string): string {
  let fixed = text

  // Remove trailing commas
  fixed = removeTrailingCommas(fixed)

  // Fix unescaped newlines in strings (common LLM issue)
  fixed = fixed.replace(/([^\\])\n/g, '$1\\n')

  // Remove BOM if present
  fixed = fixed.replace(/^\uFEFF/, '')

  return fixed
}

/**
 * Normalize content fields by truncating to valid lengths and fixing type issues
 * LLMs often ignore character limits or return strings instead of numbers
 *
 * Handles:
 * - title: max 80 characters (truncates with ellipsis)
 * - excerpt: max 160 characters (truncates with ellipsis)
 * - metaTitle: max 60 characters (truncates with ellipsis)
 * - metaDescription: max 160 characters (truncates with ellipsis)
 * - keywordDensity.percentage: convert string (e.g., "2.5%") to number
 */
function normalizeSEOFields(parsed: unknown): unknown {
  if (!parsed || typeof parsed !== 'object') return parsed

  const obj = parsed as Record<string, unknown>

  // Fix keywordDensity.percentage if it's a string (e.g., "2.5%" or "2.5")
  if (obj.keywordDensity && typeof obj.keywordDensity === 'object') {
    const kd = obj.keywordDensity as Record<string, unknown>
    if (typeof kd.percentage === 'string') {
      // Remove % sign and parse as float
      const numericValue = parseFloat(kd.percentage.replace('%', ''))
      if (!isNaN(numericValue)) {
        kd.percentage = numericValue
        consola.debug(`Converted keywordDensity.percentage from string "${kd.percentage}" to number ${numericValue}`)
      }
    }
  }

  // Truncate title to 80 chars if needed (for article titles)
  if (typeof obj.title === 'string' && obj.title.length > 80) {
    const title = obj.title
    let truncated = title.substring(0, 77)

    // Break at last space
    const lastSpace = truncated.lastIndexOf(' ')
    if (lastSpace > 50) {
      truncated = truncated.substring(0, lastSpace)
    }

    obj.title = truncated.trim() + '...'
    consola.warn(`Truncated title from ${title.length} to ${obj.title.length} chars`)
  }

  // Truncate excerpt to 160 chars if needed (WriterAgent output)
  if (typeof obj.excerpt === 'string' && obj.excerpt.length > 160) {
    const excerpt = obj.excerpt
    let truncated = excerpt.substring(0, 157)

    // Break at last sentence end or space
    const lastPeriod = truncated.lastIndexOf('.')
    if (lastPeriod > 100) {
      truncated = truncated.substring(0, lastPeriod + 1)
    } else {
      const lastSpace = truncated.lastIndexOf(' ')
      if (lastSpace > 130) {
        truncated = truncated.substring(0, lastSpace) + '...'
      } else {
        truncated = truncated + '...'
      }
    }

    obj.excerpt = truncated.trim()
    consola.warn(`Truncated excerpt from ${excerpt.length} to ${obj.excerpt.length} chars`)
  }

  // Truncate metaTitle to 60 chars if needed
  if (typeof obj.metaTitle === 'string' && obj.metaTitle.length > 60) {
    // Find a clean break point (space or pipe) near the limit
    const title = obj.metaTitle
    let truncated = title.substring(0, 57)

    // Try to break at a pipe separator if present
    const pipeIndex = truncated.lastIndexOf('|')
    if (pipeIndex > 30) {
      truncated = truncated.substring(0, pipeIndex).trim()
    } else {
      // Otherwise break at last space
      const lastSpace = truncated.lastIndexOf(' ')
      if (lastSpace > 40) {
        truncated = truncated.substring(0, lastSpace)
      }
    }

    obj.metaTitle = truncated.trim()
    consola.warn(`Truncated metaTitle from ${title.length} to ${obj.metaTitle.length} chars`)
  }

  // Truncate metaDescription to 160 chars if needed
  if (typeof obj.metaDescription === 'string' && obj.metaDescription.length > 160) {
    const desc = obj.metaDescription
    let truncated = desc.substring(0, 157)

    // Break at last sentence end or space
    const lastPeriod = truncated.lastIndexOf('.')
    if (lastPeriod > 100) {
      truncated = truncated.substring(0, lastPeriod + 1)
    } else {
      const lastSpace = truncated.lastIndexOf(' ')
      if (lastSpace > 130) {
        truncated = truncated.substring(0, lastSpace) + '...'
      } else {
        truncated = truncated + '...'
      }
    }

    obj.metaDescription = truncated.trim()
    consola.warn(`Truncated metaDescription from ${desc.length} to ${obj.metaDescription.length} chars`)
  }

  return obj
}

/**
 * Repair and validate JSON against a Zod schema
 *
 * Attempts multiple repair strategies in order:
 * 1. Parse as-is
 * 2. Extract from markdown code blocks
 * 3. Fix common issues (trailing commas, etc.)
 * 4. Combination of extraction + fixes
 * 5-8. All above with SEO field normalization (truncate metaTitle/metaDescription)
 *
 * @param text - Raw text that may contain JSON
 * @param schema - Zod schema to validate against
 * @returns Repair result with parsed data or error
 */
export function repairJSON<T>(text: string, schema: z.ZodSchema<T>): JSONRepairResult<T> {
  // String-level transformations
  const stringTransforms: Array<{ name: string; transform: (t: string) => string }> = [
    { name: 'as-is', transform: (t) => t },
    { name: 'extract-markdown', transform: extractFromMarkdown },
    { name: 'fix-common-issues', transform: fixCommonIssues },
    { name: 'extract-and-fix', transform: (t) => fixCommonIssues(extractFromMarkdown(t)) },
  ]

  const errors: Array<{ strategy: string; error: string }> = []

  // Try each string transform with and without SEO normalization
  for (const stringTransform of stringTransforms) {
    // First, try without normalization
    try {
      const transformed = stringTransform.transform(text)
      const parsed = JSON.parse(transformed)
      const validated = schema.parse(parsed)

      consola.debug(`JSON repair succeeded with strategy: ${stringTransform.name}`)
      return {
        success: true,
        data: validated,
        strategy: stringTransform.name,
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      errors.push({ strategy: stringTransform.name, error: errorMsg })
    }

    // Then, try with SEO normalization (for cases where LLM ignored char limits)
    try {
      const transformed = stringTransform.transform(text)
      const parsed = JSON.parse(transformed)
      const normalized = normalizeSEOFields(parsed)
      const validated = schema.parse(normalized)

      const strategyName = `${stringTransform.name}+normalize-seo`
      consola.debug(`JSON repair succeeded with strategy: ${strategyName}`)
      return {
        success: true,
        data: validated,
        strategy: strategyName,
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      errors.push({ strategy: `${stringTransform.name}+normalize-seo`, error: errorMsg })
    }
  }

  // All strategies failed - log detailed errors
  const errorMsg = 'Failed to repair JSON after trying all strategies'
  consola.error(errorMsg, { textPreview: text.substring(0, 200) })
  consola.info('JSON repair errors by strategy:', errors)

  // Log the end of the text to see if it's truncated
  consola.info('JSON text ending (last 500 chars):', text.substring(text.length - 500))

  return {
    success: false,
    error: errorMsg,
  }
}

/**
 * Validate JSON string against schema without repair attempts
 * Use this when you want strict validation without auto-repair
 */
export function validateJSON<T>(text: string, schema: z.ZodSchema<T>): JSONRepairResult<T> {
  try {
    const parsed = JSON.parse(text)
    const validated = schema.parse(parsed)

    return {
      success: true,
      data: validated,
      strategy: 'direct-parse',
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'JSON validation failed'
    return {
      success: false,
      error: errorMsg,
    }
  }
}

