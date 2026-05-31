<script setup lang="ts">
/**
 * ArticleTemplate - Block-ready article template
 *
 * Features:
 * - Hero section with breadcrumbs, title, optional grayscale background
 * - 2-column layout (2/3 content, 1/3 sticky sidebar)
 * - Sidebar with TOC, optional author, last updated
 * - Mobile bottom sheet for TOC
 * - Block-ready architecture (markdown, faq blocks)
 */
import type { Database } from '~/types/supabase'

type Page = Database['public']['Tables']['pages']['Row']

/** Content block types */
interface MarkdownBlock {
  type: 'markdown'
  content: string
}

interface FaqBlock {
  type: 'faq'
  title?: string
  items: Array<{ question: string; answer: string }>
}

type ContentBlock = MarkdownBlock | FaqBlock

/** AI Image metadata */
interface AIImage {
  headingText: string
  headingSlug: string
  imageUrl: string
  thumbnailUrl: string
  imageAlt: string
}

/** Article template metadata */
interface ArticleMetadata {
  heroImage?: string
  author?: string
  showTableOfContents?: boolean
  showSidebarSearch?: boolean
  blocks?: ContentBlock[]
  aiImages?: AIImage[]
}

interface Props {
  page: Page
  children?: Page[] | null
  breadcrumbs?: Array<{ id: string; title: string; full_path: string }> | null
  showBreadcrumbs?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showBreadcrumbs: true
})

// Parse metadata
const metadata = computed<ArticleMetadata>(() => {
  const pageMetadata = props.page.metadata as any
  return pageMetadata?.template || {}
})

// AI Images from metadata
const aiImages = computed<AIImage[]>(() => metadata.value.aiImages ?? [])

// Show TOC (default true)
const showToc = computed(() => metadata.value.showTableOfContents !== false)

// Show sidebar search (default false - opt-in)
const showSidebarSearch = computed(() => metadata.value.showSidebarSearch === true)

// Mobile TOC sheet state
const isTocSheetOpen = ref(false)

// Generate URL-safe slug from text
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')      // Replace spaces with hyphens
    .replace(/-+/g, '-')       // Collapse multiple hyphens
}

// Check if content is HTML (has HTML tags) or markdown
function isHtmlContent(content: string): boolean {
  return /<[a-z][\s\S]*>/i.test(content)
}

// Get image for a specific heading slug
function getImageForHeading(headingSlug: string): AIImage | undefined {
  return aiImages.value.find(img => img.headingSlug === headingSlug)
}

// Escape HTML attributes to prevent XSS
function escapeHtmlAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Process HTML content to add IDs to headings for TOC linking and inject images
function addHeadingIds(html: string): string {
  if (!html) return ''

  // Add IDs to H2 and H3 tags based on their text content
  return html
    .replace(/<h2>([^<]+)<\/h2>/gi, (_, text) => {
      const id = slugify(text.trim())
      const image = getImageForHeading(id)
      let result = `<h2 id="${id}">${text}</h2>`

      if (image) {
        const safeAlt = escapeHtmlAttr(image.imageAlt)
        result += `
          <picture class="block my-6">
            <source media="(max-width: 768px)" srcset="${image.thumbnailUrl}" type="image/webp">
            <source media="(min-width: 769px)" srcset="${image.imageUrl}" type="image/webp">
            <img src="${image.imageUrl}" alt="${safeAlt}" class="w-full rounded-lg aspect-video object-cover" loading="lazy">
          </picture>`
      }

      return result
    })
    .replace(/<h3>([^<]+)<\/h3>/gi, (_, text) => {
      const id = slugify(text.trim())
      return `<h3 id="${id}">${text}</h3>`
    })
}

// Placeholder ID for inline search box teleport
const SEARCH_BOX_PLACEHOLDER_ID = 'inline-search-box-placeholder'

// InlineSearchBox configuration parsed from content
interface SearchBoxConfig {
  headline?: string
  subtext?: string
  buttonText?: string
  placeholder?: string
}

// Parsed search box config from content
const searchBoxConfig = ref<SearchBoxConfig>({})

// Check if content contains searchBox placeholder (with or without JSON config)
const hasSearchBoxPlaceholder = computed(() => {
  const content = props.page.content || ''
  return /<code>searchBox(:[^<]+)?<\/code>/i.test(content)
})

// Process content to replace <code>searchBox</code> or <code>searchBox:{...}</code> with a teleport target
function processSearchBoxPlaceholder(html: string): string {
  return html.replace(
    /<code>searchBox(:(\{[^<]+\}))?<\/code>/gi,
    (_, __, jsonStr) => {
      // Parse JSON config if present
      if (jsonStr) {
        try {
          searchBoxConfig.value = JSON.parse(jsonStr)
        } catch (e) {
          console.warn('Failed to parse searchBox config:', jsonStr)
          searchBoxConfig.value = {}
        }
      } else {
        searchBoxConfig.value = {}
      }
      return `<div id="${SEARCH_BOX_PLACEHOLDER_ID}"></div>`
    }
  )
}

