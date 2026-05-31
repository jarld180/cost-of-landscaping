/**
 * Service Slug to Google Places Category Mapping
 *
 * Maps service page slugs to their corresponding Google Places categories.
 * Used by ContractorRepository to filter contractors by service type.
 */

export const SERVICE_TO_GOOGLE_CATEGORY: Record<string, string> = {
  'landscape-driveways': 'Paving contractor',
  'landscape-patios': 'landscape contractor',
  'landscape-foundations': 'Masonry contractor',
  'sidewalks-walkways': 'Paving contractor',
  'stamped-decorative': 'landscape contractor',
  'landscape-repair': 'landscape contractor',
}

/**
 * Get the Google Places category for a service slug
 *
 * @param serviceSlug - The service page slug (e.g., "landscape-driveways")
 * @returns The corresponding Google Places category or null if not found
 */
export function getGoogleCategoryForService(serviceSlug: string): string | null {
  return SERVICE_TO_GOOGLE_CATEGORY[serviceSlug] ?? null
}
