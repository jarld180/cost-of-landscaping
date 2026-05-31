/**
 * useContractorSearchSeo composable
 *
 * Provides SEO meta tags and Schema.org structured data for contractor search pages.
 * Handles dynamic titles based on active filters and location context.
 */

import { computed, type Ref } from 'vue'

export interface ContractorSearchSeoOptions {
  /** Total number of contractors in results */
  totalContractors: Ref<number>
  /** Active service type filter (slug) */
  serviceType?: Ref<string | null>
  /** Active rating filter */
  minRating?: Ref<number | null>
  /** State name if filtering by state */
  stateName?: string
  /** State abbreviation if filtering by state */
  stateCode?: string
  /** City name if filtering by city */
  cityName?: string
}

export function useContractorSearchSeo(options: ContractorSearchSeoOptions) {
  const config = useRuntimeConfig()
  const siteUrl = config.public.siteUrl || 'https://costoflandscaping.com'
  const siteName = config.public.siteName || 'Cost of Landscaping'

  // Build dynamic page title based on context
  const pageTitle = computed(() => {
    if (options.cityName && options.stateName) {
      return `Landscape Pros in ${options.cityName}, ${options.stateCode}`
    }
    if (options.stateName) {
      return `Landscape Pros in ${options.stateName}`
    }
    return `Find Landscape Pros Near You`
  })

  // Build dynamic description based on context
  const pageDescription = computed(() => {
    const count = options.totalContractors.value
    
    if (options.cityName && options.stateName) {
      return `Browse ${count}+ verified landscape pros in ${options.cityName}, ${options.stateCode}. Compare ratings, read reviews, and get quotes for driveways, patios, foundations and more.`
    }
    if (options.stateName) {
      return `Find ${count}+ top-rated landscape pros across ${options.stateName}. Compare services, read reviews, and get free quotes for your landscape project.`
    }
    return `Search and compare ${count}+ top-rated landscape pros across the United States. Get quotes for driveways, patios, foundations, stamped landscape, and more.`
  })

  // Canonical URL
  const canonicalUrl = computed(() => {
    if (options.cityName && options.stateCode) {
      const stateSlug = options.stateCode.toLowerCase()
      const citySlug = options.cityName.toLowerCase().replace(/\s+/g, '-')
      return `${siteUrl}/${stateSlug}/${citySlug}/landscapers/`
    }
    if (options.stateCode) {
      return `${siteUrl}/${options.stateCode.toLowerCase()}/`
    }
    return `${siteUrl}/landscapers/`
  })

  // Schema.org WebPage structured data
  const schemaOrgWebPage = computed(() => ({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: pageTitle.value,
    description: pageDescription.value,
    url: canonicalUrl.value,
    isPartOf: {
      '@type': 'WebSite',
      name: siteName,
      url: siteUrl
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/landscapers/?q={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    },
    // Future: Featured contractors monetization
    // TODO: Add 'mainEntity' with ItemList of featured/sponsored contractors
  }))

  // Apply SEO meta tags
  function applySeoMeta() {
    useSeoMeta({
      title: pageTitle.value,
      description: pageDescription.value,
      ogTitle: pageTitle.value,
      ogDescription: pageDescription.value,
      ogType: 'website',
      ogUrl: canonicalUrl.value,
      ogSiteName: siteName,
      ogLocale: 'en_US',
      twitterCard: 'summary',
      twitterTitle: pageTitle.value,
      twitterDescription: pageDescription.value
    })

    useHead({
      title: pageTitle.value,
      link: [{ rel: 'canonical', href: canonicalUrl.value }],
      script: [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify(schemaOrgWebPage.value)
        }
      ]
    })
  }

  return {
    pageTitle,
    pageDescription,
    canonicalUrl,
    schemaOrgWebPage,
    applySeoMeta,
    siteName,
    siteUrl
  }
}

