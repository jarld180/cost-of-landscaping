<script setup lang="ts">
definePageMeta({ layout: 'default' })
</script>

<template>
  <ServiceHub
    service-name="Tree Service"
    service-slug="tree-service"
    hero-image="/images/tree-service.webp"
    one-liner="Tree removal runs $400–$3,500+ in 2026 depending on tree size, location, and access. Trimming $250–$1,500."
    quick-answer="Most residential tree removals price by trunk diameter and crew time: small trees under 30 ft cost $250–$650, medium trees 30–60 ft cost $700–$1,800, large trees 60–80 ft cost $1,500–$3,000, and large hazardous trees over 80 ft cost $2,500–$6,500+. Stump grinding is usually $100–$400 separately. Trimming runs $250–$1,500 depending on canopy size and crew time."
    intro="Tree service pricing depends on three things: tree size, crew time, and risk — specifically how close the tree sits to houses, fences, pools, and power lines. The same 50-foot oak removed from a wide-open backyard might cost $700; remove the same tree over a roof and pool, and it can hit $3,500."
    :cost-rows="[
      { label: 'Tree removal — small (<30 ft)', range: '$250 – $650', note: 'Trunk diameter under 12"' },
      { label: 'Tree removal — medium (30–60 ft)', range: '$700 – $1,800', note: 'Trunk 12–24"' },
      { label: 'Tree removal — large (60–80 ft)', range: '$1,500 – $3,000', note: 'Trunk 24–36"' },
      { label: 'Tree removal — XL (80+ ft)', range: '$2,500 – $6,500+', note: 'Often requires crane rental' },
      { label: 'Trimming / pruning', range: '$250 – $1,500', note: 'Canopy size + crew time' },
      { label: 'Stump grinding', range: '$100 – $400', note: 'Usually billed per inch of diameter' },
      { label: 'Emergency / storm response', range: '$500 – $4,000+', note: 'After-hours premium 25–60%' },
      { label: 'Cabling + bracing (large trees)', range: '$250 – $1,000', note: 'Preserve at-risk specimen trees' }
    ]"
    :what-drives-cost="[
      'Size — both height and trunk diameter matter; diameter often more.',
      'Location risk — over houses, pools, power lines, and fences adds 30–100%.',
      'Access — backyard trees with no equipment access cost 30–80% more than driveway-accessible trees.',
      'Wood disposal — haul-away vs leave-on-site vs chip-on-site each price differently.',
      'Crane requirement — XL trees in tight quarters often need a crane ($800–$2,500 day rate added).'
    ]"
    :hire-checklist="[
      'Verify ISA-certified arborist on staff — not just a chainsaw operator with a truck.',
      'Insist on certificate of insurance: general liability AND workers comp, both naming you for the work. Tree work injures more crews per hour than almost any landscape trade.',
      'Get the scope in writing: which trees, what gets done (remove vs. trim vs. crown reduction), wood disposal, stump or not.',
      'Avoid storm-chasers — door-knockers after a storm rarely carry proper insurance. Use local pros with verifiable history.',
      'Get 2–3 quotes for any tree over $1,000 — spreads can be 2–3x.'
    ]"
    :related-articles="[
      { title: 'Tree Removal Cost in 2026', to: '/blog/tree-removal-cost-2026', excerpt: 'Size, location, and risk pricing breakdown.' },
      { title: 'Lawn Care Cost in 2026', to: '/blog/how-much-does-lawn-care-cost-in-2026', excerpt: 'How tree canopy affects lawn pricing.' },
      { title: 'Landscape Design Cost in 2026', to: '/blog/landscape-design-cost-in-2026', excerpt: 'Replacing a lost specimen tree the smart way.' }
    ]"
    :faqs="[
      { question: 'Do I need a permit to remove a tree on my property?', answer: 'Depends on your city. Many municipalities regulate removal of trees over a certain diameter (often 6–12 inches) or any heritage / canopy tree. HOAs frequently add their own rules. Check with your city forestry / planning office before signing.' },
      { question: 'Should I tip the tree crew?', answer: 'For routine removals, no — pricing is already at a premium. For storm response, exceptional difficulty, or extra cleanup, $20–$50 per crew member is appreciated.' },
      { question: 'Is stump grinding included with removal?', answer: 'Almost always priced separately. Default removal quote covers cutting the tree to a low stump and hauling wood. Stump grinding is its own line — $100–$400 typical, sometimes more for very large stumps or stumps in tight spots.' },
      { question: 'Why are tree removal quotes so different?', answer: 'Three reasons: (1) some pros include hauling + stump and others do not, (2) insurance overhead varies dramatically and shows up in pricing, (3) crane vs. no-crane changes the work fundamentally. Read the line items, not the total.' },
      { question: 'When is the best time to trim trees?', answer: 'Most deciduous trees — late winter / early spring before leaf-out. Avoid pruning oaks April–July in oak-wilt regions. Avoid pruning maples and birches in late winter (sap bleeding). Storm-damaged or hazardous limbs — remove immediately regardless of season.' }
    ]"
  />
</template>
