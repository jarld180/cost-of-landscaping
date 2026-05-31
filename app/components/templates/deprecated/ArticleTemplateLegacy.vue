<script setup lang="ts">
import type { Database } from '~/types/supabase'

type Page = Database['public']['Tables']['pages']['Row']

interface Props {
  /**
   * The page data to display
   */
  page: Page

  /**
   * Child pages to display (usually none for articles)
   */
  children?: Page[] | null

  /**
   * Breadcrumbs for navigation
   */
  breadcrumbs?: Array<{ id: string; title: string; full_path: string }> | null

  /**
   * Whether to show breadcrumbs
   * @default true
   */
  showBreadcrumbs?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showBreadcrumbs: true
})

// Parse metadata for Article-specific configuration
// Template settings are stored in metadata.template
const metadata = computed(() => {
  const pageMetadata = props.page.metadata as any
  if (!pageMetadata?.template) return null
  return pageMetadata.template as {
    category?: string
    showTableOfContents?: boolean
    showReadingTime?: boolean
    showSocialSharing?: boolean
    relatedArticles?: string[] // Array of page IDs
    callToAction?: {
      text: string
      url: string
      style?: 'primary' | 'secondary' | 'outline'
    }
  }
})

// Render markdown content
const { html: renderedContent } = useMarkdown(computed(() => props.page.content || ''))

// Extract table of contents from rendered HTML
const tableOfContents = computed(() => {
  if (!renderedContent.value || metadata.value?.showTableOfContents === false) return []

  // Parse HTML to extract H2 and H3 headings
  const parser = new DOMParser()
  const doc = parser.parseFromString(renderedContent.value, 'text/html')
  const headings = doc.querySelectorAll('h2, h3')

  return Array.from(headings).map((heading, index) => {
    const id = `heading-${index}`
    heading.id = id // Add ID to heading for anchor links

    return {
      id,
      text: heading.textContent || '',
      level: heading.tagName.toLowerCase() as 'h2' | 'h3'
    }
  })
})

// Calculate reading time (average 200 words per minute)
const readingTime = computed(() => {
  if (!props.page.content || metadata.value?.showReadingTime === false) return null

  const words = props.page.content.split(/\s+/).length
  const minutes = Math.ceil(words / 200)

  return minutes === 1 ? '1 min read' : `${minutes} min read`
})

// Format published date
const formattedDate = computed(() => {
  if (!props.page.published_at) return ''
  return new Date(props.page.published_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

// Social sharing URLs
const shareUrls = computed(() => {
  if (metadata.value?.showSocialSharing === false) return null

  const config = useRuntimeConfig()
  const siteUrl = config.public.siteUrl || 'https://costoflandscaping.com'
  const fullUrl = `${siteUrl}${props.page.full_path}`
  const title = encodeURIComponent(props.page.title)
  const description = encodeURIComponent(props.page.description || '')

  return {
    twitter: `https://twitter.com/intent/tweet?url=${fullUrl}&text=${title}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${fullUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${fullUrl}`
  }
})

// Scroll to heading when TOC link is clicked
const scrollToHeading = (id: string) => {
  const element = document.getElementById(id)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
</script>

<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-900">
    <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <!-- Breadcrumbs -->
      <Breadcrumbs
        v-if="showBreadcrumbs && breadcrumbs"
        :breadcrumbs="breadcrumbs"
        class="mb-6"
      />

      <!-- Main Content Area -->
      <article>
        <!-- Hero Section -->
        <section class="mb-12">
          <!-- Eyebrow Badge -->
          <div v-if="metadata?.category" class="mb-4">
            <Eyebrow
              :text="metadata.category"
              variant="blue-blue"
              size="md"
            />
          </div>

          <!-- Title -->
          <h1 class="mb-4 font-heading text-4xl font-bold leading-tight text-neutral-900 dark:text-neutral-50 md:text-5xl">
            {{ page.title }}
          </h1>

          <!-- Description -->
          <p
            v-if="page.description"
            class="mb-6 text-lg leading-relaxed text-neutral-600 dark:text-neutral-300"
          >
            {{ page.description }}
          </p>

          <!-- Meta Info (Published Date + Reading Time) -->
          <div class="flex flex-wrap items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400">
            <div v-if="formattedDate">
              Published {{ formattedDate }}
            </div>
            <div v-if="readingTime" class="flex items-center gap-1">
              <span>•</span>
              <span>{{ readingTime }}</span>
            </div>
          </div>
        </section>

        <!-- Table of Contents -->
        <nav
          v-if="tableOfContents.length > 0"
          class="mb-12 rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800"
        >
          <h2 class="mb-4 font-heading text-xl font-bold text-neutral-900 dark:text-neutral-50">
            Table of Contents
          </h2>
          <ul class="space-y-2">
            <li
              v-for="item in tableOfContents"
              :key="item.id"
              :class="item.level === 'h3' ? 'ml-4' : ''"
            >
              <button
                type="button"
                class="text-left text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                @click="scrollToHeading(item.id)"
              >
                {{ item.text }}
              </button>
            </li>
          </ul>
        </nav>

        <!-- Main Content (Markdown) -->
        <section
          v-if="renderedContent"
          class="prose prose-lg prose-neutral mx-auto mb-12 max-w-none dark:prose-invert prose-headings:font-heading prose-headings:font-bold prose-a:text-blue-600 hover:prose-a:text-blue-700 dark:prose-a:text-blue-400 dark:hover:prose-a:text-blue-300"
          v-html="renderedContent"
        />

        <!-- Social Sharing -->
        <section
          v-if="shareUrls"
          class="mb-12 flex items-center gap-4 border-y border-neutral-200 py-6 dark:border-neutral-700"
        >
          <span class="font-medium text-neutral-700 dark:text-neutral-300">Share this article:</span>
          <div class="flex gap-3">
            <a
              :href="shareUrls.twitter"
              target="_blank"
              rel="noopener noreferrer"
              class="rounded-lg bg-neutral-100 p-2 text-neutral-700 transition-colors hover:bg-blue-100 hover:text-blue-600 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-blue-900 dark:hover:text-blue-400"
              aria-label="Share on Twitter"
            >
              <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              :href="shareUrls.facebook"
              target="_blank"
              rel="noopener noreferrer"
              class="rounded-lg bg-neutral-100 p-2 text-neutral-700 transition-colors hover:bg-blue-100 hover:text-blue-600 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-blue-900 dark:hover:text-blue-400"
              aria-label="Share on Facebook"
            >
              <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 3.667h-3.533v7.98H9.101z" />
              </svg>
            </a>
            <a
              :href="shareUrls.linkedin"
              target="_blank"
              rel="noopener noreferrer"
              class="rounded-lg bg-neutral-100 p-2 text-neutral-700 transition-colors hover:bg-blue-100 hover:text-blue-600 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-blue-900 dark:hover:text-blue-400"
              aria-label="Share on LinkedIn"
            >
              <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
          </div>
        </section>

        <!-- Call to Action -->
        <section
          v-if="metadata?.callToAction"
          class="rounded-lg border border-neutral-200 bg-white p-8 text-center dark:border-neutral-700 dark:bg-neutral-800"
        >
          <h3 class="mb-4 font-heading text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            Ready to get started?
          </h3>
          <Button
            :to="metadata.callToAction.url"
            :variant="metadata.callToAction.style || 'primary'"
            size="lg"
          >
            {{ metadata.callToAction.text }}
          </Button>
        </section>
      </article>
    </div>
  </div>
</template>

<style scoped>
/* No additional styles needed */
</style>

