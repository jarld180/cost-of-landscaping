<script setup lang="ts">
definePageMeta({ layout: 'default' })
</script>

<template>
  <ServiceHub
    service-name="Mulch & Planting"
    service-slug="mulch-planting"
    hero-image="/images/mulch-planting.webp"
    one-liner="Mulch refresh runs $65–$110/yard installed in 2026. Sod $1.00–$2.20/sf installed. Shrub install $40–$120 each."
    quick-answer="Mulch refresh on residential beds runs $65–$110 per cubic yard installed (one yard covers ~100 sf at 3 inches deep). Sod installation costs $1.00–$2.20/sf installed including soil prep. Hydroseeding $0.10–$0.25/sf. Shrub installs $40–$120 each (1–5 gallon). Tree installs $200–$1,200 each (5 gallon to 30 gallon, including planting and warranty)."
    intro="Mulch + planting is the highest-frequency landscape spend most homeowners make — once or twice per year for mulch refresh, plus periodic plant additions or replacements. The numbers below are 2026 national medians for residential work."
    :cost-rows="[
      { label: 'Mulch refresh — installed', range: '$65 – $110 / yard', note: '1 yard ≈ 100 sf at 3" depth' },
      { label: 'Sod install', range: '$1.00 – $2.20 / sf', note: 'Includes soil prep + delivery + lay' },
      { label: 'Hydroseed', range: '$0.10 – $0.25 / sf', note: 'Cheaper but 2–4 wk to germinate' },
      { label: 'Shrub install (1–5 gal)', range: '$40 – $120 each', note: 'Plant + labor + amendment' },
      { label: 'Tree install (5–30 gal)', range: '$200 – $1,200 each', note: 'Larger trees $1,500–$5,000+' },
      { label: 'Perennial install', range: '$15 – $40 each', note: 'Quart to gallon size' },
      { label: 'Annual flower beds', range: '$3 – $9 / sf', note: 'Seasonal swap — labor heavy' },
      { label: 'Rock / decorative gravel', range: '$95 – $180 / yard', note: 'Installed; weed fabric optional' }
    ]"
    :what-drives-cost="[
      'Mulch type — basic hardwood is cheap, dyed mulch and premium pine bark cost more.',
      'Bed prep — fresh refresh is cheap; weeding + edging adds 30–60% to labor.',
      'Plant size — gallons matter. 1-gallon shrubs cost $9–$18 material; 5-gallon $25–$45; 7-gallon $40–$80. Labor scales with hole size.',
      'Sod vs. seed — sod is fast but expensive; seed is cheap but takes 6–10 weeks to be foot-traffic ready.',
      'Soil amendment — bagged compost on top is cheap; tilling in 3" of compost across the bed is expensive but lasts.'
    ]"
    :hire-checklist="[
      'Get mulch type spelled out — undyed hardwood vs. pine bark vs. dyed; quality varies wildly.',
      'Ask about depth (3 inches is the target — deeper rots crowns, shallower lets weeds through).',
      'Confirm plant warranty — 90 days is standard, 1-year warranty is good (and worth paying $5–$15/plant more for).',
      'For sod jobs, walk the site after delivery and before install — yellow or dry sod is junk you should refuse.',
      'Schedule mulch refresh in spring after the last frost — fall mulching does little for the next season.'
    ]"
    :related-articles="[
      { title: 'Lawn Care Cost in 2026', to: '/blog/how-much-does-lawn-care-cost-in-2026', excerpt: 'Mulch and planting plus your recurring lawn budget.' },
      { title: 'Landscape Design Cost in 2026', to: '/blog/landscape-design-cost-in-2026', excerpt: 'When a planting plan is worth the design fee.' },
      { title: 'Hardscape Cost Per Square Foot', to: '/blog/hardscape-cost-per-square-foot-2026', excerpt: 'Where hardscape replaces high-maintenance planting.' }
    ]"
    :faqs="[
      { question: 'How often do I need to refresh mulch?', answer: 'Annually for most residential beds — typically once in spring (April–May in most regions). Mulch breaks down, loses color, and protects less as it thins. Some pros recommend a half-rate top-up in fall in cold climates, but spring is the main event.' },
      { question: 'Is dyed mulch safe for kids and pets?', answer: 'Modern dyed mulches use iron oxide or carbon-based colorants — generally non-toxic when made from clean hardwood. Avoid mulch sourced from CCA-treated wood (older recycled mulch). Reputable pros use color-only hardwood from clean source streams. Ask.' },
      { question: 'Should I lay weed fabric under mulch?', answer: 'For perennial beds — usually no. Fabric breaks down, mulch falls through, and weeds end up rooting through the fabric into soil below making them harder to pull. For pure decorative rock beds — yes, fabric helps.' },
      { question: 'Sod vs. seed — which is better?', answer: 'Sod for speed, slope stability, instant curb appeal, and yards with kids/pets. Seed for cost (5–10x cheaper) and grass variety options. For most homeowners doing a full lawn install in May or September, seed wins long-term; for spot repair or fast resale, sod wins.' },
      { question: 'When is the best time to plant trees and shrubs?', answer: 'Fall (Sept–Nov) is best in most US climates — roots establish over winter without heat stress on top growth. Spring (March–May) is second best. Avoid summer planting in the South and avoid late-fall planting north of zone 6 (roots will not establish before freeze).' }
    ]"
  />
</template>
