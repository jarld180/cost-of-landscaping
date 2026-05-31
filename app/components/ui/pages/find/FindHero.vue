<template>
  <section class="rounded-2xl bg-[#f0f7f0] dark:bg-neutral-800 px-6 py-12 md:px-12 md:py-16">
    <div class="mx-auto max-w-3xl text-center">
      <div class="mb-4 flex justify-center">
        <Eyebrow text="Find Local Contractors" />
      </div>
      <h1 class="text-4xl font-bold tracking-tight text-neutral-900 dark:text-white md:text-5xl mb-4">
        Find Landscape Pros Near You
      </h1>
      <p class="text-lg text-neutral-600 dark:text-neutral-400 mb-8">
        Connect with top-rated landscape professionals in your area. Get quotes for driveways, patios, foundations, and more.
      </p>
      <div class="mx-auto max-w-xl">
        <SearchInput
          placeholder="Enter city, state, or ZIP code"
          size="lg"
          variant="primary-outline"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
// No props needed for this component
</script>
