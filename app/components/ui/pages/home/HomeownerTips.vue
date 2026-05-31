<script setup lang="ts">
// Homeowner Tips Section
const tips = [
  {
    icon: 'heroicons:sparkles',
    heading: 'Fall aeration + overseed is the highest-ROI lawn task',
    description: 'One $180–$320 fall aeration + overseed visit on a quarter-acre lawn replaces 2–3 years of incremental fertilizer + spot reseeding. Schedule mid-September through mid-October for best germination.'
  },
  {
    icon: 'heroicons:scale',
    heading: 'Get three written quotes — every time',
    description: 'Landscape pricing varies 30–50% between pros in the same city for the same scope. Three line-item-detailed quotes is the cheapest way to spot outliers and negotiate a fair price.'
  },
  {
    icon: 'heroicons:shield-check',
    heading: 'Verify both general liability AND workers\' comp',
    description: 'Landscape work is one of the more hazardous trades. If a crew member is injured on your property and the company lacks workers\' comp, you can be personally sued for medical costs.'
  },
  {
    icon: 'heroicons:banknotes',
    heading: 'Never pay more than 30% upfront',
    description: 'Industry standard residential landscape projects deposit 25–35% to lock the schedule, balance on completion. Pros asking for 50%+ upfront before any work — pass.'
  },
  {
    icon: 'heroicons:sun',
    heading: 'Winterize sprinklers before first freeze',
    description: 'In freeze-prone climates, skipping the $90–$200 fall blowout typically costs $300–$1,500 in spring valve + backflow repairs. Schedule mid-October to mid-November.'
  },
  {
    icon: 'heroicons:wrench-screwdriver',
    heading: 'Hardscape base prep beats every other quality signal',
    description: 'Paver patio failures are almost always base failures, not paver failures. Insist on 4–8" of compacted crushed stone + edge restraint in writing — this is the biggest predictor of a 25+ year install.'
  }
]
</script>

<template>
  <section class="py-16 md:py-20 lg:py-28">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <!-- Eyebrow and Heading Section -->
      <div class="mb-12 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
        <!-- Left Column: Eyebrow and Heading -->
        <div>
          <Eyebrow text="Homeowner Tips" variant="blue-blue" class="mb-4" />
          <h2 class="font-heading text-4xl font-bold text-neutral-900 dark:text-neutral-100 md:text-5xl">
            Comprehensive Guide to Year-Round Lawn Care
          </h2>
        </div>

        <!-- Right Column: Description -->
        <div class="flex items-center">
          <p class="text-lg text-neutral-600 dark:text-neutral-300">
            Six rules from our research desk that quietly separate a $4,000 mistake from a $4,000 outcome. None of these require special tools or a designer — just a few questions asked at the right time.
          </p>
        </div>
      </div>

      <!-- Tips Cards Grid -->
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card
          v-for="(tip, index) in tips"
          :key="index"
          variant="secondary-light-outline"
          border-width="thin"
          :icon="tip.icon"
          :heading="tip.heading"
        >
          {{ tip.description }}
        </Card>
      </div>
    </div>
  </section>
</template>

<style scoped>
</style>

