<script setup lang="ts">
definePageMeta({ layout: 'default' })
useSeoMeta({
  title: 'Careers — Local Landscaper',
  description: 'Join the Local Landscaper team. Browse open positions and apply to work with the best landscaping crews in North Carolina.',
  robots: 'index, follow'
})

const jobs = [
  {
    title: 'landscaping Crew Member',
    type: 'Full-time',
    location: 'Charlotte, NC',
    description: 'Hands-on landscape work — pouring, finishing, and forming driveways, patios, and foundations. No prior experience required; we train the right people.',
    requirements: ['Valid driver\'s license', 'Ability to lift 50 lbs', 'Reliable transportation', 'Team player'],
  },
  {
    title: 'landscaping Finisher',
    type: 'Full-time',
    location: 'Charlotte, NC',
    description: 'Responsible for surface finishing on residential and commercial landscape projects. Broom, trowel, and stamped work.',
    requirements: ['2+ years landscaping finishing experience', 'Stamped landscaping knowledge a plus', 'Attention to detail'],
  },
  {
    title: 'Foreman / Lead',
    type: 'Full-time',
    location: 'Charlotte, NC',
    description: 'Lead a crew of 3–5 on residential projects from prep through pour. Coordinate with homeowners and handle daily site management.',
    requirements: ['3+ years in landscaping', 'Experience managing a crew', 'Strong communication skills', 'Valid driver\'s license'],
  },
]

const perks = [
  { icon: 'heroicons:currency-dollar', label: 'Competitive pay', detail: 'Weekly pay, performance bonuses' },
  { icon: 'heroicons:calendar-days', label: 'Steady work', detail: 'Year-round projects — no slow season' },
  { icon: 'heroicons:user-group', label: 'Small team', detail: 'Tight-knit crews, not a big corporation' },
  { icon: 'heroicons:arrow-trending-up', label: 'Growth', detail: 'Foreman and management tracks available' },
]
</script>

<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-900">
    <!-- Hero -->
    <div class="bg-[#edf2fc] dark:bg-neutral-800">
      <div class="container mx-auto px-4 py-12 md:py-16">
        <div class="mx-auto max-w-3xl text-center">
          <p class="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">We're hiring</p>
          <h1 class="font-heading mb-4 text-4xl font-bold leading-tight text-neutral-900 dark:text-white md:text-5xl">
            Build Something That Lasts
          </h1>
          <p class="text-lg text-neutral-700 dark:text-neutral-300">
            Join a landscaping crew that takes craftsmanship seriously. We're looking for hard workers who want steady pay and room to grow.
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
      <h2 class="font-heading mb-8 text-center text-2xl font-bold text-neutral-900 dark:text-white">Why Work With Us</h2>
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
              href="mailto:careers@locallandscapingcontractor.com"
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
          Send your name, position of interest, and a little about yourself to:
        </p>
        <a
          href="mailto:careers@locallandscapingcontractor.com"
          class="inline-block rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          careers@locallandscapingcontractor.com
        </a>
        <p class="mt-4 text-sm text-neutral-500 dark:text-neutral-400">We typically respond within 1–2 business days.</p>
      </div>
    </div>
  </div>
</template>
