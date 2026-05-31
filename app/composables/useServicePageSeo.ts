/**
 * useServicePageSeo composable
 *
 * Provides SEO meta tags and Schema.org structured data for service pages.
 * Sets up BreadcrumbList schema for service category pages.
 */

export function useServicePageSeo(serviceName: string, serviceSlug: string, description: string) {
  const config = useRuntimeConfig()
  const siteUrl = config.public.siteUrl || 'https://costoflandscaping.com'
  const siteName = config.public.siteName || 'Cost of Landscaping'

  const title = `${serviceName} Contractors`
  const url = `${siteUrl}/${serviceSlug}`

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
        name: serviceName,
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
        innerHTML: JSON.stringify(breadcrumbSchema)
      }
    ]
  })
}
