<script setup lang="ts">
// Landscaping Guides & Tips component for the homepage
// Features eyebrow, heading with "See All" button, and article cards in responsive grid
// Displays popular landscaping-related articles and guides

interface Article {
  image: string
  eyebrow: string
  heading: string
  body: string
  to: string
}

// Article data for landscaping guides section — the 4 most relevant published blog articles
const articles: Article[] = [
  {
    image: '/images/driveway.webp',
    eyebrow: 'Lawn Care',
    heading: 'How much does lawn care cost in 2026?',
    body: 'A quarter-acre lawn in 2026 averages $40–$70 per mow, $480–$840 per fertilization season, and $1,800–$3,800 for full annual care. Here is the breakdown by region and lot size.',
    to: '/blog/how-much-does-lawn-care-cost-in-2026'
  },
  {
    image: '/images/patio.webp',
    eyebrow: 'Landscape Design',
    heading: 'Landscape design cost in 2026 — design fees + install',
    body: 'Design-only fees run $50–$200/hr or 10–20% of install. Full design-build for a quarter-acre yard lands $30,000–$100,000+. Here is what your design budget actually buys.',
    to: '/blog/landscape-design-cost-in-2026'
  },
  {
    image: '/images/foundation.webp',
    eyebrow: 'Hardscaping',
    heading: 'Hardscape cost per square foot in 2026',
    body: 'Pavers $15–$30/sf installed. Natural stone $35–$70/sf. Stamped concrete $14–$26/sf. Wood deck $30–$55/sf. Retaining walls $25–$60 per face foot.',
    to: '/blog/hardscape-cost-per-square-foot-2026'
  },
  {
    image: '/images/sidewalks.webp',
    eyebrow: 'Irrigation',
    heading: 'Sprinkler system cost in 2026 — install, zones, smart controllers',
    body: 'Residential sprinkler installs run $1,800–$4,200 per zone in 2026. A typical quarter-acre needs 4–7 zones — $3,000–$8,000 total. Smart controllers add $250–$650.',
    to: '/blog/sprinkler-system-cost-2026'
  },
]
</script>

<template>
  <section class="md:py-26 bg-white py-20 dark:bg-neutral-800 lg:py-28">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <!-- Eyebrow -->
      <div class="mb-6">
        <Eyebrow
          text="Landscaping Guides & Tips"
          variant="blue-blue"
          size="md"
        />
      </div>

      <!-- Heading + See All Button Row -->
      <div class="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <!-- Heading -->
        <h2 class="font-heading text-3xl font-bold leading-tight text-neutral-900 dark:text-neutral-50 md:text-4xl lg:text-5xl">
          Popular articles
        </h2>

        <!-- See All Button -->
        <div class="flex justify-start">
          <NuxtLink to="/blog">
            <Button
              text="See All"
              variant="primary-outline"
              size="md"
              icon="heroicons:arrow-right"
              icon-position="right"
            />
          </NuxtLink>
        </div>
      </div>

      <!-- Articles Grid -->
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2 lg:gap-8">
        <ArticleCard
          v-for="article in articles"
          :key="article.heading"
          :image="article.image"
          :eyebrow="article.eyebrow"
          :heading="article.heading"
          :to="article.to"
          variant="secondary-light-outline"
          :border="true"
          border-width="thin"
        >
          {{ article.body }}
        </ArticleCard>
      </div>
    </div>
  </section>
</template>

<style scoped></style>

