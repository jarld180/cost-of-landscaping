<script setup lang="ts">
definePageMeta({ layout: 'default' })
</script>

<template>
  <ServiceHub
    service-name="Irrigation"
    service-slug="irrigation"
    hero-image="/images/irrigation.webp"
    one-liner="Sprinkler installs run $1,800–$4,200 per zone in 2026. A quarter-acre needs 4–7 zones — $3,000–$8,000 total."
    quick-answer="Residential sprinkler system installs in 2026 typically cost $1,800–$4,200 per zone, with a typical quarter-acre yard needing 4–7 zones — total $3,000–$8,000 fully installed. Smart Wi-Fi controllers add $250–$650. Drip systems for beds add roughly $1,200–$3,000 to a sprinkler install. Annual blowout in freeze climates: $90–$200."
    intro="Irrigation pricing has two layers — the install (one-time) and the seasonal upkeep (recurring). The numbers below are 2026 national medians for a typical residential lot with city water access. Well-fed systems and large lots scale up; small lawns + one or two beds scale down."
    :cost-rows="[
      { label: 'Sprinkler install — per zone', range: '$1,800 – $4,200', note: 'Zone = 8–12 heads on one valve' },
      { label: 'Typical quarter-acre system', range: '$3,000 – $8,000', note: '4–7 zones complete' },
      { label: 'Drip system for beds (add-on)', range: '$1,200 – $3,000', note: 'Trenching + emitters + filter + pressure regulator' },
      { label: 'Smart Wi-Fi controller', range: '$250 – $650', note: 'Rachio / Hunter Hydrawise / Rain Bird LNK' },
      { label: 'Annual blowout (freeze climates)', range: '$90 – $200', note: 'Mid-Oct through Nov; skipping costs $300–$1,500 in spring' },
      { label: 'Backflow preventer install', range: '$300 – $800', note: 'Required by most municipalities' },
      { label: 'Sprinkler repair (per visit)', range: '$95 – $250', note: 'Head replacement, valve diagnosis, leak repair' },
      { label: 'Mainline leak repair', range: '$250 – $1,200', note: 'Excavation depth + repair difficulty' }
    ]"
    :what-drives-cost="[
      'Lot size + zone count — more zones means more valves, more pipe, more heads.',
      'Mainline access — copper vs PVC, depth, freeze line in your region.',
      'Water source — city water (cheap), well (mid), pond/lake (most expensive, needs filtration).',
      'Controller — basic 6-station controller is $80 retail; smart Wi-Fi controllers run $250–$650 installed.',
      'Permit + backflow — required in most jurisdictions; budget $200–$600 for the permit + inspection.'
    ]"
    :hire-checklist="[
      'Get the design before you sign — head count, zone map, pipe diagram. No design = guess install.',
      'Verify state irrigation contractor license — most states require one (separate from landscape license).',
      'Ask about freeze depth and pipe burial depth in your climate.',
      'Confirm head-to-head coverage in the design — gaps mean dead spots that the system cannot fix later.',
      'Get the manufacturer warranties separately — heads (5 yr), controllers (3 yr), valves (3–5 yr) are all manufacturer-warrantied.'
    ]"
    :related-articles="[
      { title: 'Sprinkler System Cost in 2026', to: '/blog/sprinkler-system-cost-2026', excerpt: 'Install costs by zone count, region, and water source.' },
      { title: 'Lawn Care Cost in 2026', to: '/blog/how-much-does-lawn-care-cost-in-2026', excerpt: 'Why irrigation cuts your lawn-care bill.' },
      { title: 'Landscape Design Cost in 2026', to: '/blog/landscape-design-cost-in-2026', excerpt: 'Design irrigation into the master plan, not after.' }
    ]"
    :faqs="[
      { question: 'Is a sprinkler system worth it?', answer: 'For lots over ~5,000 sf of lawn in dry or freeze-thaw climates, yes — 8–12 year payback on water savings + lawn replacement avoidance. For tiny lots or rainy climates (PNW, parts of Northeast), the ROI is weaker.' },
      { question: 'Should I install a smart controller?', answer: 'Yes if you have 4+ zones or live in a watering-restricted area. Smart controllers (Rachio, Hunter Hydrawise) cut water use 20–40% via weather-based scheduling. Payback is usually 1–2 seasons in cost-of-water terms.' },
      { question: 'How long do sprinkler heads last?', answer: 'Rotors and sprays last 8–15 years with normal use. Pop-ups in mowed lawn areas get clipped by mowers and typically need 1–3 replacements per system per year ($95–$150 visit cost). Drip emitters can last 5–10 years if water is filtered.' },
      { question: 'When do I need a backflow preventer?', answer: 'Every irrigation system tied to potable water needs backflow prevention by code in nearly every US municipality. Type (PVB, RPZ, DCV) depends on city; most residential is PVB or DCV. Required to be tested annually in many cities; $75–$150 test fee.' },
      { question: 'Can I DIY a sprinkler system?', answer: 'For a single zone covering a small front yard — yes, with $400–$800 in materials. For a full system with multiple zones, mainline burial, and controller — most homeowners regret it. The hard part is not the install, it is the design and head selection that delivers head-to-head coverage.' }
    ]"
  />
</template>
