<script setup lang="ts">
interface RelatedArticle {
  title: string
  to: string
  excerpt: string
}

interface CostRow {
  label: string
  range: string
  note?: string
}

interface FaqItem {
  question: string
  answer: string
}

interface Props {
  serviceName: string
  serviceSlug: string
  heroImage: string
  oneLiner: string
  intro: string
  quickAnswer: string
  costRows: CostRow[]
  whatDrivesCost: string[]
  hireChecklist: string[]
  relatedArticles: RelatedArticle[]
  faqs: FaqItem[]
}

const props = defineProps<Props>()

const config = useRuntimeConfig()
const siteUrl = config.public.siteUrl || 'https://costoflandscaping.com'
const siteName = config.public.siteName || 'Cost of Landscaping'
const canonicalUrl = `${siteUrl}/${props.serviceSlug}`

const pageTitle = `${props.serviceName} Cost in 2026 — National Pricing Guide`
const pageDescription = `${props.oneLiner} Independent research desk pricing for ${props.serviceName.toLowerCase()} in 2026 plus verified pros by city.`

useSeoMeta({
  title: pageTitle,
  description: pageDescription,
  ogTitle: pageTitle,
  ogDescription: pageDescription,
  ogType: 'article',
  ogUrl: canonicalUrl,
  ogSiteName: siteName,
  twitterCard: 'summary_large_image',
})

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: props.faqs.map(f => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.answer }
        }))
      })
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
          { '@type': 'ListItem', position: 2, name: props.serviceName, item: canonicalUrl }
        ]
      })
    }
  ]
})
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-neutral-900">
    <!-- Hero -->
    <section class="relative overflow-hidden bg-[#f0f7f0] dark:bg-neutral-800">
      <div class="container mx-auto px-4 py-12 md:py-20">
        <div class="grid items-center gap-10 md:grid-cols-2">
          <div>
            <nav class="mb-4 flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
              <NuxtLink to="/" class="hover:text-blue-600 dark:hover:text-blue-400">Home</NuxtLink>
              <Icon name="heroicons:chevron-right" class="h-4 w-4" />
              <span class="font-medium text-neutral-900 dark:text-neutral-100">{{ serviceName }}</span>
            </nav>
            <h1 class="font-heading mb-4 text-4xl font-bold leading-tight text-neutral-900 dark:text-white md:text-5xl">
              {{ serviceName }} Cost in 2026
            </h1>
            <p class="mb-6 text-lg text-neutral-700 dark:text-neutral-300">
              {{ oneLiner }}
            </p>
            <div class="flex flex-wrap gap-3">
              <NuxtLink to="/find" class="inline-block rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700">
                Find Pros Near You
              </NuxtLink>
              <a href="#cost-breakdown" class="inline-block rounded-lg border border-blue-600 px-6 py-3 font-semibold text-blue-600 transition hover:bg-blue-50 dark:hover:bg-blue-900/30">
                See Cost Breakdown
              </a>
            </div>
          </div>
          <div class="aspect-[4/3] w-full overflow-hidden rounded-xl shadow-lg">
            <img :src="heroImage" :alt="`${serviceName} 2026 pricing guide`" class="h-full w-full object-cover" />
          </div>
        </div>
      </div>
    </section>

    <!-- Quick Answer -->
    <section class="container mx-auto px-4 py-12">
      <div class="mx-auto max-w-3xl rounded-2xl border-l-4 border-blue-600 bg-blue-50 p-6 dark:bg-blue-900/20">
        <p class="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Quick answer</p>
        <p class="text-lg leading-relaxed text-neutral-900 dark:text-neutral-100">{{ quickAnswer }}</p>
      </div>
    </section>

    <!-- Intro Copy -->
    <section class="container mx-auto px-4 pb-8">
      <div class="prose prose-lg mx-auto max-w-3xl dark:prose-invert">
        <p>{{ intro }}</p>
      </div>
    </section>

    <!-- Cost Breakdown Table -->
    <section id="cost-breakdown" class="container mx-auto px-4 py-12">
      <div class="mx-auto max-w-4xl">
        <h2 class="font-heading mb-6 text-3xl font-bold text-neutral-900 dark:text-white">{{ serviceName }} Cost Breakdown (2026)</h2>
        <div class="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800">
          <table class="w-full">
            <thead>
              <tr class="border-b border-neutral-200 bg-neutral-50 text-left dark:border-neutral-700 dark:bg-neutral-900">
                <th class="px-6 py-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Service</th>
                <th class="px-6 py-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Typical Range</th>
                <th class="px-6 py-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300 max-md:hidden">Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in costRows" :key="row.label" class="border-b border-neutral-100 last:border-0 dark:border-neutral-700">
                <td class="px-6 py-4 font-medium text-neutral-900 dark:text-neutral-100">{{ row.label }}</td>
                <td class="px-6 py-4 font-mono text-sm text-blue-700 dark:text-blue-300">{{ row.range }}</td>
                <td class="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400 max-md:hidden">{{ row.note || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- What Drives Cost + How To Hire (Two-Up) -->
    <section class="container mx-auto px-4 py-12">
      <div class="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
        <div class="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800">
          <h3 class="font-heading mb-4 text-2xl font-bold text-neutral-900 dark:text-white">What drives the cost</h3>
          <ul class="space-y-3">
            <li v-for="factor in whatDrivesCost" :key="factor" class="flex items-start gap-3 text-neutral-700 dark:text-neutral-300">
              <Icon name="heroicons:chevron-right" class="mt-1 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
              <span>{{ factor }}</span>
            </li>
          </ul>
        </div>
        <div class="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800">
          <h3 class="font-heading mb-4 text-2xl font-bold text-neutral-900 dark:text-white">How to hire smart</h3>
          <ul class="space-y-3">
            <li v-for="step in hireChecklist" :key="step" class="flex items-start gap-3 text-neutral-700 dark:text-neutral-300">
              <Icon name="heroicons:check-circle" class="mt-1 h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
              <span>{{ step }}</span>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Related Reading -->
    <section v-if="relatedArticles.length > 0" class="container mx-auto px-4 py-12">
      <div class="mx-auto max-w-5xl">
        <h2 class="font-heading mb-8 text-3xl font-bold text-neutral-900 dark:text-white">Related research</h2>
        <div class="grid gap-6 md:grid-cols-3">
          <NuxtLink
            v-for="article in relatedArticles"
            :key="article.to"
            :to="article.to"
            class="group block rounded-xl border border-neutral-200 bg-white p-6 transition hover:border-blue-300 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-blue-700"
          >
            <h3 class="font-heading mb-2 text-lg font-bold text-neutral-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
              {{ article.title }}
            </h3>
            <p class="text-sm text-neutral-600 dark:text-neutral-400">{{ article.excerpt }}</p>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="container mx-auto px-4 py-12">
      <div class="mx-auto max-w-3xl">
        <h2 class="font-heading mb-8 text-3xl font-bold text-neutral-900 dark:text-white">{{ serviceName }} FAQ</h2>
        <div class="space-y-4">
          <details v-for="faq in faqs" :key="faq.question" class="group rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800">
            <summary class="cursor-pointer list-none">
              <div class="flex items-start justify-between gap-4">
                <h3 class="font-heading font-bold text-neutral-900 dark:text-white">{{ faq.question }}</h3>
                <Icon name="heroicons:chevron-down" class="mt-1 h-5 w-5 flex-shrink-0 text-neutral-500 transition-transform group-open:rotate-180" />
              </div>
            </summary>
            <p class="mt-4 text-neutral-700 dark:text-neutral-300">{{ faq.answer }}</p>
          </details>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <BottomCta />
  </div>
</template>
