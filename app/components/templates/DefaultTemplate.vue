<script setup lang="ts">
// Default Template Component
// Minimal fallback template for pages without a specific template
// Used when page.template is 'default' or unknown

import type { Database } from '~/types/supabase'

type Page = Database['public']['Tables']['pages']['Row']

interface Breadcrumb {
  id: string
  title: string
  full_path: string
}

interface Props {
  /**
   * Page data from database
   */
  page: Page

  /**
   * Child pages (optional)
   */
  children?: Page[] | null

  /**
   * Breadcrumb navigation items (optional)
   */
  breadcrumbs?: Breadcrumb[] | null
}

const props = defineProps<Props>()

// Parse markdown content from database
const { html } = useMarkdown(props.page.content)

// Extract template metadata from database JSONB field
const templateMetadata = computed(() => (props.page.metadata as any)?.template || {})
const showBreadcrumbs = computed(() => templateMetadata.value.showBreadcrumbs ?? true)
const showChildList = computed(() => templateMetadata.value.showChildList ?? false)

// Format published date
const publishedDate = computed(() => {
  if (!props.page.published_at) return null
  return new Date(props.page.published_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})
</script>

<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-900">
    <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <!-- Breadcrumbs (if enabled) -->
      <div v-if="showBreadcrumbs" class="mb-6">
        <Breadcrumbs :items="breadcrumbs" />
      </div>

      <!-- Main Content -->
      <article class="rounded-lg bg-white p-8 shadow-sm dark:bg-neutral-800 md:p-12">
        <!-- Page Title -->
        <h1 class="mb-4 font-heading text-4xl font-bold leading-tight text-neutral-900 dark:text-neutral-50 md:text-5xl">
          {{ page.title }}
        </h1>

        <!-- Page Description (if available) -->
        <p v-if="page.description" class="mb-6 text-lg text-neutral-600 dark:text-neutral-300">
          {{ page.description }}
        </p>

        <!-- Published Date (if available) -->
        <p v-if="publishedDate" class="mb-8 text-sm text-neutral-500 dark:text-neutral-400">
          Published {{ publishedDate }}
        </p>

        <!-- Markdown Content from Database -->
        <div
          v-html="html"
          class="prose prose-lg prose-neutral max-w-none dark:prose-invert prose-headings:font-heading prose-headings:font-bold prose-a:text-blue-600 hover:prose-a:text-blue-700 dark:prose-a:text-blue-400 dark:hover:prose-a:text-blue-300"
        />

        <!-- Child Pages List (if enabled and available) -->
        <div v-if="showChildList && children && children.length > 0" class="mt-12 border-t border-neutral-200 pt-8 dark:border-neutral-700">
          <h2 class="mb-6 font-heading text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            Related Pages
          </h2>
          <ul class="space-y-4">
            <li v-for="child in children" :key="child.id">
              <NuxtLink
                :to="child.full_path"
                class="group block rounded-lg border border-neutral-200 p-4 transition-colors hover:border-blue-500 hover:bg-blue-50 dark:border-neutral-700 dark:hover:border-blue-500 dark:hover:bg-neutral-700"
              >
                <h3 class="mb-1 font-heading text-lg font-semibold text-neutral-900 group-hover:text-blue-600 dark:text-neutral-50 dark:group-hover:text-blue-400">
                  {{ child.title }}
                </h3>
                <p v-if="child.description" class="text-sm text-neutral-600 dark:text-neutral-300">
                  {{ child.description }}
                </p>
              </NuxtLink>
            </li>
          </ul>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
/* Additional prose styles if needed */
</style>

