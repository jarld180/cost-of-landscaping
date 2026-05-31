/**
 * Badge SVG Generation Utility
 *
 * Generates verified contractor badges for embedding.
 * Uses #03a71e green to match the verified-badge.vue component.
 */

// Badge dimensions
const BADGE_WIDTH = 200
const BADGE_HEIGHT = 75

/**
 * Generate the verified contractor badge SVG
 * Design: 200x75px with "Verified on Cost of landscape" branding
 */
export function generateBadgeSVG(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${BADGE_WIDTH}" height="${BADGE_HEIGHT}" viewBox="0 0 ${BADGE_WIDTH} ${BADGE_HEIGHT}">
  <rect width="${BADGE_WIDTH}" height="${BADGE_HEIGHT}" rx="6" fill="#f0fdf4" stroke="#03a71e" stroke-width="1"/>
  <circle cx="28" cy="37" r="16" fill="#03a71e"/>
  <path d="M21 37l5 5 9-10" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="54" y="30" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#666">Verified on</text>
  <text x="54" y="50" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600" fill="#03a71e">Cost of landscape</text>
</svg>`
}

/**
 * Generate a generic/placeholder badge SVG for invalid tokens
 */
export function generatePlaceholderBadgeSVG(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${BADGE_WIDTH}" height="${BADGE_HEIGHT}" viewBox="0 0 ${BADGE_WIDTH} ${BADGE_HEIGHT}">
  <rect width="${BADGE_WIDTH}" height="${BADGE_HEIGHT}" rx="6" fill="#f5f5f5" stroke="#e5e5e5" stroke-width="1"/>
  <text x="100" y="42" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#999" text-anchor="middle">Cost of landscape</text>
</svg>`
}
