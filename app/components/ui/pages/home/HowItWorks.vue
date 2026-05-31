<script setup lang="ts">
// How It Works component for the homepage
// Features 2-column layout with content and 3-step process cards
</script>

<template>
  <section class="bg-neutral-50 py-16 dark:bg-neutral-900 md:py-28 lg:py-32">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <!-- 2-Column Grid: Content (left) + Steps (right) -->
      <div class="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
        <!-- Left Column: Content -->
        <div class="flex flex-col justify-center">
          <!-- Eyebrow -->
          <div class="mb-4">
            <Eyebrow
              text="How It Works"
              variant="blue-blue"
              size="md"
            />
          </div>

          <!-- Heading -->
          <h2 class="mb-6 font-heading text-4xl font-bold leading-tight text-neutral-900 dark:text-neutral-50 md:text-4xl">
            Simple 3-Step Process
          </h2>

          <!-- Description -->
          <p class="mb-8 text-base text-neutral-600 dark:text-neutral-300 md:text-lg">
            Find and connect with verified landscape pros in your area through our straightforward process. Search local professionals, compare their services and credentials, then reach out directly to request quotes for your specific project.
          </p>

          <!-- CTA Button -->
          <div>
            <NuxtLink to="/">
              <Button
                text="Find Contractors"
                variant="primary"
                size="md"
              />
            </NuxtLink>
          </div>
        </div>

        <!-- Right Column: Step Cards -->
        <div class="@container flex flex-col gap-6">
          <!-- Step 1: Search by ZIP -->
          <Card
            variant="secondary-light-outline"
            icon="heroicons:map"
            heading="Search by City, State or Zip"
            :step="1"
          >
            Find local landscape pros by entering your city, state or zip code, giving you fast access to nearby service options that match your specific project needs.
          </Card>

          <!-- Step 2: Compare & Choose -->
          <Card
            variant="secondary-light-outline"
            icon="heroicons:squares-2x2"
            heading="Compare & Choose"
            :step="2"
          >
            Review profiles, services, pricing, and essential details to confidently evaluate and select the most suitable contractor for your home improvement project.
          </Card>

          <!-- Step 3: Contact or Request Service -->
          <Card
            variant="secondary-light-outline"
            icon="heroicons:chat-bubble-left-right"
            heading="Contact or Request Service"
            :step="3"
          >
            Connect directly, discuss your requirements, and request detailed quotes to begin your landscaping project with clarity and long-lasting confidence.
          </Card>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
</style>

