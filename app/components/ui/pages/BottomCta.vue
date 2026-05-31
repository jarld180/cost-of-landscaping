<script setup lang="ts">
// Bottom CTA Section - Call to action for contractors
</script>

<template>
  <section class="py-16 md:py-20 lg:py-28">
    <div class="mx-auto w-full px-4 sm:px-6 lg:px-8">
      <!-- CTA Container -->
      <div class="flex flex-col items-center justify-center rounded-3xl px-8 py-16 text-center md:px-12 md:py-20 lg:px-16 lg:py-28" style="background-color: #0041d9;">
        <!-- Eyebrow -->
        <Eyebrow
          text="For Contractors"
          variant="white-blue"
          size="md"
          class="mb-6"
        />

        <!-- Heading -->
        <h2 class="mb-6 font-heading text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
          Get Listed. Get More Jobs.
        </h2>

        <!-- Description -->
        <p class="mb-8 max-w-3xl text-lg text-white md:text-xl">
          Join the Cost of landscape directory and connect with homeowners searching for trusted landscape pros in your area.
        </p>

        <!-- CTA Button -->
        <Button
          text="Get Listed Now"
          variant="primary-outline"
          :colors="['#ffffff', '#c0c0c0']"
          :textColors="['#0041d9', '#0041d9']"
          location="/"
          size="lg"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
</style>

