<script setup lang="ts">
import { getStateBySlug } from '~/utils/usStates'

definePageMeta({ layout: 'default' })

const route = useRoute()
const stateSlug = computed(() => route.params.state as string)
const citySlug = computed(() => route.params.city as string)
const stateData = computed(() => getStateBySlug(stateSlug.value))

const supabase = useSupabaseClient()

function buildImageUrl(storagePath: string | undefined): string | undefined {
  if (!storagePath) return undefined
  const { data } = supabase.storage.from('contractors').getPublicUrl(storagePath)
  return data.publicUrl
}

// Fetch city info
const { data: city, error: cityError } = await useFetch(() => `/api/public/cities/${citySlug.value}?state=${stateData.value?.abbreviation || ''}`)

if (cityError.value || !city.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'City Not Found',
    message: `The city "${citySlug.value}" was not found.`
  })
}

// Fetch contractors ranked by verification tier, then distance so the
// local trusted_partner (e.g. Local Landscapers of Charlotte on the Charlotte
// page) always appears #1 among tied entries.
const { data: contractorsData } = await useFetch('/api/public/contractors', {
  query: computed(() => ({
    citySlug: citySlug.value,
    stateCode: stateData.value?.abbreviation,
    limit: 20,
    offset: 0,
    orderBy: 'distance',
    orderDirection: 'asc'
  }))
})

// Fetch AI-generated city content (if available — gracefully ignored if missing)
const { data: listicleContent } = await useFetch<{
  success: boolean
  data: { intro_html: string | null; closing_html: string | null; faqs: Array<{ question: string; answer: string }> } | null
}>(() => `/api/public/city-listicle/${citySlug.value}?state=${stateData.value?.abbreviation || ''}`, {
  default: () => ({ success: true, data: null })
})

// Static FAQ fallback when no AI content available
const defaultFaqs = computed(() => {
  const city_name = city.value?.name || 'this city'
  const state_code = city.value?.stateCode || stateData.value?.abbreviation || ''
  return [
    {
      question: `How much does landscaping cost in ${city_name}?`,
      answer: `Landscape pricing in ${city_name}, ${state_code} in 2026 typically runs $40–$70 per mow on a quarter-acre lawn, $480–$840 for a 6-step fertilization program, $15–$30/sf for paver hardscape, and $3,000–$8,000 for a full sprinkler install on a quarter-acre lot. Full design-build refreshes land $9,000–$32,000. Always get 3 quotes.`
    },
    {
      question: `Are the landscape pros on this page licensed and insured in ${state_code}?`,
      answer: `Pros with a "Fully Verified" or "Cost of Landscaping Certified Partner" badge have submitted a Certificate of Insurance naming Cost of Landscaping as Additional Insured and passed our review. Always confirm licensing with ${state_code}'s contractor licensing board — landscape architect, irrigation, and pesticide-application licenses are state-specific.`
    },
    {
      question: `How do I choose the best landscaper in ${city_name}?`,
      answer: `Look for verified reviews, confirmed general liability + workers' comp insurance, and a portfolio of completed local projects within 30 minutes of your address. Ask for a written estimate, check Google + BBB ratings, verify license + ISA arborist credential (for tree work), and never pay more than 30% upfront.`
    },
    {
      question: `What landscape services are most commonly needed in ${city_name}?`,
      answer: `The most-quoted residential landscape services in ${city_name} are weekly mowing + seasonal fertilization, full-yard mulch refreshes, paver patios + walkways, sprinkler install or repair, and tree trimming or removal. Annual cleanup + leaf removal also peaks in October–November.`
    },
    {
      question: `How long does a typical landscaping project take in ${city_name}?`,
      answer: `Weekly maintenance is ongoing. Mulch + planting refreshes: 1–3 days. Paver patio install: 3–7 days. Full sprinkler system install: 1–3 days. Design-build refresh: 8–18 weeks total from first design meeting to final install. Weather in ${state_code} can shift install windows by 1–2 weeks.`
    }
  ]
})

const faqs = computed(() => {
  const content = listicleContent?.value?.data
  if (content?.faqs && content.faqs.length > 0) return content.faqs
  return defaultFaqs.value
})

const contractors = computed(() => contractorsData.value?.contractors || [])
const totalContractors = computed(() => contractorsData.value?.total || 0)

// Trusted partner: only PIN if the trusted_partner belongs to THIS city.
// Out-of-city trusted_partners (radius spillover) drop into the normal list.
// Within the home-city, prefer the "Local Landscapers of ..." anchor brand if present.
const trustedPartner = computed(() => {
  const homeCity = contractors.value.filter(c => c.verificationTier === 'trusted_partner' && c.citySlug === citySlug.value)
  return homeCity.find(c => c.slug?.startsWith('local-landscapers-of-')) || homeCity[0]
})
const otherContractors = computed(() => contractors.value.filter(c => c.id !== trustedPartner.value?.id))

