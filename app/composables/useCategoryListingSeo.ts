/**
 * Composable for generating SEO meta tags for category listing pages
 * e.g., /texas/houston/landscapers/
 *
 * Features:
 * - Schema.org WebPage JSON-LD
 * - Schema.org BreadcrumbList JSON-LD
 * - Open Graph tags
 * - Twitter Card tags
 * - Canonical URL
 * - SSR-compatible
 */
import { getStateName } from '~/utils/usStates'

export interface CategoryListingContractor {
  id: string
  companyName: string
  slug: string
  citySlug: string
  stateSlug: string
  rating?: number | null
  reviewCount?: number | null
  phone?: string | null
}

export interface CategoryListingSeoData {
  cityName: string
  citySlug: string
  stateCode: string
  stateSlug?: string // SEO-optimized state slug (e.g., 'texas' instead of 'TX')
  categoryName?: string
  categorySlug?: string
  totalContractors: number
  contractors?: CategoryListingContractor[]
}

export function useCategoryListingSeo(data: CategoryListingSeoData) {
  const config = useRuntimeConfig()
  const siteUrl = config.public.siteUrl || 'https://costoflandscaping.com'
  const siteName = config.public.siteName || 'Cost of Landscaping'

  // Build canonical URL with SEO-optimized structure
  // Format: /[state]/[city]/landscapers/
  const stateSlug = data.stateSlug || data.stateCode?.toLowerCase()
  const canonicalPath = stateSlug
    ? `/${stateSlug}/${data.citySlug}/landscapers/`
    : `/${data.citySlug}/landscapers/`
  const fullUrl = `${siteUrl}${canonicalPath}`

  // Build location string
  const locationStr = `${data.cityName}, ${data.stateCode}`

  // Generate page title
  const year = new Date().getFullYear()
  const categoryLabel = data.categoryName || 'landscape Contractors'
  const pageTitle = `Best ${categoryLabel} in ${locationStr} (${year})`

  // Generate description
  const contractorCount = data.totalContractors > 0 ? `${data.totalContractors} ` : ''
  const pageDescription = `Find the best ${categoryLabel.toLowerCase()} in ${locationStr}. Browse ${contractorCount}verified, licensed, and insured contractors with real ratings and reviews. Get free quotes today.`

  // Set SEO meta tags
  useSeoMeta({
    title: pageTitle,
    description: pageDescription.slice(0, 160),
    canonicalUrl: fullUrl,

    // Open Graph
    ogTitle: pageTitle,
    ogDescription: pageDescription.slice(0, 200),
    ogType: 'website',
    ogUrl: fullUrl,
    ogSiteName: siteName,
    ogLocale: 'en_US',

    // Twitter Card
    twitterCard: 'summary',
    twitterTitle: pageTitle,
    twitterDescription: pageDescription.slice(0, 200)
  })

  // Get full state name for breadcrumbs
  const stateName = getStateName(data.stateCode)

  // Build Schema.org WebPage schema
  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': fullUrl,
    name: pageTitle,
    description: pageDescription,
    url: fullUrl,
    isPartOf: {
      '@type': 'WebSite',
      name: siteName,
      url: siteUrl
    },
    about: {
      '@type': 'Service',
      name: categoryLabel,
      areaServed: {
        '@type': 'City',
        name: data.cityName,
        containedInPlace: {
          '@type': 'State',
          name: stateName
        }
      }
    }
  }

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
        name: `${data.cityName} landscape Contractors`,
        item: fullUrl
      }
    ]
  }

  // Build Schema.org ItemList when contractors are provided
  const scripts: Array<{ type: string; innerHTML: string }> = [
    { type: 'application/ld+json', innerHTML: JSON.stringify(webPageSchema) },
    { type: 'application/ld+json', innerHTML: JSON.stringify(breadcrumbSchema) }
  ]

  if (data.contractors && data.contractors.length > 0) {
    const itemListSchema = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `${categoryLabel} in ${locationStr}`,
      numberOfItems: data.contractors.length,
      itemListElement: data.contractors.map((contractor, index) => {
        const profileUrl = `${siteUrl}/${contractor.stateSlug}/${contractor.citySlug}/landscapers/${contractor.slug}/`
        const item: Record<string, unknown> = {
          '@type': 'LocalBusiness',
          name: contractor.companyName,
          url: profileUrl
        }
        if (contractor.phone) item.telephone = contractor.phone
        if (contractor.rating && contractor.reviewCount && contractor.reviewCount > 0) {
          item.aggregateRating = {
            '@type': 'AggregateRating',
            ratingValue: contractor.rating,
            reviewCount: contractor.reviewCount
          }
        }
        return {
          '@type': 'ListItem',
          position: index + 1,
          item
        }
      })
    }
    scripts.push({ type: 'application/ld+json', innerHTML: JSON.stringify(itemListSchema) })
  }

  // Add to head
  useHead({
    title: pageTitle,
    link: [
      { rel: 'canonical', href: fullUrl }
    ],
    script: scripts
  })

  return {
    pageTitle,
    pageDescription,
    canonicalUrl: fullUrl
  }
}

