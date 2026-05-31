<script setup lang="ts">
definePageMeta({ layout: 'default' })
</script>

<template>
  <ServiceHub
    service-name="Hardscaping"
    service-slug="hardscaping"
    hero-image="/images/hardscaping.webp"
    one-liner="Pavers $15–$30/sf, natural stone $35–$70/sf, retaining walls $25–$60 per face foot installed in 2026."
    quick-answer="Most residential hardscape pricing lives between $15 and $30 per square foot installed for concrete pavers and between $35 and $70 per square foot for natural stone. Retaining walls run $25–$60 per face foot. Wood decks $30–$55/sf. The base prep — 4–8 inches of compacted crushed stone with edge restraint — is the single biggest predictor of how long the install lasts."
    intro="Hardscape includes everything non-living in a residential landscape: paver patios, natural-stone walkways, retaining walls, fire pits, outdoor kitchens, pergolas, and outdoor lighting infrastructure. The per-square-foot ranges below are 2026 national medians, installed (material + labor + base prep)."
    :cost-rows="[
      { label: 'Concrete pavers', range: '$15 – $30 / sf', note: 'Installed with proper base prep' },
      { label: 'Travertine / limestone', range: '$25 – $50 / sf', note: 'Mid-tier natural stone' },
      { label: 'Bluestone / flagstone', range: '$35 – $70 / sf', note: 'Premium natural stone' },
      { label: 'Stamped concrete', range: '$14 – $26 / sf', note: 'Decorative — cracks more visible long-term' },
      { label: 'Wood deck (PT or cedar)', range: '$30 – $55 / sf', note: 'Composite (Trex etc) $45–$75/sf' },
      { label: 'Retaining wall (block)', range: '$25 – $60 / face ft', note: 'Includes drainage + footing' },
      { label: 'Fire pit (built-in)', range: '$2,500 – $8,500', note: 'Standalone steel ring $200–$700' },
      { label: 'Outdoor kitchen', range: '$8,000 – $35,000+', note: 'Grill + counter + cabinetry' }
    ]"
    :what-drives-cost="[
      'Base prep — 4–8" of compacted crushed stone + edge restraint is the single biggest quality signal. Skip it and walks fail in 2–5 years.',
      'Material — concrete pavers are cheapest, natural stone is 2–3x. Color, shape, and thickness within each material also swing pricing 30–50%.',
      'Pattern — herringbone and curved layouts have 15–25% higher labor than running bond / rectangular.',
      'Site access — wheelbarrow-only delivery (no Bobcat access) adds 20–40% labor.',
      'Grading — sloped sites or sites that need regrading for drainage cost notably more.'
    ]"
    :hire-checklist="[
      'Get base prep spelled out in writing: depth of stone, compaction passes, edge restraint type.',
      'Verify ICPI certification for paver work — it is the industry standard.',
      'Ask to see a 5+ year-old install — pavers settle, stone discolors, and bad base shows up by year 3.',
      'Walk the drainage plan with the contractor before signing. Where does water go in a heavy rain?',
      'Confirm warranty in writing — 1 year on workmanship is standard, 2–5 years is good, 10+ is rare and worth paying for.'
    ]"
    :related-articles="[
      { title: 'Hardscape Cost Per Square Foot in 2026', to: '/blog/hardscape-cost-per-square-foot-2026', excerpt: 'Material-by-material breakdown with regional adjustments.' },
      { title: 'Landscape Design Cost in 2026', to: '/blog/landscape-design-cost-in-2026', excerpt: 'When to hire a designer before the hardscape contractor.' },
      { title: 'Sprinkler System Cost in 2026', to: '/blog/sprinkler-system-cost-2026', excerpt: 'Plan irrigation before the hardscape goes in — not after.' }
    ]"
    :faqs="[
      { question: 'How long does a paver patio last?', answer: 'A properly installed paver patio (4–8" compacted base + edge restraint + polymeric sand) lasts 25+ years with minimal maintenance. A patio installed on dirt or thin base typically fails (settling, weed intrusion, edge spread) in 3–7 years.' },
      { question: 'Pavers vs. stamped concrete — which is better?', answer: 'Pavers cost more upfront ($15–$30/sf vs $14–$26/sf) but are repairable: lift and replace individual pavers if one cracks or stains. Stamped concrete is one monolithic slab — when it cracks (and most do within 5–10 years), the repair always shows. For most homeowners, pavers win on lifetime cost.' },
      { question: 'Do I need a building permit for a patio?', answer: 'Patios at-grade typically do not require a permit. Decks above 30" off the ground almost always do. Retaining walls over 4 feet usually require engineering and a permit. Fire pits and outdoor kitchens with gas lines require permits. Confirm with your municipality before signing.' },
      { question: 'How do I keep weeds out of paver joints?', answer: 'Use polymeric sand for joint fill (not regular sand) and re-apply every 4–6 years. Keep joints fully packed. Stop spot-applying glyphosate; it kills surface weeds but seeds will keep arriving — solve the joint integrity instead.' },
      { question: 'What is the cheapest hardscape that still looks good?', answer: 'Pea gravel or decomposed granite with a steel edge — $4–$9/sf installed. Used in modern landscape design more often than you would think. Drains beautifully, low maintenance, replaceable.' }
    ]"
  />
</template>
