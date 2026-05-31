<script setup lang="ts">
interface Props {
  title: string
  componentName: string
  description?: string
}

defineProps<Props>()
</script>

<template>
  <section class="relative rounded-xl border-2 border-neutral-200 bg-neutral-50 p-8 dark:border-neutral-700 dark:bg-neutral-800">
    <!-- Props Documentation Popover (Top Right) -->
    <div class="absolute right-4 top-4">
      <ComponentPropsPopover :component-name="componentName" />
    </div>
    
    <h2 class="mb-2 font-heading text-2xl font-bold text-neutral-700 dark:text-neutral-200">
      {{ title }}
    </h2>
    
    <p 
      v-if="description" 
      class="mb-6 text-sm text-neutral-600 dark:text-neutral-400"
    >
      {{ description }}
    </p>
    
    <!-- Component demos go here -->
    <div :class="{ 'mt-6': !description }">
      <slot />
    </div>
  </section>
</template>

