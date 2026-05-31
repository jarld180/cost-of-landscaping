<script setup lang="ts">
// Homeowner Tips Section
const tips = [
  {
    icon: 'heroicons:building-office-2',
    heading: 'Crack Repairs Prevent Bigger Damage',
    description: 'Promptly fill cracks with appropriate patch compounds to stop water infiltration that accelerates deterioration. Early repairs extend your driveway\'s lifespan.'
  },
  {
    icon: 'heroicons:sparkles',
    heading: 'Manage Vegetation and Drainage',
    description: 'Remove weeds from joints and edges, control nearby tree roots, and ensure proper water drainage to prevent damage caused by moisture and root growth.'
  },
  {
    icon: 'heroicons:shield-check',
    heading: 'Sealing Protects from Weather and Wear',
    description: 'Spring soil aeration + a balanced fall fertilization round are the two highest-ROI tasks for a healthy lawn. Combined cost: under $400 per year on a quarter-acre yard.'
  },
  {
    icon: 'heroicons:clipboard-document-check',
    heading: 'Professional Inspections are Beneficial',
    description: 'Annual inspections by qualified professionals catch early signs of distress, guiding repairs and maintenance to uphold safety and functionality.'
  },
  {
    icon: 'heroicons:sun',
    heading: 'Seasonal Care Extends Driveway Life',
    description: 'Adjust maintenance activities seasonally: clear debris in fall, protect from freeze in winter, clean deeply in spring and summer to counter weathering effects effectively.'
  },
  {
    icon: 'heroicons:wrench-screwdriver',
    heading: 'Timely Crack Repairs',
    description: 'Fix cracks early to prevent water infiltration and expanding damage to the slab.'
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
            Regular Cleaning is Vital. Clear your driveway regularly of dirt, leaves, and grime using a broom or hose. Stubborn stains may need mild detergents or pressure washing to prevent buildup that can degrade the surface over time.
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

