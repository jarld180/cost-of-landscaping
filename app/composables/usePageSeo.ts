import type { Database } from '~/types/supabase'

type Page = Database['public']['Tables']['pages']['Row']

/**
 * Composable for generating SEO meta tags from page data
 *
 * Features:
 * - Generates all SEO meta tags using useHead() and useSeoMeta()
 * - Supports Schema.org JSON-LD from database metadata
 * - Supports Open Graph tags from database metadata
 * - Supports Twitter Card tags from database metadata
 * - Falls back to basic page fields if metadata not present
 * - SSR-compatible
 *
 * @param page - Page object from database
 *
 * @example
 * ```ts
 * const { data: page } = await useFetch('/api/pages/by-path', { query: { path } })
 * usePageSeo(page.value)
 * ```
 */
export function usePageSeo(page: Page) {
  // Get site config from runtime config
  const config = useRuntimeConfig()
  const siteUrl = config.public.siteUrl || 'https://costoflandscaping.com'
  const siteName = config.public.siteName || 'Cost of Landscaping'

  // Extract SEO metadata from JSONB field
  const seoMetadata = (page.metadata as any)?.seo || {}
  const ogMetadata = seoMetadata.og || {}
  const twitterMetadata = seoMetadata.twitter || {}
  const schemaMetadata = seoMetadata.schema

  // Generate full URL for canonical and OG
  // If canonical_url is already an absolute URL, use it as-is
  // Otherwise, prepend siteUrl to make it absolute
  const isAbsoluteUrl = (url: string) => url.startsWith('http://') || url.startsWith('https://')
  const fullUrl = page.canonical_url
    ? (isAbsoluteUrl(page.canonical_url) ? page.canonical_url : `${siteUrl}${page.canonical_url}`)
    : `${siteUrl}${page.full_path}`

  // Set basic SEO meta tags
  useSeoMeta({
    // Basic meta tags
    title: page.meta_title || page.title,
    description: page.description || undefined,
    keywords: page.meta_keywords?.join(', ') || undefined,
    robots: page.meta_robots?.join(', ') || undefined,

    // Note: Canonical URL is set via useHead() below, not useSeoMeta

    // Open Graph tags
    ogTitle: ogMetadata.title || page.meta_title || page.title,
    ogDescription: ogMetadata.description || page.description || undefined,
    ogType: ogMetadata.type || (page.depth === 0 ? 'website' : 'article'),
    ogUrl: ogMetadata.url || fullUrl,
    ogSiteName: ogMetadata.site_name || siteName,
    ogLocale: ogMetadata.locale || 'en_US',
    ogImage: ogMetadata.image?.url || page.og_image || undefined,
    ogImageWidth: ogMetadata.image?.width || undefined,
    ogImageHeight: ogMetadata.image?.height || undefined,
    ogImageAlt: ogMetadata.image?.alt || page.title,

    // Twitter Card tags
    twitterCard: twitterMetadata.card || 'summary_large_image',
    twitterSite: twitterMetadata.site || undefined,
    twitterCreator: twitterMetadata.creator || undefined,
    twitterTitle: twitterMetadata.title || page.meta_title || page.title,
    twitterDescription: twitterMetadata.description || page.description || undefined,
    twitterImage: twitterMetadata.image || page.og_image || undefined,
    twitterImageAlt: twitterMetadata.image_alt || page.title,

    // Article-specific tags (if applicable)
    ...(page.depth > 0 && page.published_at ? {
      articlePublishedTime: page.published_at,
      articleModifiedTime: page.updated_at,
      articleAuthor: ogMetadata.article?.author || undefined,
      articleSection: ogMetadata.article?.section || undefined,
      articleTag: ogMetadata.article?.tags || undefined,
    } : {})
  })

  // Set canonical URL via useHead (useSeoMeta's canonicalUrl doesn't create <link rel="canonical">)
  useHead({
    link: [
      {
        rel: 'canonical',
        href: fullUrl
      }
    ]
  })

  // Add Schema.org JSON-LD — prefer stored metadata, otherwise auto-generate for article template
  if (schemaMetadata) {
    useHead({
      script: [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify(schemaMetadata)
        }
      ]
    })
  } else if ((page as any).template === 'article' && page.published_at) {
    const articleSchema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: page.meta_title || page.title,
      description: page.description || undefined,
      url: fullUrl,
      datePublished: page.published_at,
      dateModified: page.updated_at || page.published_at,
      publisher: {
        '@type': 'Organization',
        name: siteName,
        url: siteUrl
      },
      isPartOf: {
        '@type': 'WebSite',
        name: siteName,
        url: siteUrl
      }
    }
    if (page.og_image) articleSchema.image = page.og_image

    useHead({
      script: [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify(articleSchema)
        }
      ]
    })
  }

  // Note: Breadcrumb schema is now handled by the Breadcrumbs.vue component
}

