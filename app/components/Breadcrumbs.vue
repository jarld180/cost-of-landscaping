<script setup lang="ts">
/**
 * Breadcrumbs Component
 *
 * Reusable breadcrumb navigation with Schema.org BreadcrumbList structured data
 *
 * Features:
 * - Home link at the start
 * - Current page (non-clickable, styled differently)
 * - Schema.org BreadcrumbList JSON-LD
 * - Mobile-responsive
 * - Dark/light mode support
 * - Clean chevron separator
 */

interface Breadcrumb {
  id: string
  title: string
  full_path: string
}

interface Props {
  /**
   * Array of breadcrumb items from the API
   * Includes all pages from root to current page (including current)
   */
  items?: Breadcrumb[] | null

  /**
   * Whether to show the home link
   * @default true
   */
  showHome?: boolean

  /**
   * Use light variant for dark backgrounds (e.g., hero images)
   * @default false
   */
  light?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showHome: true,
  light: false
})

// Get site config
const config = useRuntimeConfig()
const siteUrl = config.public.siteUrl || 'https://costoflandscaping.com'
const siteName = config.public.siteName || 'Cost of Landscaping'

// Build complete breadcrumb list with Home
const breadcrumbList = computed(() => {
  const list: Array<{ title: string; path: string; isHome?: boolean; isCurrent?: boolean }> = []

  // Add Home link if enabled
  if (props.showHome) {
    list.push({
      title: 'Home',
      path: '/',
      isHome: true
    })
  }

  // Add breadcrumb items from API
  if (props.items && props.items.length > 0) {
    props.items.forEach((item, index) => {
      // Mark the last item as current page (non-clickable)
      const isCurrent = index === props.items!.length - 1

      list.push({
        title: item.title,
        path: item.full_path,
        isCurrent
      })
    })
  }

  return list
})

// Generate Schema.org BreadcrumbList JSON-LD
const breadcrumbSchema = computed(() => {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': breadcrumbList.value
      .filter(item => !item.isCurrent) // Exclude current page from schema
      .map((item, index) => ({
        '@type': 'ListItem',
        'position': index + 1,
        'name': item.title,
        'item': item.isHome ? siteUrl : `${siteUrl}${item.path}`
      }))
  }
})

// Add Schema.org structured data to head
useHead({
  script: [
    {
      type: 'application/ld+json',
      children: JSON.stringify(breadcrumbSchema.value)
    }
  ]
})
</script>

<template>
  <nav
    aria-label="Breadcrumb"
    class="flex flex-wrap items-center gap-2 text-xs"
    :class="light ? 'text-neutral-300' : 'text-neutral-600 dark:text-neutral-400'"
  >
    <template v-for="(crumb, index) in breadcrumbList" :key="index">
      <!-- Breadcrumb Item -->
      <div class="flex items-center gap-2">
        <!-- Link (for non-current pages) -->
        <NuxtLink
          v-if="!crumb.isCurrent"
          :to="crumb.path"
          class="transition-colors"
          :class="light ? 'hover:text-white' : 'hover:text-neutral-900 dark:hover:text-neutral-100'"
          :aria-current="crumb.isCurrent ? 'page' : undefined"
        >
          {{ crumb.title }}
        </NuxtLink>

        <!-- Current Page (non-clickable) -->
        <span
          v-else
          class="font-medium"
          :class="light ? 'text-white' : 'text-neutral-900 dark:text-neutral-100'"
          aria-current="page"
        >
          {{ crumb.title }}
        </span>

        <!-- Separator (chevron) -->
        <svg
          v-if="index < breadcrumbList.length - 1"
          class="h-3 w-3 flex-shrink-0"
          :class="light ? 'text-neutral-400' : 'text-neutral-400 dark:text-neutral-600'"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </template>
  </nav>
</template>

