/**
 * SEO composable for /[state]/[city]/best-landscapers pages.
 * Generates: meta tags, ItemList JSON-LD, FAQPage JSON-LD, BreadcrumbList JSON-LD.
 */
import { getStateName } from '~/utils/usStates'

export interface CityListicleContractor {
  id: string
  companyName: string
  slug: string
  citySlug: string
  stateSlug: string
  rating?: number | null
  reviewCount?: number | null
  phone?: string | null
  verificationTier?: string | null
}

export interface CityListicleFaq {
  question: string
  answer: string
}

export interface CityListicleSeoData {
  cityName: string
  citySlug: string
  stateCode: string
  stateSlug: string
  totalContractors: number
  contractors?: CityListicleContractor[]
  faqs?: CityListicleFaq[]
}

export function useCityListicleSeo(data: CityListicleSeoData) {
  const config = useRuntimeConfig()
  const siteUrl = config.public.siteUrl || 'https://costoflandscaping.com'
  const siteName = config.public.siteName || 'Cost of Landscaping'

  const year = new Date().getFullYear()
  const locationStr = `${data.cityName}, ${data.stateCode}`
  const stateName = getStateName(data.stateCode)
  const canonicalUrl = `${siteUrl}/${data.stateSlug}/${data.citySlug}/best-landscapers/`

  const rankedCount = data.contractors?.length || 0
  const totalCountStr = data.totalContractors > 0 ? `${data.totalContractors} local pros` : 'local pros'
  const pageTitle = rankedCount > 0
    ? `Top ${rankedCount} landscape Installers Near ${data.cityName}`
    : `landscape Installers Near ${data.cityName}`
  const pageDescription = rankedCount > 0
    ? `Top ${rankedCount} landscape installers in ${locationStr}. We verify license + insurance for every contractor listed, ranked from ${totalCountStr}. Free quotes, no signup.`
    : `landscape installers in ${locationStr}. We verify license + insurance for every contractor listed. Free quotes, no signup.`

  useSeoMeta({
    title: pageTitle,
    description: pageDescription.slice(0, 160),
    ogTitle: pageTitle,
    ogDescription: pageDescription.slice(0, 200),
    ogType: 'website',
    ogUrl: canonicalUrl,
    ogSiteName: siteName,
    ogLocale: 'en_US',
    twitterCard: 'summary',
    twitterTitle: pageTitle,
    twitterDescription: pageDescription.slice(0, 200)
  })

  // BreadcrumbList
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: stateName, item: `${siteUrl}/${data.stateSlug}/` },
      { '@type': 'ListItem', position: 3, name: `${data.cityName} Landscape Pros`, item: `${siteUrl}/${data.stateSlug}/${data.citySlug}/landscapers/` },
      { '@type': 'ListItem', position: 4, name: `Best Landscape Pros in ${data.cityName}`, item: canonicalUrl }
    ]
  }

  const scripts: { type: string; innerHTML: string }[] = [
    { type: 'application/ld+json', innerHTML: JSON.stringify(breadcrumbSchema) }
  ]

  // ItemList — live ranked contractors
  if (data.contractors && data.contractors.length > 0) {
    const itemListSchema = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `Best Landscape Pros in ${locationStr}`,
      numberOfItems: data.contractors.length,
      itemListElement: data.contractors.map((c, i) => {
        const profileUrl = `${siteUrl}/${c.stateSlug}/${c.citySlug}/landscapers/${c.slug}/`
        const item: Record<string, unknown> = {
          '@type': 'LocalBusiness',
          name: c.companyName,
          url: profileUrl
        }
        if (c.phone) item.telephone = c.phone
        if (c.rating && c.reviewCount && c.reviewCount > 0) {
          item.aggregateRating = {
            '@type': 'AggregateRating',
            ratingValue: c.rating,
            reviewCount: c.reviewCount
          }
        }
        return { '@type': 'ListItem', position: i + 1, item }
      })
    }
    scripts.push({ type: 'application/ld+json', innerHTML: JSON.stringify(itemListSchema) })
  }

  // FAQPage
  if (data.faqs && data.faqs.length > 0) {
    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: data.faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer
        }
      }))
    }
    scripts.push({ type: 'application/ld+json', innerHTML: JSON.stringify(faqSchema) })
  }

  useHead({
    title: pageTitle,
    link: [{ rel: 'canonical', href: canonicalUrl }],
    script: scripts
  })

  return { pageTitle, pageDescription, canonicalUrl }
}
