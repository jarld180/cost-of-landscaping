<script setup lang="ts">
definePageMeta({ layout: 'default' })
</script>

<template>
  <ServiceHub
    service-name="Landscape Design"
    service-slug="landscape-design"
    hero-image="/images/landscape-design.webp"
    one-liner="Design-only fees run $50–$200/hr or 10–20% of install. Full design-build on a quarter-acre lands $30,000–$100,000+ in 2026."
    quick-answer="Three common pricing models for residential landscape design in 2026: hourly ($50–$200/hr, typical projects 20–80 hours), fixed design fee ($1,500–$8,000 for a master plan on a typical residential lot), or a percentage of install (10–20%). Full design-build for a quarter-acre yard typically lands between $30,000 and $100,000 depending on hardscape volume, plant material quality, and irrigation scope."
    intro="A landscape design budget covers two distinct things: the design fee (the drawings, plan view, planting plan, hardscape detail) and the install (labor + material). Many homeowners blur the two and end up surprised. The pricing below separates them cleanly."
    :cost-rows="[
      { label: 'Design fee — hourly', range: '$50 – $200 / hr', note: 'Most residential plans = 20–80 hours total' },
      { label: 'Design fee — fixed plan', range: '$1,500 – $8,000', note: 'Master plan + planting + hardscape detail' },
      { label: 'Design fee — % of install', range: '10% – 20%', note: 'Refunded against install if you go with the same builder' },
      { label: 'Front-yard refresh (install)', range: '$6,000 – $18,000', note: 'Replant beds, new mulch, regrade entryway' },
      { label: 'Full-yard install', range: '$30,000 – $100,000+', note: 'Quarter-acre, full hardscape + irrigation + plants' },
      { label: '3D renderings (add-on)', range: '$400 – $2,500', note: 'Walk-through 3D views from concept plan' }
    ]"
    :what-drives-cost="[
      'Designer credentials — APLD or licensed landscape architect commands 2–3x the rate of a design-build sales rep.',
      'Scope — plant-only plans are cheap; plans with grading, drainage, lighting, and irrigation are expensive.',
      'Revisions — most fixed fees include 2 revision rounds; more rounds bill hourly.',
      'Site visit count — remote-only design with one site visit is cheapest; full on-site collaboration is most expensive.',
      'Documentation depth — concept-only sketches < CAD planting plan < full construction documents.'
    ]"
    :hire-checklist="[
      'Decide design-first (separate firm, then bid install) vs. design-build (one company does both) before talking to anyone.',
      'Ask for 2–3 portfolio projects in your price range — not their flagship $250k showpiece.',
      'Confirm IP ownership: who owns the plan if you take it to a different installer to bid?',
      'Get the revision count in writing.',
      'Ask if the designer will help you bid the install — most will for an hourly fee.'
    ]"
    :related-articles="[
      { title: 'Landscape Design Cost in 2026', to: '/blog/landscape-design-cost-in-2026', excerpt: 'Hourly vs flat-fee vs percentage breakdown with examples.' },
      { title: 'Hardscape Cost Per Square Foot', to: '/blog/hardscape-cost-per-square-foot-2026', excerpt: 'Paver, stone, deck, and retaining wall pricing.' },
      { title: 'Lawn Care Cost in 2026', to: '/blog/how-much-does-lawn-care-cost-in-2026', excerpt: 'Recurring lawn budgets after the install is in.' }
    ]"
    :faqs="[
      { question: 'Do I need a designer or can the installer plan it?', answer: 'For projects under $15,000 a good design-build contractor can sketch and execute. For projects over $30,000 — especially with grading, drainage, irrigation, lighting, or significant hardscape — hire a designer (APLD designer or landscape architect) first. The plan pays for itself in better bids and fewer change orders.' },
      { question: 'What is the difference between a landscape designer and a landscape architect?', answer: 'Landscape architects are state-licensed (LARE exam, state board licensure) and required for projects involving regulated stormwater, public sites, or commercial scope. Landscape designers are not state-licensed but may be APLD-certified; they cover most residential work just fine.' },
      { question: 'Can I get a landscape design online?', answer: 'Yes — multiple firms offer remote design from photos + measurements, with prices $500–$2,500 for a typical residential plan. Quality varies widely. Best for plant-only refreshes; weak for projects with grading, drainage, or hardscape.' },
      { question: 'How long does the design process take?', answer: 'A typical residential master plan is 4–8 weeks from initial site visit to delivered plan. Add 2–4 weeks for revisions. Construction documents (used for bidding) add another 2–6 weeks.' },
      { question: 'Should the designer be on-site during install?', answer: 'For complex builds yes — most designers offer construction observation for an hourly fee or a 5–10% upcharge on the install. Catching errors during install is 10x cheaper than fixing them after.' }
    ]"
  />
</template>
