<script setup lang="ts">
import type { Database } from '~/types/supabase'

type Page = Database['public']['Tables']['pages']['Row']

interface Props {
  /**
   * The page data to display
   */
  page: Page

  /**
   * Child pages to display in the topic cards grid
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

// Parse metadata for Sub-Spoke-specific configuration
// Template settings are stored in metadata.template
const metadata = computed(() => {
  const pageMetadata = props.page.metadata as any
  if (!pageMetadata?.template) return null
  return pageMetadata.template as {
    category?: string
    showTableOfContents?: boolean
    showChildList?: boolean
    layout?: 'grid' | 'list'
    columns?: 2 | 3 | 4
    callToAction?: {
      text: string
      url: string
      style?: 'primary' | 'secondary' | 'outline'
    }
  }
})

// Grid columns configuration
const gridColumns = computed(() => {
  const columns = metadata.value?.columns || 2
  return {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4'
  }[columns]
})

// Convert children to topic cards format
const topicCards = computed(() => {
  if (!props.children || props.children.length === 0) return []

  return props.children.map(child => ({
    image: child.og_image || 'https://placehold.co/600x400',
    title: child.title,
    description: child.description || 'Learn more about this topic',
    to: child.full_path
  }))
})

// Render markdown content
const { html: renderedContent } = useMarkdown(computed(() => props.page.content || ''))

// Format updated date
const formattedDate = computed(() => {
  if (!props.page.updated_at) return ''
  return new Date(props.page.updated_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

// Determine if we should show child list/grid
const showChildList = computed(() => {
  return metadata.value?.showChildList !== false && topicCards.value.length > 0
})
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

          <!-- Updated Date -->
          <div
            v-if="formattedDate"
            class="text-sm text-neutral-500 dark:text-neutral-400"
          >
            Last updated: {{ formattedDate }}
          </div>
        </section>

        <!-- Main Content (Markdown) -->
        <section
          v-if="renderedContent"
          class="prose prose-lg prose-neutral mx-auto mb-12 max-w-none dark:prose-invert prose-headings:font-heading prose-headings:font-bold prose-a:text-blue-600 hover:prose-a:text-blue-700 dark:prose-a:text-blue-400 dark:hover:prose-a:text-blue-300"
          v-html="renderedContent"
        />

        <!-- Child Pages Section -->
        <section v-if="showChildList && topicCards.length > 0" class="mb-12">
          <h2 class="mb-8 font-heading text-3xl font-bold text-neutral-900 dark:text-neutral-50">
            Related Articles
          </h2>

          <!-- Topic Cards Grid -->
          <div
            class="grid grid-cols-1 gap-6"
            :class="gridColumns"
          >
            <HubTopicCard
              v-for="card in topicCards"
              :key="card.to"
              :image="card.image"
              :title="card.title"
              :description="card.description"
              :to="card.to"
            />
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

