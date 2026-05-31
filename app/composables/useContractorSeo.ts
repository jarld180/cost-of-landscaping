/**
 * Composable for generating SEO meta tags for contractor profile pages
 *
 * Features:
 * - Schema.org LocalBusiness JSON-LD
 * - Schema.org BreadcrumbList JSON-LD
 * - Open Graph tags
 * - Twitter Card tags
 * - Canonical URL
 * - SSR-compatible
 */
import { getStateName, getStateSlugFromCode } from '~/utils/usStates'

export interface ContractorSeoData {
  companyName: string
  slug: string
  description?: string | null
  streetAddress?: string | null
  postalCode?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  rating?: number | null
  reviewCount?: number | null
  cityName?: string
  citySlug?: string
  stateCode?: string
  stateSlug?: string // SEO-optimized state slug (e.g., 'texas' instead of 'TX')
  lat?: number | null
  lng?: number | null
  images?: { url: string; alt?: string }[] | string[]
  categories?: string[]
  openingHours?: Record<string, string>
}

export function useContractorSeo(contractor: ContractorSeoData) {
  const config = useRuntimeConfig()
  const siteUrl = config.public.siteUrl || 'https://costoflandscaping.com'
  const siteName = config.public.siteName || 'Cost of Landscaping'

  // Build canonical URL with SEO-optimized structure
  // Format: /[state]/[city]/landscapers/[slug]
  // Convert state code (e.g., 'SC') to state slug (e.g., 'south-carolina')
  const stateSlug = contractor.stateSlug || (contractor.stateCode ? getStateSlugFromCode(contractor.stateCode) : undefined)
  const canonicalPath = stateSlug
    ? `/${stateSlug}/${contractor.citySlug}/landscapers/${contractor.slug}`
    : `/${contractor.citySlug}/landscapers/${contractor.slug}`
  const fullUrl = `${siteUrl}${canonicalPath}`

  // Build location string
  const locationParts = [contractor.cityName, contractor.stateCode].filter(Boolean)
  const locationStr = locationParts.join(', ')

  // Generate page title
  const year = new Date().getFullYear()
  const pageTitle = `${contractor.companyName} | landscape Contractor in ${locationStr} (${year})`

  // Generate description (use provided or generate default)
  const ratingStr = contractor.rating && contractor.reviewCount && contractor.reviewCount > 0
    ? ` Rated ${contractor.rating}/5 from ${contractor.reviewCount} reviews.`
    : ''
  const pageDescription = contractor.description?.slice(0, 140)
    || `${contractor.companyName} is a licensed landscape contractor serving ${locationStr}.${ratingStr} View services, photos, and contact info.`

  // Primary image for OG/Twitter
  const primaryImage = contractor.images?.[0]?.url

  // Set SEO meta tags
  useSeoMeta({
    title: pageTitle,
    description: pageDescription.slice(0, 160),
    canonicalUrl: fullUrl,

    // Open Graph
    ogTitle: pageTitle,
    ogDescription: pageDescription.slice(0, 200),
    ogType: 'business.business',
    ogUrl: fullUrl,
    ogSiteName: siteName,
    ogLocale: 'en_US',
    ogImage: primaryImage,
    ogImageAlt: `${contractor.companyName} - landscape Contractor`,

    // Twitter Card
    twitterCard: 'summary_large_image',
    twitterTitle: pageTitle,
    twitterDescription: pageDescription.slice(0, 200),
    twitterImage: primaryImage
  })

  // Build Schema.org LocalBusiness JSON-LD
  const localBusinessSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': fullUrl,
    name: contractor.companyName,
    description: contractor.description,
    url: contractor.website || fullUrl,
    telephone: contractor.phone,
    email: contractor.email
  }

  // Add address
  if (contractor.streetAddress || contractor.cityName) {
    localBusinessSchema.address = {
      '@type': 'PostalAddress',
      streetAddress: contractor.streetAddress,
      addressLocality: contractor.cityName,
      addressRegion: contractor.stateCode,
      postalCode: contractor.postalCode,
      addressCountry: 'US'
    }
  }

  // Add geo coordinates
  if (contractor.lat && contractor.lng) {
    localBusinessSchema.geo = {
      '@type': 'GeoCoordinates',
      latitude: contractor.lat,
      longitude: contractor.lng
    }
  }

  // Add aggregate rating
  if (contractor.rating && contractor.reviewCount && contractor.reviewCount > 0) {
    localBusinessSchema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: contractor.rating,
      reviewCount: contractor.reviewCount,
      bestRating: 5,
      worstRating: 1
    }
  }

  // Add images
  if (contractor.images && contractor.images.length > 0) {
    localBusinessSchema.image = contractor.images.map(img => img.url)
  }

  // Get full state name for breadcrumbs
  const stateName = getStateName(contractor.stateCode || '')

  // Build Schema.org BreadcrumbList
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: siteUrl
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: stateName,
        item: `${siteUrl}/${stateSlug}/`
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: `${contractor.cityName} landscape Contractors`,
        item: `${siteUrl}/${stateSlug}/${contractor.citySlug}/landscapers/`
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: contractor.companyName,
        item: fullUrl
      }
    ]
  }

  // Add to head
  useHead({
    title: pageTitle,
    link: [
      { rel: 'canonical', href: fullUrl }
    ],
    script: [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify(localBusinessSchema)
      },
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify(breadcrumbSchema)
      }
    ]
  })

  return {
    pageTitle,
    pageDescription,
    canonicalUrl: fullUrl,
    localBusinessSchema,
    breadcrumbSchema
  }
}

