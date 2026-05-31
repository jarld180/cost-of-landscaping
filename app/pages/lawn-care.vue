<script setup lang="ts">
definePageMeta({ layout: 'default' })
</script>

<template>
  <ServiceHub
    service-name="Lawn Care"
    service-slug="lawn-care"
    hero-image="/images/lawn-care.webp"
    one-liner="A quarter-acre lawn averages $40–$70 per mow and $1,800–$3,800 for a full annual care program in 2026."
    quick-answer="A typical quarter-acre lawn runs $40–$70 per weekly mow, $480–$840 per fertilization season (5–7 step program), $180–$320 for fall aeration + overseed, and $1,800–$3,800 for full-year coverage including spring/fall cleanup. Per-square-foot pricing scales the obvious way — quote $0.018–$0.034/sf for full-service annual care."
    intro="Lawn care is the most-quoted residential landscape service in the US — and the one most often mispriced when homeowners try to compare line-by-line. The numbers below are 2026 national medians built from our 36,000+ verified pro directory, cross-referenced against published rate sheets and county-level cost-of-living adjustments."
    :cost-rows="[
      { label: 'Weekly mowing (quarter-acre)', range: '$40 – $70 / visit', note: 'Lower in TX/FL competition zones, higher in Northeast / coastal CA' },
      { label: 'Fertilization program (5–7 step)', range: '$480 – $840 / season', note: 'Quarter-acre lawn, includes pre-emergent + grub control' },
      { label: 'Fall aeration + overseed', range: '$180 – $320 / visit', note: 'Highest ROI lawn task — mid-Sept through mid-Oct' },
      { label: 'Full annual care', range: '$1,800 – $3,800 / yr', note: 'Mow + fert + aeration + spring/fall cleanup' },
      { label: 'Grub / pest treatment', range: '$120 – $260 / app', note: 'Curative grub apps in July–August' },
      { label: 'Lawn renovation (kill + reseed)', range: '$0.45 – $0.90 / sf', note: 'Includes herbicide, slit-seed, starter fert, straw blanket' }
    ]"
    :what-drives-cost="[
      'Lot size — most pros price by square footage above ~7,500 sf.',
      'Frequency — weekly accounts get 15–25% lower per-visit rates than bi-weekly.',
      'Slope + obstacles — heavy landscaping, tight gates, and steep slopes push rates 20–40% higher.',
      'Bagging vs. mulching — bag-and-haul adds $10–$25 per visit on average lots.',
      'Bundling — full-year contracts cut per-visit cost; à-la-carte fertilization always costs more.'
    ]"
    :hire-checklist="[
      'Get three written quotes — not phone estimates. Pricing varies 30–50% between pros in the same zip.',
      'Ask exactly what each program includes: how many fert steps, pre-emergent timing, grub control yes/no.',
      'Verify general liability AND workers comp — lawn equipment injuries are common.',
      'Read the cancel/skip policy: weekly contracts that auto-bill year-round are common traps.',
      'Confirm equipment scale matches your lot — 21" walk mowers on a half-acre will burn 2x the time.'
    ]"
    :related-articles="[
      { title: 'How Much Does Lawn Care Cost in 2026?', to: '/blog/how-much-does-lawn-care-cost-in-2026', excerpt: 'Full regional breakdown with per-acre and per-zip pricing.' },
      { title: 'Landscape Design Cost in 2026', to: '/blog/landscape-design-cost-in-2026', excerpt: 'When mowing alone is not enough — design budgets explained.' },
      { title: 'Sprinkler System Cost in 2026', to: '/blog/sprinkler-system-cost-2026', excerpt: 'Adding irrigation cuts lawn care time and lawn loss.' }
    ]"
    :faqs="[
      { question: 'How often should I have my lawn mowed?', answer: 'Most cool-season grasses (fescue, KBG, rye) want weekly mowing during peak growth (April–June, September–October) and bi-weekly in slow months. Warm-season grasses (Bermuda, Zoysia, St. Augustine) want weekly from May through September. Skipping weeks compounds — long grass needs to be cut in two passes which costs more.' },
      { question: 'What is the difference between lawn care and landscaping?', answer: 'Lawn care is the recurring maintenance work — mowing, fertilization, weed control, aeration. Landscaping is the design + install work — planting beds, hardscape, sod, trees. Most pros do both but most companies specialize.' },
      { question: 'Should I tip the lawn crew?', answer: 'Not expected for recurring service. End-of-season $20–$50 cash tip is appreciated and common but not required. For one-off cleanup or storm response, tip 10–15%.' },
      { question: 'Does the lawn care company need to be licensed?', answer: 'Most states require pesticide applicator licensing for any company applying weed control or fertilizer with pesticide. Plain mowing typically does not require a state license but does require business license + insurance. Ask to see both before signing.' },
      { question: 'Why are quotes so different for the same lawn?', answer: 'Pros price three ways: per-visit flat (most common), per-square-foot ($0.018–$0.034/sf/yr is the band), and per-hour ($45–$95/hr crew rate). Same lot can produce 30–50% spreads. Take the middle quote with the clearest scope, not the cheapest.' }
    ]"
  />
</template>
