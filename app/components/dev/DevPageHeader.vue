<script setup lang="ts">
interface Props {
  title: string
  description: string
}

defineProps<Props>()
</script>

<template>
  <div class="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 p-8 text-neutral-50">
    <h1 class="@md:text-4xl mb-3 font-heading text-2xl font-bold">
      {{ title }}
    </h1>
    <p class="@md:text-lg text-base text-blue-100">
      {{ description }}
    </p>
  </div>
</template>

<style scoped>
</style>

