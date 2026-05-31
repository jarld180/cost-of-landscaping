/**
 * SEO Metadata Schemas
 * 
 * Defines TypeScript interfaces and JSON schemas for SEO metadata
 * stored in pages.metadata.seo JSONB field
 * 
 * Structure: metadata.seo = { og, twitter, schema }
 */

// =====================================================
// OPEN GRAPH TYPES
// =====================================================

export interface OpenGraphImage {
  url: string
  width?: number
  height?: number
  alt?: string
  type?: string
}

export interface OpenGraphMetadata {
  title?: string
  description?: string
  type?: 'website' | 'article' | 'book' | 'profile' | 'video' | 'music'
  url?: string
  site_name?: string
  locale?: string
  image?: OpenGraphImage | string
  article?: {
    published_time?: string
    modified_time?: string
    author?: string
    section?: string
    tag?: string[]
  }
}

// =====================================================
// TWITTER CARD TYPES
// =====================================================

export interface TwitterCardMetadata {
  card?: 'summary' | 'summary_large_image' | 'app' | 'player'
  site?: string
  creator?: string
  title?: string
  description?: string
  image?: string
  image_alt?: string
}

// =====================================================
// SCHEMA.ORG TYPES
// =====================================================

export interface SchemaOrgPerson {
  '@type': 'Person'
  name: string
  url?: string
  image?: string
}

export interface SchemaOrgOrganization {
  '@type': 'Organization'
  name: string
  url?: string
  logo?: {
    '@type': 'ImageObject'
    url: string
  }
}

export interface SchemaOrgImageObject {
  '@type': 'ImageObject'
  url: string
  width?: number
  height?: number
}

export interface SchemaOrgBreadcrumbListItem {
  '@type': 'ListItem'
  position: number
  name: string
  item?: string
}

export interface SchemaOrgBreadcrumbList {
  '@context': 'https://schema.org'
  '@type': 'BreadcrumbList'
  itemListElement: SchemaOrgBreadcrumbListItem[]
}

export interface SchemaOrgArticle {
  '@context': 'https://schema.org'
  '@type': 'Article' | 'NewsArticle' | 'BlogPosting'
  headline: string
  description?: string
  image?: string | SchemaOrgImageObject
  author?: SchemaOrgPerson | SchemaOrgOrganization
  publisher?: SchemaOrgOrganization
  datePublished?: string
  dateModified?: string
  mainEntityOfPage?: {
    '@type': 'WebPage'
    '@id': string
  }
}

export interface SchemaOrgHowToStep {
  '@type': 'HowToStep'
  name: string
  text: string
  url?: string
  image?: string | SchemaOrgImageObject
}

export interface SchemaOrgHowTo {
  '@context': 'https://schema.org'
  '@type': 'HowTo'
  name: string
  description?: string
  image?: string | SchemaOrgImageObject
  totalTime?: string
  estimatedCost?: {
    '@type': 'MonetaryAmount'
    currency: string
    value: number
  }
  tool?: string[]
  supply?: string[]
  step: SchemaOrgHowToStep[]
}

export interface SchemaOrgQuestion {
  '@type': 'Question'
  name: string
  acceptedAnswer: {
    '@type': 'Answer'
    text: string
  }
}

export interface SchemaOrgFAQPage {
  '@context': 'https://schema.org'
  '@type': 'FAQPage'
  mainEntity: SchemaOrgQuestion[]
}

export interface SchemaOrgLocalBusiness {
  '@context': 'https://schema.org'
  '@type': 'LocalBusiness'
  name: string
  image?: string | SchemaOrgImageObject
  '@id'?: string
  url?: string
  telephone?: string
  priceRange?: string
  address?: {
    '@type': 'PostalAddress'
    streetAddress?: string
    addressLocality?: string
    addressRegion?: string
    postalCode?: string
    addressCountry?: string
  }
  geo?: {
    '@type': 'GeoCoordinates'
    latitude: number
    longitude: number
  }
  openingHoursSpecification?: Array<{
    '@type': 'OpeningHoursSpecification'
    dayOfWeek: string[]
    opens: string
    closes: string
  }>
}

export interface SchemaOrgWebPage {
  '@context': 'https://schema.org'
  '@type': 'WebPage'
  name: string
  description?: string
  url?: string
  breadcrumb?: SchemaOrgBreadcrumbList
}

export type SchemaOrgData =
  | SchemaOrgArticle
  | SchemaOrgHowTo
  | SchemaOrgFAQPage
  | SchemaOrgLocalBusiness
  | SchemaOrgWebPage
  | SchemaOrgBreadcrumbList

