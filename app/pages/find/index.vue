<template>
  <div>
    <!-- 1. Hero -->
    <FindHero />
    
    <!-- 2. Trust Signals -->
    <section v-if="statsData" class="py-8 text-center">
      <p class="text-lg text-neutral-600 dark:text-neutral-400">
        <span class="font-semibold text-neutral-900 dark:text-neutral-100">
          {{ statsData.totalContractors?.toLocaleString() || '0' }}+
        </span> Contractors &bull;
        <span class="font-semibold text-neutral-900 dark:text-neutral-100">
          {{ statsData.statesWithContractors || '0' }}
        </span> States &bull;
        <span class="font-semibold text-neutral-900 dark:text-neutral-100">
          {{ statsData.citiesWithContractors?.toLocaleString() || '0' }}+
        </span> Cities
      </p>
    </section>
    
    <!-- 3. Browse by State -->
    <FindBrowseByState :states="displayStates" />
    
    <!-- 4. Popular Services -->
    <PopularServices />
    
    <!-- 5. FAQ -->
    <FaqAccordion :items="faqItems" />
    
    <!-- 6. Bottom CTA -->
    <BottomCta />
  </div>
</template>

<script setup lang="ts">
import { US_STATES } from '~/utils/usStates'

// SEO (will be created in task 6)
// @ts-ignore - Composable will be created in next task
useFindPageSeo()

// Fetch data
const { data: statesData } = await useFetch('/api/public/states-with-cities')
const { data: statsData } = await useFetch('/api/public/hub-stats')

// Fallback for error state
const fallbackStates = US_STATES.map(state => ({
  name: state.name,
  slug: state.slug,
  abbreviation: state.abbreviation,
  hasContractors: false,
  topCities: []
}))

const displayStates = computed(() => statesData.value?.states || fallbackStates)

// FAQ items
const faqItems = [
  { 
    question: "How do I find a landscaper near me?", 
    answer: "Use our search tool above to enter your city, state, or ZIP code. We'll show you local landscape pros in your area with reviews and ratings to help you make an informed decision." 
  },
  {
    question: "What services do landscape pros offer?",
    answer: "Landscape pros cover weekly mowing and seasonal maintenance, lawn care programs (aeration, overseeding, fertilization), full landscape design and design-build, hardscaping (paver patios, walkways, retaining walls, fire pits), irrigation install and repair, sod and planting installs, mulch refreshes, and tree service (trimming, removal, stump grinding)."
  },
  { 
    question: "How do I get a quote for my landscape project?", 
    answer: "Browse contractors in your area, view their profiles and reviews, then contact them directly through their website or phone number listed on their profile to request a free estimate." 
  },
  { 
    question: "Are the contractors on Cost of Landscaping verified?", 
    answer: "We aggregate contractor information from public sources and customer reviews. We recommend verifying credentials, insurance, and references directly with any contractor before hiring." 
  },
  { 
    question: "What should I look for when hiring a landscaper?", 
    answer: "Look for contractors with positive reviews, proper licensing and insurance, clear communication, detailed written estimates, and examples of previous work similar to your project." 
  },
  {
    question: "How much does landscape work typically cost?",
    answer: "Costs vary widely by service. Weekly mowing on a quarter-acre runs $40–$70 per visit. Full-season lawn care programs run $1,800–$3,800. Paver patios $15–$30 per square foot installed. Sprinkler system installs $1,800–$4,200 per zone. Landscape design fees run $50–$200/hr or 10–20% of install. See our city pages for local pricing and our blog for full cost breakdowns."
  },
  { 
    question: "Do contractors offer free estimates?", 
    answer: "Most landscape pros offer free estimates for residential projects. Contact contractors directly to schedule an on-site assessment and receive a detailed quote for your specific project." 
  }
]
</script>
