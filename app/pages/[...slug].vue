<script setup lang="ts">
// Catch-All Route for Dynamic Page Rendering
// Handles all page paths and renders appropriate template based on database data
// IMPORTANT: This route must NOT catch state/city routes - those are handled by [state] routes

// Use page layout (no container constraints - templates control their own widths)
definePageMeta({
  layout: 'page'
})

import { consola } from 'consola'
import { getTemplateComponent } from '~/utils/pageTemplateRegistry'
import { isValidStateSlug } from '~/utils/usStates'

// Get route params
const route = useRoute()

// Build full path from slug params
const slugArray = route.params.slug as string[] | undefined
const path = computed(() => {
  return '/' + (slugArray?.join('/') || '')
})

// STATE COLLISION PREVENTION
// If the first segment is a valid US state slug, this should be handled by [state] routes
// Throw 404 here to let Nuxt fall through to the correct route
const firstSegment = slugArray?.[0]
if (firstSegment && isValidStateSlug(firstSegment)) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Page Not Found',
    message: `The page "${path.value}" could not be found.`,
    fatal: true
  })
}

// Fetch page data from database
// We'll fetch children for all pages and let the template decide whether to use them
const { page, children, breadcrumbs, pending, error } = await usePage(path.value, {
  fetchChildren: true, // Always fetch children, templates will decide whether to display them
  fetchBreadcrumbs: true
})

// Handle errors
if (error.value) {
  if (import.meta.dev) {
    console.error('Error loading page:', error.value)
  }

  // Check if it's a 404 error
  if (error.value.message?.includes('not found') || error.value.message?.includes('404')) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Page Not Found',
      message: `The page "${path.value}" could not be found.`,
      fatal: true
    })
  }

  // Check if it's a 403 error (draft page, no access)
  if (error.value.message?.includes('permission') || error.value.message?.includes('403')) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Access Denied',
      message: 'You do not have permission to view this page.',
      fatal: true
    })
  }

  // Generic server error
  throw createError({
    statusCode: 500,
    statusMessage: 'Server Error',
    message: 'An error occurred while loading the page.',
    fatal: true
  })
}

// Handle page not found
if (!page.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Page Not Found',
    message: `The page "${path.value}" could not be found.`,
    fatal: true
  })
}

// Generate SEO meta tags from database data
usePageSeo(page.value)

// Dynamic template component selection based on page.template from database
const templateComponent = computed(() => {
  const template = page.value?.template || 'default'

  if (import.meta.dev) {
    consola.info('[PageRenderer] Selecting template component', {
      template,
      pageSlug: page.value?.slug,
      pagePath: path.value
    })
  }

  return getTemplateComponent(template)
})

// Log page load in development
if (import.meta.dev) {
  consola.success('[PageRenderer] Page loaded', {
    path: path.value,
    title: page.value?.title,
    template: page.value?.template,
    depth: page.value?.depth,
    status: page.value?.status
  })
}
</script>

<template>
  <div>
    <!-- Loading State -->
    <div v-if="pending" class="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div class="animate-pulse space-y-4">
          <!-- Loading skeleton -->
          <div class="h-12 w-3/4 rounded bg-neutral-200 dark:bg-neutral-700" />
          <div class="h-6 w-1/2 rounded bg-neutral-200 dark:bg-neutral-700" />
          <div class="space-y-3 pt-8">
            <div class="h-4 rounded bg-neutral-200 dark:bg-neutral-700" />
            <div class="h-4 rounded bg-neutral-200 dark:bg-neutral-700" />
            <div class="h-4 w-5/6 rounded bg-neutral-200 dark:bg-neutral-700" />
          </div>
        </div>
      </div>
    </div>

    <!-- Page Content (Dynamic Template) -->
    <component
      v-else-if="page"
      :is="templateComponent"
      :page="page"
      :children="children"
      :breadcrumbs="breadcrumbs"
    />
  </div>
</template>

<style scoped>
/* No additional styles needed */
</style>

