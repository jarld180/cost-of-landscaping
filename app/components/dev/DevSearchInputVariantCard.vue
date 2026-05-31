<script setup lang="ts">
interface Props {
  /**
   * The display name for the variant
   */
  variantTitle: string

  /**
   * The variant type to demonstrate
   */
  variant: 'primary-outline' | 'secondary-outline' | 'secondary-light-outline'

  /**
   * Whether to show button mode
   * @default false
   */
  buttonMode?: boolean

  /**
   * Button text for button mode
   * @default 'Find Contractors'
   */
  buttonText?: string
}

const props = withDefaults(defineProps<Props>(), {
  buttonMode: false,
  buttonText: 'Find Contractors'
})

// Handle submit events
const handleSubmit = (value: any) => {
  // Event is already logged in the SearchInput component
  // This is just to demonstrate the event is emitted
}
</script>

<template>
  <div class="rounded-lg border border-neutral-300 bg-white p-6 dark:border-neutral-600 dark:bg-neutral-800">
    <h3 class="mb-4 font-heading text-lg font-bold text-neutral-900 dark:text-neutral-100">
      {{ variantTitle }}
    </h3>

    <div class="space-y-6">
      <!-- Small Size -->
      <div class="space-y-2">
        <span class="block text-sm font-medium text-neutral-600 dark:text-neutral-400">Small</span>
        <SearchInput
          :variant="variant"
          size="sm"
          :placeholder="buttonMode ? 'ZIP Code' : 'Search Contractors by ZIP Code'"
          :button="buttonMode ? buttonText : null"
          @submit="handleSubmit"
        />
      </div>

      <!-- Medium Size -->
      <div class="space-y-2">
        <span class="block text-sm font-medium text-neutral-600 dark:text-neutral-400">Medium</span>
        <SearchInput
          :variant="variant"
          size="md"
          :placeholder="buttonMode ? 'ZIP Code' : 'Search Contractors by ZIP Code'"
          :button="buttonMode ? buttonText : null"
          @submit="handleSubmit"
        />
      </div>

      <!-- Large Size -->
      <div class="space-y-2">
        <span class="block text-sm font-medium text-neutral-600 dark:text-neutral-400">Large</span>
        <SearchInput
          :variant="variant"
          size="lg"
          :placeholder="buttonMode ? 'ZIP Code' : 'Search Contractors by ZIP Code'"
          :button="buttonMode ? buttonText : null"
          @submit="handleSubmit"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>