// SEO
if (city.value) {
  useCityListicleSeo({
    cityName: city.value.name,
    citySlug: city.value.slug,
    stateCode: city.value.stateCode,
    stateSlug: stateSlug.value,
    totalContractors: totalContractors.value,
    contractors: contractors.value.map(c => ({
      id: c.id,
      companyName: c.companyName,
      slug: c.slug,
      citySlug: c.citySlug,
      stateSlug: stateSlug.value,
      rating: c.rating,
      reviewCount: c.reviewCount,
      phone: c.phone,
      verificationTier: c.verificationTier
    })),
    faqs: faqs.value
  })
}

const year = new Date().getFullYear()

// Static internal links to key landscaping guides
const landscapingGuides = [
  { title: 'How Much Does Landscaping Cost?', href: '/how-much-does-landscaping-cost' },
  { title: 'Lawn Care Cost Guide', href: '/lawn-care' },
  { title: 'Landscape Design Cost Guide', href: '/landscape-design' },
  { title: 'Hardscaping Cost Guide', href: '/hardscaping' },
  { title: 'Irrigation Install Cost', href: '/irrigation' },
  { title: 'Tree Service Cost Guide', href: '/tree-service' },
]
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-neutral-900">
    <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

      <!-- Breadcrumbs -->
      <nav class="mb-6 flex flex-wrap items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
        <NuxtLink to="/" class="hover:text-blue-600 dark:hover:text-blue-400">Home</NuxtLink>
        <Icon name="heroicons:chevron-right" class="h-4 w-4" />
        <NuxtLink :to="`/${stateSlug}`" class="hover:text-blue-600 dark:hover:text-blue-400">
          {{ stateData?.name }}
        </NuxtLink>
        <Icon name="heroicons:chevron-right" class="h-4 w-4" />
        <NuxtLink :to="`/${stateSlug}/${citySlug}/landscapers`" class="hover:text-blue-600 dark:hover:text-blue-400">
          {{ city?.name }} Contractors
        </NuxtLink>
        <Icon name="heroicons:chevron-right" class="h-4 w-4" />
        <span class="font-medium text-neutral-900 dark:text-neutral-100">Best in {{ city?.name }}</span>
      </nav>

      <!-- Page Header -->
      <header class="mb-8">
        <h1 class="font-heading text-3xl font-bold text-neutral-900 dark:text-white md:text-4xl">
          Best Landscapers in {{ city?.name }}, {{ city?.stateCode }} ({{ year }})
        </h1>
        <p class="mt-3 text-lg text-neutral-600 dark:text-neutral-400">
          {{ totalContractors > 0 ? `${totalContractors} verified` : 'Verified' }} landscapers ranked by customer reviews, ratings, and extensive contractor history research.
          Contractors with the <span class="font-semibold text-emerald-600">Insurance Verified</span> badge have confirmed insurance documentation on file.
        </p>
      </header>

      <!-- AI-generated intro (if available) -->
      <div
        v-if="listicleContent?.data?.intro_html"
        class="mb-8 prose prose-neutral dark:prose-invert max-w-none rounded-xl border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-700 dark:bg-neutral-800/50"
        v-html="listicleContent.data.intro_html"
      />

      <!-- Verification Legend -->
      <div class="mb-6 flex flex-wrap items-center gap-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800">
        <span class="text-sm font-medium text-neutral-700 dark:text-neutral-300">How we rank contractors:</span>
        <div class="flex flex-wrap items-center gap-3 text-xs">
          <span class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-800">
            <Icon name="heroicons:star-solid" class="h-3 w-3" /> Insured & Top Rated
          </span>
          <span class="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-800">
            <Icon name="heroicons:shield-check" class="h-3 w-3" /> Insurance Verified
          </span>
          <span class="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 font-semibold text-blue-800">
            <Icon name="heroicons:check-badge" class="h-3 w-3" /> Background Checked
          </span>
          <span class="text-neutral-500">Ranked by reviews, ratings &amp; research</span>
        </div>
      </div>

      <!-- Contractor List -->
      <div v-if="contractors.length > 0" class="space-y-4 mb-10">
        <!-- Trusted partner first (special callout) -->
        <div v-if="trustedPartner" class="mb-6">
          <div class="mb-2 flex items-center gap-2">
            <span class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
              <Icon name="heroicons:star-solid" class="h-3 w-3" /> #1 Recommended
            </span>
          </div>
          <ContractorCard
            :company-name="trustedPartner.companyName"
            :location="`${trustedPartner.cityName}, ${trustedPartner.stateCode}`"
            :rating="trustedPartner.rating || 0"
            :review-count="trustedPartner.reviewCount || 0"
            :contractor-id="trustedPartner.id"
            :contractor-slug="trustedPartner.slug"
            :city-slug="trustedPartner.citySlug"
            :state-code="stateSlug"
            :verification-tier="trustedPartner.verificationTier"
            :image="buildImageUrl(trustedPartner.metadata?.primary_image || trustedPartner.metadata?.images?.[0])"
          >
            {{ trustedPartner.description || trustedPartner.metadata?.categories?.join(', ') || '' }}
          </ContractorCard>
        </div>

        <!-- Numbered ranked list -->
        <div
          v-for="(contractor, index) in otherContractors"
          :key="contractor.id"
          class="flex items-start gap-3"
        >
          <div class="mt-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
            {{ trustedPartner ? index + 2 : index + 1 }}
          </div>
          <div class="flex-1">
            <ContractorCard
              :company-name="contractor.companyName"
              :location="`${contractor.cityName}, ${contractor.stateCode}`"
              :rating="contractor.rating || 0"
              :review-count="contractor.reviewCount || 0"
              :contractor-id="contractor.id"
              :contractor-slug="contractor.slug"
              :city-slug="contractor.citySlug"
              :state-code="stateSlug"
              :verification-tier="contractor.verificationTier"
              :image="buildImageUrl(contractor.metadata?.primary_image || contractor.metadata?.images?.[0])"
            >
              {{ contractor.description || contractor.metadata?.categories?.join(', ') || '' }}
            </ContractorCard>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="mb-10 py-12 text-center">
        <Icon name="heroicons:building-office-2" class="mx-auto h-12 w-12 text-neutral-400" />
        <h2 class="mt-4 text-xl font-semibold text-neutral-900 dark:text-white">No Contractors Listed Yet</h2>
        <p class="mt-2 text-neutral-600 dark:text-neutral-400">
          We're building our {{ city?.name }} directory. Check back soon.
        </p>
        <NuxtLink
          :to="`/${stateSlug}/${citySlug}/landscapers`"
          class="mt-4 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          Browse all {{ city?.name }} contractors
          <Icon name="heroicons:arrow-right" class="h-4 w-4" />
        </NuxtLink>
      </div>

      <!-- AI-generated closing (if available) -->
      <div
        v-if="listicleContent?.data?.closing_html"
        class="mb-10 prose prose-neutral dark:prose-invert max-w-none rounded-xl border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-700 dark:bg-neutral-800/50"
        v-html="listicleContent.data.closing_html"
      />

      <!-- FAQ Section -->
      <section class="mb-10">
        <h2 class="mb-6 font-heading text-2xl font-bold text-neutral-900 dark:text-white">
          Frequently Asked Questions — Landscapers in {{ city?.name }}
        </h2>
        <div class="space-y-4">
          <details
            v-for="(faq, i) in faqs"
            :key="i"
            class="group rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800"
          >
            <summary class="flex cursor-pointer items-center justify-between gap-4 px-6 py-4 font-medium text-neutral-900 dark:text-white">
              {{ faq.question }}
              <Icon name="heroicons:chevron-down" class="h-5 w-5 shrink-0 text-neutral-400 transition-transform group-open:rotate-180" />
            </summary>
            <div class="px-6 pb-5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              {{ faq.answer }}
            </div>
          </details>
        </div>
      </section>

      <!-- Cross-link to main city page -->
      <div class="rounded-xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-900/10">
        <h3 class="font-semibold text-blue-900 dark:text-blue-100">Looking for more options?</h3>
        <p class="mt-1 text-sm text-blue-700 dark:text-blue-300">
          Browse the full directory of {{ totalContractors }} landscapers in {{ city?.name }}, including filter by service type and radius.
        </p>
        <NuxtLink
          :to="`/${stateSlug}/${citySlug}/landscapers`"
          class="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-100"
        >
          View all {{ city?.name }} landscapers
          <Icon name="heroicons:arrow-right" class="h-4 w-4" />
        </NuxtLink>
      </div>

      <!-- Internal links to landscaping guides -->
      <div class="mt-8 border-t border-neutral-200 pt-8 dark:border-neutral-700">
        <h3 class="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">Landscaping Cost Guides</h3>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <NuxtLink
            v-for="guide in landscapingGuides"
            :key="guide.href"
            :to="guide.href"
            class="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-medium text-neutral-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-blue-700 dark:hover:text-blue-400"
          >
            {{ guide.title }}
          </NuxtLink>
        </div>
      </div>

    </div>
  </div>
</template>
