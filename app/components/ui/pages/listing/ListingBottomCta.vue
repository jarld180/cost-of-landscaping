<script setup lang="ts">
// Custom Bottom CTA for Listing Details Page
</script>

<template>
  <section class="py-16 md:py-20 lg:py-28">
    <div class="mx-auto w-full px-4 sm:px-6 lg:px-8">
      <!-- CTA Container -->
      <div
        class="flex flex-col items-center justify-between gap-8 rounded-3xl px-8 py-12 md:flex-row md:px-12 md:py-16 lg:px-16 lg:py-20"
        style="background-color: #1f6f3a;"
      >
        <!-- Left Side: Heading -->
        <div class="w-full text-center md:w-1/2 md:text-left">
          <h2 class="font-heading text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
            Get A Fast,<br>
            Detailed Quote
          </h2>
        </div>

        <!-- Right Side: Form -->
        <div class="flex w-full flex-col gap-4 md:w-1/2">
          <div class="flex flex-col gap-4 sm:flex-row">
            <input
              type="text"
              placeholder="City/ Zip"
              class="w-full rounded-lg border-0 bg-white px-6 py-4 text-base placeholder-neutral-400 focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 focus:ring-offset-[#1f6f3a]"
            >
            <Button
              text="Request Quote"
              variant="primary"
              :colors="['#ffffff', '#ffffff']"
              :textColors="['#1f6f3a', '#1f6f3a']"
              class="whitespace-nowrap rounded-full px-8 py-4 font-bold"
            />
          </div>
          <input
            type="text"
            placeholder="Project Details"
            class="w-full rounded-lg border-0 bg-white px-6 py-4 text-base placeholder-neutral-400 focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 focus:ring-offset-[#1f6f3a]"
          >
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Ensure inputs match the design's clean look */
input {
  outline: none;
}
</style>
