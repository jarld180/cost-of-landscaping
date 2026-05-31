<script setup lang="ts">
// Eyebrow component showcase demonstrating all variants and sizes
</script>

<template>
  <ComponentSection
    title="Eyebrow Component"
    component-name="Eyebrow"
    description="Pill-shaped label component for section headers and category tags"
  >
    <div class="grid grid-cols-1 gap-8 @3xl:grid-cols-3">
      <DevEyebrowVariantCard
        variant-title="White-Blue Variant"
        variant="white-blue"
        sample-text="Homeowners Guide to landscape"
        background="light-blue"
      />

      <DevEyebrowVariantCard
        variant-title="Blue-Blue Variant"
        variant="blue-blue"
        sample-text="How It Works"
      />

      <DevEyebrowVariantCard
        variant-title="White-White Variant"
        variant="white-white"
        sample-text="Featured Content"
        background="dark"
      />
    </div>
  </ComponentSection>
</template>

<style scoped>
</style>