// Render content block - HTML or markdown with heading IDs and search box placeholder
function renderBlock(content: string): string {
  if (!content) return ''

  let processed: string

  if (isHtmlContent(content)) {
    // Content is HTML (TipTap) - add heading IDs directly
    processed = addHeadingIds(content)
  } else {
    // Content is markdown - render through useMarkdown (which adds heading IDs)
    processed = useMarkdown(content).html.value
  }

  // Replace <code>searchBox</code> with teleport placeholder
  return processSearchBoxPlaceholder(processed)
}

// Content blocks - always include page.content first, then any additional blocks from metadata
const contentBlocks = computed<ContentBlock[]>(() => {
  const blocks: ContentBlock[] = []

  // Always include page.content as the primary content block
  if (props.page.content) {
    blocks.push({ type: 'markdown', content: props.page.content })
  }

  // Append any additional blocks from metadata (FAQ, etc.)
  if (metadata.value.blocks && metadata.value.blocks.length > 0) {
    blocks.push(...metadata.value.blocks)
  }

  return blocks
})

// Extract TOC from content (supports both HTML and markdown)
const tableOfContents = computed(() => {
  if (!showToc.value) return []

  const headings: Array<{ id: string; text: string; level: 'h2' | 'h3' }> = []

  // Get content - either from blocks or directly from page.content
  let content = ''
  for (const block of contentBlocks.value) {
    if (block.type === 'markdown' && block.content) {
      content += block.content
    }
  }

  // Collect all headings with their positions for proper ordering
  const allHeadings: Array<{ text: string; level: 'h2' | 'h3'; pos: number }> = []

  if (isHtmlContent(content)) {
    // Extract H2 and H3 headings from HTML
    const h2Matches = content.matchAll(/<h2[^>]*>([^<]+)<\/h2>/gi)
    const h3Matches = content.matchAll(/<h3[^>]*>([^<]+)<\/h3>/gi)

    for (const match of h2Matches) {
      if (match[1]) {
        allHeadings.push({ text: match[1].trim(), level: 'h2', pos: match.index || 0 })
      }
    }
    for (const match of h3Matches) {
      if (match[1]) {
        allHeadings.push({ text: match[1].trim(), level: 'h3', pos: match.index || 0 })
      }
    }
  } else {
    // Extract headings from markdown syntax (## and ###)
    const mdMatches = content.matchAll(/^(#{2,3})\s+(.+)$/gm)
    for (const match of mdMatches) {
      const hashMarks = match[1]
      const headingText = match[2]
      if (hashMarks && headingText) {
        allHeadings.push({
          text: headingText.trim(),
          level: hashMarks.length === 2 ? 'h2' : 'h3',
          pos: match.index || 0
        })
      }
    }
  }

  // Sort by position in document
  allHeadings.sort((a, b) => a.pos - b.pos)

  // Convert to TOC items with IDs
  for (const heading of allHeadings) {
    headings.push({
      id: slugify(heading.text),
      text: heading.text,
      level: heading.level
    })
  }

  return headings
})

// Format dates
const formattedDate = computed(() => {
  const date = props.page.updated_at || props.page.published_at
  if (!date) return null
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
})

// Scroll to heading
const scrollToHeading = (id: string) => {
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    isTocSheetOpen.value = false
  }
}

// Related articles for internal linking
const { data: relatedData } = await useFetch('/api/public/related-pages', {
  query: { path: props.page.full_path, limit: 5 },
  server: true,
  lazy: true,
  default: () => ({ pages: [] }),
})
const relatedPages = computed(() => relatedData.value?.pages || [])
</script>

<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-900">
    <!-- Hero Section - full viewport width background -->
    <header
      class="relative py-12 lg:py-16"
      :class="metadata.heroImage ? 'bg-neutral-800' : 'bg-white dark:bg-neutral-800'"
    >
      <!-- Optional grayscale background image - full width -->
      <div
        v-if="metadata.heroImage"
        class="absolute inset-0 bg-cover bg-center opacity-30 grayscale"
        :style="{ backgroundImage: `url(${metadata.heroImage})` }"
      />

      <!-- Content container - constrained width -->
      <div class="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <!-- Breadcrumbs -->
        <Breadcrumbs
          v-if="showBreadcrumbs && breadcrumbs"
          :items="breadcrumbs"
          :light="!!metadata.heroImage"
          class="mb-6"
        />

        <!-- Title -->
        <h1 class="font-heading text-3xl font-bold leading-tight text-neutral-900 dark:text-neutral-50 md:text-4xl lg:text-5xl"
            :class="metadata.heroImage ? 'text-white' : ''">
          {{ page.title }}
        </h1>
      </div>
    </header>

    <!-- Main Content Area: 2-column layout -->
    <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div class="lg:grid lg:grid-cols-3 lg:gap-12">
        <!-- Content Column (2/3) -->
        <article class="lg:col-span-2">
          <!-- Render content blocks -->
          <template v-for="(block, idx) in contentBlocks" :key="idx">
            <!-- Content Block (supports HTML from TipTap or markdown) -->
            <div v-if="block.type === 'markdown'"
                 class="prose prose-lg prose-neutral mb-8 max-w-none dark:prose-invert prose-headings:font-heading prose-headings:font-bold prose-a:text-blue-600 hover:prose-a:text-blue-700 dark:prose-a:text-blue-400"
                 v-html="renderBlock(block.content)" />

            <!-- FAQ Block -->
            <div v-else-if="block.type === 'faq'" class="mb-8">
              <FaqAccordion :items="block.items" :title="block.title" />
            </div>
          </template>
        </article>

        <!-- Sidebar Column (1/3) - Desktop only -->
        <aside class="hidden lg:col-span-1 lg:block">
          <div class="sticky top-8 space-y-6">
            <!-- Table of Contents -->
            <nav v-if="showToc && tableOfContents.length > 0" class="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
              <h2 class="mb-4 font-heading text-sm font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                On this page
              </h2>
              <ul class="space-y-2 text-sm">
                <li v-for="item in tableOfContents" :key="item.id" :class="item.level === 'h3' ? 'ml-3' : ''">
                  <button type="button" @click="scrollToHeading(item.id)"
                    class="text-left text-neutral-600 transition-colors hover:text-blue-600 dark:text-neutral-300 dark:hover:text-blue-400">
                    {{ item.text }}
                  </button>
                </li>
              </ul>
            </nav>

            <!-- Author & Updated -->
            <div v-if="metadata.author || formattedDate" class="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
              <div v-if="metadata.author" class="mb-3">
                <span class="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Author</span>
                <p class="mt-1 font-medium text-neutral-900 dark:text-neutral-50">{{ metadata.author }}</p>
              </div>
              <div v-if="formattedDate">
                <span class="flex flex-row items-center text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  Last updated <Icon name="ion:checkmark" class="ml-1 h-3 w-3" />
                </span>
                <p class="mt-1 text-neutral-600 dark:text-neutral-300">{{ formattedDate }}</p>
              </div>
            </div>

            <!-- Sidebar Search Box (opt-in via metadata) -->
            <SidebarSearchBox v-if="showSidebarSearch" />

            <!-- Find a Contractor CTA -->
            <div class="rounded-lg border border-orange-200 bg-orange-50 p-5 dark:border-orange-800 dark:bg-orange-900/10">
              <h3 class="mb-1 font-heading text-sm font-bold text-orange-900 dark:text-orange-100">Find Landscape Pros</h3>
              <p class="mb-3 text-xs text-orange-700 dark:text-orange-300">Get free quotes from verified local pros.</p>
              <NuxtLink
                to="/find"
                class="block rounded-lg bg-orange-500 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-orange-600"
              >
                Find Contractors Near Me
              </NuxtLink>
            </div>

            <!-- Related Articles -->
            <div v-if="relatedPages.length > 0" class="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
              <h3 class="mb-3 font-heading text-sm font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Related Articles</h3>
              <ul class="space-y-2">
                <li v-for="article in relatedPages" :key="article.full_path">
                  <NuxtLink
                    :to="article.full_path"
                    class="block text-sm text-neutral-700 hover:text-blue-600 dark:text-neutral-300 dark:hover:text-blue-400"
                  >
                    {{ article.title }}
                  </NuxtLink>
                </li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>

    <!-- Mobile TOC Bottom Tab -->
    <div v-if="showToc && tableOfContents.length > 0" class="fixed bottom-0 left-0 right-0 z-30 lg:hidden">
      <button
        type="button"
        @click="isTocSheetOpen = true"
        class="flex w-full items-center justify-center gap-2 border-t border-neutral-200 bg-white py-3 font-medium text-neutral-700 shadow-lg dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
        Table of Contents
      </button>
    </div>

    <!-- Mobile TOC Bottom Sheet -->
    <BottomSheet v-model:open="isTocSheetOpen" title="Table of Contents">
      <ul class="space-y-3">
        <li v-for="item in tableOfContents" :key="item.id" :class="item.level === 'h3' ? 'ml-4' : ''">
          <button type="button" @click="scrollToHeading(item.id)"
            class="w-full py-2 text-left text-neutral-700 transition-colors hover:text-blue-600 dark:text-neutral-200 dark:hover:text-blue-400">
            {{ item.text }}
          </button>
        </li>
      </ul>
    </BottomSheet>

    <!-- Teleport InlineSearchBox into placeholder (client-side only) -->
    <ClientOnly>
      <Teleport v-if="hasSearchBoxPlaceholder" :to="`#${SEARCH_BOX_PLACEHOLDER_ID}`">
        <InlineSearchBox
          :headline="searchBoxConfig.headline"
          :subtext="searchBoxConfig.subtext"
          :button-text="searchBoxConfig.buttonText"
          :placeholder="searchBoxConfig.placeholder"
        />
      </Teleport>
    </ClientOnly>
  </div>
</template>

