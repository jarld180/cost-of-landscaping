/**
 * useFindPageSeo composable
 *
 * Provides SEO meta tags and Schema.org structured data for the /find hub page.
 * Sets up CollectionPage schema and BreadcrumbList for the contractor finder hub.
 */

export function useFindPageSeo() {
  const config = useRuntimeConfig()
  const siteUrl = config.public.siteUrl || 'https://costoflandscaping.com'
  const siteName = config.public.siteName || 'Cost of Landscaping'

  const title = 'Find Landscape Pros by State'
  const description = 'Find trusted landscape pros in your area. Browse contractors by state and city, compare reviews, and get quotes for your project.'
  const url = `${siteUrl}/find`

  // Set SEO meta tags
  useSeoMeta({
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogType: 'website',
    ogUrl: url,
    ogSiteName: siteName,
    ogLocale: 'en_US',
    twitterCard: 'summary',
    twitterTitle: title,
    twitterDescription: description
  })

  // Build Schema.org CollectionPage schema
  const collectionPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Find Landscape Pros',
    description: 'Browse and find trusted landscape pros across the United States by state and city.',
    url,
    isPartOf: {
      '@type': 'WebSite',
      name: siteName,
      url: siteUrl
    }
  }

  // Build Schema.org BreadcrumbList schema
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: siteUrl
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Find Contractors',
        item: url
      }
    ]
  }

  // Add to head
  useHead({
    title,
    link: [
      { rel: 'canonical', href: url }
    ],
    script: [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify(collectionPageSchema)
      },
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify(breadcrumbSchema)
      }
    ]
  })
}
