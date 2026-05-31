<script setup lang="ts">
// UI Components Showcase Page
definePageMeta({
  layout: 'dev'
})

useSeoMeta({
  title: 'UI Components Showcase',
  description: 'Interactive demonstration of all UI components with variants and sizes.'
})
</script>

<template>
  <div class="space-y-12">
    <!-- Header -->
    <DevPageHeader
      title="UI Components Showcase"
      description="Interactive showcase of all UI components built with Reka UI primitives"
    />

    <!-- Eyebrow Component -->
    <div id="eyebrows">
      <DevEyebrowShowcase />
    </div>

    <!-- Badge Component -->
    <div id="badges">
      <DevBadgeShowcase />
    </div>

    <!-- Button Components -->
    <div id="buttons">
      <DevButtonShowcase />
    </div>

    <!-- Popover Component -->
    <div id="popovers">
      <DevPopoverShowcase />
    </div>

    <!-- Dialog Component -->
    <div id="dialogs">
      <DevDialogShowcase />
    </div>

    <!-- Card Component -->
    <div id="cards">
      <DevCardShowcase />
    </div>

    <!-- SearchInput Component -->
    <div id="search-inputs">
      <DevSearchInputShowcase />
    </div>

    <!-- Divider Component -->
    <div id="dividers">
      <DevDividerShowcase />
    </div>
  </div>
</template>

<style scoped>
</style>

