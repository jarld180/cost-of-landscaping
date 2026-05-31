<script setup lang="ts">
/**
 * SidebarSearchBox - Compact search box for article sidebar
 *
 * Displayed in the right sidebar of ArticleTemplate when enabled via metadata.
 */

interface Props {
  /** Headline text */
  headline?: string
  /** Button text */
  buttonText?: string
  /** Input placeholder */
  placeholder?: string
}

withDefaults(defineProps<Props>(), {
  headline: 'Find Local Contractors',
  buttonText: 'SEARCH',
  placeholder: 'Enter Zip Code'
})
</script>

<template>
  <div class="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
    <h3 class="mb-3 font-heading text-sm font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
      {{ headline }}
    </h3>
    <SearchInput
      :placeholder="placeholder"
      :button="buttonText"
      size="sm"
      variant="primary-outline"
      :background-color="['#ffffff', '#374151']"
    />
  </div>
</template>

