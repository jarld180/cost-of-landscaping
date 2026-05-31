/**
 * Domain Extraction Utility
 *
 * Extracts the registrable domain from a URL or hostname using the
 * Public Suffix List (PSL) via tldts. This correctly handles:
 * - Multi-part TLDs (co.uk, com.au)
 * - Private/hosted domains (github.io, vercel.app)
 *
 * Used for matching badge referrer domains to contractor websites.
 */

import { parse } from 'tldts'

/**
 * Extract registrable domain from a URL or hostname.
 *
 * Uses PSL-backed parsing for correctness on multi-part TLDs and private domains.
 *
 * @example
 * extractRootDomain('https://www.blog.example.com/page?q=1') // 'example.com'
 * extractRootDomain('https://foo.bar.example.co.uk') // 'example.co.uk'
 * extractRootDomain('mybiz.github.io') // 'mybiz.github.io' (private domain)
 * extractRootDomain('blog.example.com') // 'example.com'
 * extractRootDomain('localhost') // 'localhost'
 * extractRootDomain('not a url') // null
 */
export function extractRootDomain(urlOrHostname: string): string | null {
  if (!urlOrHostname || typeof urlOrHostname !== 'string') {
    return null
  }

  const input = urlOrHostname.trim()
  if (!input) {
    return null
  }

  // Fast-path localhost (tldts marks it as invalid)
  if (
    input === 'localhost' ||
    input.startsWith('localhost:') ||
    input.startsWith('http://localhost') ||
    input.startsWith('https://localhost')
  ) {
    return 'localhost'
  }

  // Use PSL-backed parsing (allowPrivateDomains handles github.io, vercel.app, etc.)
  const result = parse(input, { allowPrivateDomains: true })

  if (!result || result.hostname === null) {
    return null
  }

  const hostname = result.hostname.toLowerCase()

  // Handle IP addresses (don't extract root)
  if (result.isIp) {
    return hostname
  }

  // Return the registrable domain if available
  if (result.domain) {
    return result.domain.toLowerCase()
  }

  // Fallback to hostname for edge cases
  return hostname
}

/**
 * Check if two domains match by comparing their registrable (root) domains.
 *
 * @example
 * doDomainsMatch('blog.example.com', 'https://www.example.com/page') // true
 * doDomainsMatch('other.com', 'example.com') // false
 * doDomainsMatch('foo.github.io', 'bar.github.io') // false (different private domains)
 */
export function doDomainsMatch(domain1: string, domain2: string): boolean {
  const root1 = extractRootDomain(domain1)
  const root2 = extractRootDomain(domain2)

  if (!root1 || !root2) {
    return false
  }

  return root1 === root2
}
