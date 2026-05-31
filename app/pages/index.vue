<script setup lang="ts">
// Homepage - Cost of Landscaping
const config = useRuntimeConfig()
const siteUrl = config.public.siteUrl || 'https://costoflandscaping.com'
const siteName = config.public.siteName || 'Cost of Landscaping'

useSeoMeta({
  title: 'Find Trusted Landscapers Near You',
  description: 'Get accurate cost estimates for lawn care, landscape design, hardscaping, irrigation, and tree service — plus verified local pros across all 50 states. Start your project smarter, today.',
  ogTitle: 'Find Trusted Landscapers Near You',
  ogDescription: 'Independent research desk for lawn care, landscape design, hardscaping, irrigation, and tree-service cost — plus verified pros by city.',
  ogType: 'website',
  ogUrl: siteUrl,
  ogSiteName: siteName,
  twitterCard: 'summary_large_image',
})

useHead({
  link: [{ rel: 'canonical', href: siteUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: siteName,
        url: siteUrl,
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${siteUrl}/find?q={search_term_string}`
          },
          'query-input': 'required name=search_term_string'
        }
      })
    }
  ]
})
</script>

<template>
  <div>
    <!-- Hero Section -->
    <Hero />

    <!-- How It Works Section -->
    <HowItWorks />

    <!-- Explore Categories Section -->
    <ExploreCategories />

    <!-- Top Contractors Section -->
    <TopContractors />

    <!-- Homeowner Tips Section -->
    <HomeownerTips />

    <!-- Landscaping Guides & Tips Section -->
    <LandscapingGuideTips />

    <!-- Bottom CTA Section -->
    <BottomCta />
  </div>
</template>

<style scoped>
</style>