// =====================================================
// COMBINED SEO METADATA TYPE
// =====================================================

export interface SEOMetadata {
  og?: OpenGraphMetadata
  twitter?: TwitterCardMetadata
  schema?: SchemaOrgData | SchemaOrgData[]
}

// =====================================================
// COMPLETE PAGE METADATA TYPE
// =====================================================

export interface PageMetadata {
  seo?: SEOMetadata
  template?: Record<string, any>
  [key: string]: any
}

// =====================================================
// EXAMPLE METADATA STRUCTURES
// =====================================================

export const EXAMPLE_HUB_METADATA: PageMetadata = {
  seo: {
    og: {
      title: 'Staining landscape - Complete Guide',
      description: 'Learn everything about landscape staining techniques',
      type: 'website',
      url: 'https://example.com/staining-landscape',
      site_name: 'Cost of Landscaping',
      locale: 'en_US',
      image: {
        url: 'https://example.com/images/staining-landscape.jpg',
        width: 1200,
        height: 630,
        alt: 'landscape staining guide'
      }
    },
    twitter: {
      card: 'summary_large_image',
      site: '@costoflandscape',
      title: 'Staining landscape - Complete Guide',
      description: 'Learn everything about landscape staining techniques',
      image: 'https://example.com/images/staining-landscape.jpg'
    },
    schema: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Staining landscape',
      description: 'Complete guide to landscape staining techniques',
      url: 'https://example.com/staining-landscape'
    }
  },
  template: {
    layout: 'grid',
    columns: 3,
    showChildGrid: true,
    featuredPages: []
  }
}

export const EXAMPLE_ARTICLE_METADATA: PageMetadata = {
  seo: {
    og: {
      title: 'How to Acid Stain landscape',
      description: 'Step-by-step guide to acid staining landscape surfaces',
      type: 'article',
      url: 'https://example.com/staining-landscape/acid-staining',
      site_name: 'Cost of Landscaping',
      locale: 'en_US',
      image: 'https://example.com/images/acid-staining.jpg',
      article: {
        published_time: '2025-11-08T00:00:00Z',
        modified_time: '2025-11-08T00:00:00Z',
        section: 'landscape Staining',
        tag: ['acid stain', 'landscape', 'DIY']
      }
    },
    twitter: {
      card: 'summary_large_image',
      site: '@costoflandscape',
      title: 'How to Acid Stain landscape',
      description: 'Step-by-step guide to acid staining landscape surfaces',
      image: 'https://example.com/images/acid-staining.jpg'
    },
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'How to Acid Stain landscape',
      description: 'Step-by-step guide to acid staining landscape surfaces',
      image: 'https://example.com/images/acid-staining.jpg',
      author: {
        '@type': 'Organization',
        name: 'Cost of Landscaping'
      },
      publisher: {
        '@type': 'Organization',
        name: 'Cost of Landscaping',
        logo: {
          '@type': 'ImageObject',
          url: 'https://example.com/logo.png'
        }
      },
      datePublished: '2025-11-08',
      dateModified: '2025-11-08'
    }
  },
  template: {
    showSidebar: true,
    sidebarPosition: 'right',
    showChildList: true
  }
}

export const EXAMPLE_HOWTO_METADATA: PageMetadata = {
  seo: {
    schema: {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: 'How to Choose Acid Stain Colors',
      description: 'Learn how to select the perfect acid stain color for your landscape',
      image: 'https://example.com/images/color-selection.jpg',
      totalTime: 'PT30M',
      estimatedCost: {
        '@type': 'MonetaryAmount',
        currency: 'USD',
        value: 50
      },
      tool: ['Color samples', 'Test area'],
      supply: ['Acid stain', 'Sealer'],
      step: [
        {
          '@type': 'HowToStep',
          name: 'Understand Color Chemistry',
          text: 'Acid stains react with landscape minerals to create colors'
        },
        {
          '@type': 'HowToStep',
          name: 'Test on Sample',
          text: 'Always test colors on a small area first'
        }
      ]
    }
  }
}

export const EXAMPLE_FAQ_METADATA: PageMetadata = {
  seo: {
    schema: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How long does acid stain last?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Acid stain is permanent and will last as long as the landscape surface itself when properly sealed and maintained.'
          }
        },
        {
          '@type': 'Question',
          name: 'Can I acid stain old landscape?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes, acid stain works on both new and old landscape. The surface must be clean and free of sealers or coatings.'
          }
        }
      ]
    }
  }
}

