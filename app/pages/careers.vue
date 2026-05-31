<script setup lang="ts">
definePageMeta({ layout: 'default' })
useSeoMeta({
  title: 'Careers — Cost of Landscaping',
  description: 'Cost of Landscaping is an independent research desk for residential landscape pricing. We hire writers, researchers, and data analysts who care about getting the numbers right.',
  robots: 'index, follow'
})

const jobs = [
  {
    title: 'Research Writer — Landscape Pricing',
    type: 'Contract (remote)',
    location: 'Remote, US',
    description: 'Write 2,500–3,500 word evergreen cost guides on lawn care, landscape design, hardscaping, irrigation, and tree service. You will be writing for homeowners about to spend $3k–$80k and want them to walk away with a real budget — not a generic estimate.',
    requirements: ['Portfolio of long-form home-services or trade pricing content', 'Comfort interviewing contractors and pulling regional pricing data', 'Plain, direct writing — no SEO filler'],
  },
  {
    title: 'Data Analyst — Contractor Directory',
    type: 'Contract (remote)',
    location: 'Remote, US',
    description: 'Maintain and enrich the 36k+ landscape pro directory. Deduplication, licensing/insurance verification workflows, geocoding cleanup, ranking signal QA across all 50 states.',
    requirements: ['SQL + Python (pandas) comfort', 'Experience with US business data (license boards, BBB, Google Places)', 'Detail-obsessed — small errors compound at our scale'],
  },
  {
    title: 'Editor — Cost Guides',
    type: 'Part-time',
    location: 'Remote, US',
    description: 'Review and approve every cost guide and city listicle before publish. Hold the line on accuracy, schema correctness, internal linking, and our independent-research-desk voice.',
    requirements: ['5+ years editing trade, home-services, or pricing content', 'Strong SEO + schema instincts', 'Comfortable rejecting and rewriting drafts that miss the bar'],
  },
]

const perks = [
  { icon: 'heroicons:globe-alt', label: 'Fully remote', detail: 'Async-first, US time zones' },
  { icon: 'heroicons:currency-dollar', label: 'Paid by the piece', detail: 'Per-guide or per-city rates; no salary games' },
  { icon: 'heroicons:user-group', label: 'Tiny team', detail: 'You will talk to the founder, not a layer of managers' },
  { icon: 'heroicons:arrow-trending-up', label: 'Real bylines', detail: 'Your name on the research, not ghostwritten' },
]
</script>

<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-900">
    <!-- Hero -->
    <div class="bg-[#f0f7f0] dark:bg-neutral-800">
      <div class="container mx-auto px-4 py-12 md:py-16">
        <div class="mx-auto max-w-3xl text-center">
          <p class="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">We're hiring</p>
          <h1 class="font-heading mb-4 text-4xl font-bold leading-tight text-neutral-900 dark:text-white md:text-5xl">
            Help us get residential landscape pricing right
          </h1>
          <p class="text-lg text-neutral-700 dark:text-neutral-300">
            Cost of Landscaping is an independent research desk — no paid placements, no "request a quote" funnels disguised as content. If that sounds like the kind of work you want your byline on, read on.
          </p>
          <a
            href="#open-positions"
            class="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            See Open Positions
          </a>
        </div>
      </div>
    </div>

    <!-- Perks -->
    <div class="container mx-auto px-4 py-12">
      <h2 class="font-heading mb-8 text-center text-2xl font-bold text-neutral-900 dark:text-white">How we work</h2>
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="perk in perks"
          :key="perk.label"
          class="rounded-xl border border-neutral-200 bg-white p-6 text-center dark:border-neutral-700 dark:bg-neutral-800"
        >
          <Icon :name="perk.icon" class="mx-auto mb-3 h-8 w-8 text-blue-600 dark:text-blue-400" />
          <p class="mb-1 font-semibold text-neutral-900 dark:text-white">{{ perk.label }}</p>
          <p class="text-sm text-neutral-500 dark:text-neutral-400">{{ perk.detail }}</p>
        </div>
      </div>
    </div>

    <!-- Open Positions -->
    <div id="open-positions" class="container mx-auto px-4 pb-16">
      <h2 class="font-heading mb-8 text-2xl font-bold text-neutral-900 dark:text-white">Open Positions</h2>
      <div class="space-y-6">
        <div
          v-for="job in jobs"
          :key="job.title"
          class="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800"
        >
          <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 class="font-heading text-xl font-bold text-neutral-900 dark:text-white">{{ job.title }}</h3>
              <div class="mt-1 flex flex-wrap gap-2">
                <span class="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  <Icon name="heroicons:briefcase" class="h-3 w-3" />
                  {{ job.type }}
                </span>
                <span class="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
                  <Icon name="heroicons:map-pin" class="h-3 w-3" />
                  {{ job.location }}
                </span>
              </div>
            </div>
            <a
              href="mailto:careers@costoflandscaping.com"
              class="shrink-0 rounded-lg border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-600 hover:text-white dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-400 dark:hover:text-neutral-900"
            >
              Apply Now
            </a>
          </div>
          <p class="mb-4 text-neutral-600 dark:text-neutral-300">{{ job.description }}</p>
          <div>
            <p class="mb-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">Requirements</p>
            <ul class="space-y-1">
              <li v-for="req in job.requirements" :key="req" class="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                <Icon name="heroicons:check-circle" class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                {{ req }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- How to Apply CTA -->
    <div class="border-t border-neutral-200 bg-white py-12 dark:border-neutral-700 dark:bg-neutral-800">
      <div class="container mx-auto px-4 text-center">
        <h2 class="font-heading mb-3 text-2xl font-bold text-neutral-900 dark:text-white">Ready to Apply?</h2>
        <p class="mb-6 text-neutral-600 dark:text-neutral-300">
          Send your name, the role you want, and 2–3 published samples (or a portfolio URL) to:
        </p>
        <a
          href="mailto:careers@costoflandscaping.com"
          class="inline-block rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          careers@costoflandscaping.com
        </a>
        <p class="mt-4 text-sm text-neutral-500 dark:text-neutral-400">We typically respond within 3–5 business days.</p>
      </div>
    </div>
  </div>
</template>
