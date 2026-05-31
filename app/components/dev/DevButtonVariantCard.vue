<script setup lang="ts">
interface Props {
  variantTitle: string
  variant: 'primary' | 'primary-outline' | 'secondary' | 'secondary-outline' | 'ghost'
  sampleText: string
  icon?: string | null
}

defineProps<Props>()

const sizes = [
  { name: 'Small (sm)', value: 'sm' },
  { name: 'Medium (md) - Default', value: 'md' },
  { name: 'Large (lg)', value: 'lg' },
  { name: 'Extra Large (xl)', value: 'xl' }
] as const
</script>

<template>
  <div class="rounded-xl border-2 border-neutral-200 bg-neutral-50 p-8 dark:border-neutral-700 dark:bg-neutral-800">
    <h3 class="mb-6 font-heading text-xl font-bold text-neutral-700 dark:text-neutral-200">
      {{ variantTitle }}
    </h3>

    <div class="space-y-6">
      <div v-for="size in sizes" :key="size.value">
        <h4 class="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
          {{ size.name }}
        </h4>
        <div class="flex flex-wrap gap-4">
          <Button :text="sampleText" :size="size.value" :variant="variant" :icon="icon" />
          <Button text="Disabled" :size="size.value" :variant="variant" :disabled="true" :icon="icon" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>

