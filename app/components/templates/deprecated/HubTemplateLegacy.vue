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

// Parse metadata for Hub-specific configuration
// Template settings are stored in metadata.template
const metadata = computed(() => {
  const pageMetadata = props.page.metadata as any
  if (!pageMetadata?.template) return null
  return pageMetadata.template as {
    category?: string
    layout?: 'grid' | 'list' | 'featured'
    columns?: 2 | 3 | 4
    showChildGrid?: boolean
    heroImage?: string
    featuredPages?: string[] // Array of page UUIDs
    callToAction?: {
      text: string
      url: string
      style?: 'primary' | 'secondary' | 'outline'
    }
  }
})

// Fetch featured pages from Supabase
const supabase = useSupabaseClient<Database>()
const featuredPages = ref<Page[]>([])

// Watch for metadata changes and fetch featured pages
watch(() => metadata.value?.featuredPages, async (pageIds) => {
  console.log('[HubTemplate] featuredPages watcher triggered:', {
    pageIds,
    metadata: metadata.value
  })

  if (!pageIds || pageIds.length === 0) {
    console.log('[HubTemplate] No featured page IDs, clearing')
    featuredPages.value = []
    return
  }

  console.log('[HubTemplate] Fetching pages with IDs:', pageIds)

  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .in('id', pageIds)
    .eq('status', 'published')

  console.log('[HubTemplate] Supabase response:', { data, error })

  if (data) {
    // Sort by the order in featuredPages array
    featuredPages.value = pageIds
      .map(id => data.find(p => p.id === id))
      .filter((p): p is Page => p !== undefined)

    console.log('[HubTemplate] Featured pages set:', featuredPages.value)
  }
}, { immediate: true })

// Convert featured pages to card format
const featuredCards = computed(() => {
  return featuredPages.value.map((page): { image: string; title: string; description: string; to: string } => ({
    image: page.og_image || 'https://placehold.co/800x450',
    title: page.title,
    description: page.description || 'Learn more about this topic',
    to: page.full_path
  }))
})

// Grid columns configuration
const gridColumns = computed(() => {
  const columns = metadata.value?.columns || 3
  const columnClasses = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-2 lg:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4'
  }
  return columnClasses[columns]
})

// Generate navigation sections from children for sidebar
const navigationSections = computed(() => {
  if (!props.children || props.children.length === 0) return []

  // Group children by their first letter or category
  // For now, we'll create a single section with all children
  return [
    {
      title: 'Topics',
      links: props.children.map(child => ({
        label: child.title,
        to: child.full_path
      }))
    }
  ]
})

// Convert children to topic cards format
const topicCards = computed(() => {
  if (!props.children || props.children.length === 0) return []

  return props.children.map(child => ({
    image: child.og_image || 'https://placehold.co/800x450',
    title: child.title,
    description: child.description || 'Learn more about this topic',
    to: child.full_path
  }))
})

// Check if we should show the child grid
const showChildGrid = computed(() => {
  return metadata.value?.showChildGrid !== false && topicCards.value.length > 0
})

// Format the updated date
const formattedDate = computed(() => {
  if (!props.page.updated_at) return null
  const date = new Date(props.page.updated_at)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
})

// Render markdown content
const { html: renderedContent } = useMarkdown(computed(() => props.page.content || ''))
</script>

<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-900">
    <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <!-- Main Grid: Sidebar (1/4) + Content (3/4) -->
      <div class="grid grid-cols-1 gap-8 lg:grid-cols-4 lg:gap-12">
        <!-- Sidebar Navigation (1/4) -->
        <div v-if="navigationSections.length > 0" class="lg:col-span-1">
          <HubSidebar
            :sections="navigationSections"
            :active-page="page.full_path"
            :sticky="true"
          />
        </div>

        <!-- Main Content Area (3/4) -->
        <article :class="navigationSections.length > 0 ? 'lg:col-span-3' : 'lg:col-span-4'">
          <!-- Breadcrumbs -->
          <div v-if="showBreadcrumbs && breadcrumbs && breadcrumbs.length > 0" class="mb-6">
            <Breadcrumbs :items="breadcrumbs" />
          </div>

          <!-- Hero Section -->
          <section class="mb-12">
            <!-- Eyebrow (if category exists in metadata) -->
            <div v-if="metadata?.category" class="mb-4">
              <Eyebrow
                :text="metadata.category"
                variant="blue-blue"
                size="md"
              />
            </div>

            <!-- Featured Image -->
            <div v-if="page.og_image || metadata?.heroImage" class="relative overflow-hidden rounded-lg">
              <img
                :src="page.og_image || metadata?.heroImage"
                :alt="page.title"
                class="h-auto w-[800px] object-contain"
              />
            </div>
          </section>

          <!-- Introduction / Content -->
          <section v-if="renderedContent" class="mb-12">
            <div class="prose prose-lg max-w-none dark:prose-invert" v-html="renderedContent" />
          </section>

          <!-- Featured Pages Section -->
          <section v-if="featuredCards.length > 0" class="mb-16">
            <!-- Section Heading -->
            <h2 class="mb-8 font-heading text-3xl font-bold text-neutral-900 dark:text-neutral-50 md:text-4xl">
              Featured
            </h2>

            <!-- Featured Cards Grid (3 columns on large displays) -->
            <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              <HubTopicCard
                v-for="card in featuredCards"
                :key="card.to"
                :image="card.image"
                :title="card.title"
                :description="card.description"
                :to="card.to"
              />
            </div>
          </section>

          <!-- Topic Cards Grid Section -->
          <section v-if="showChildGrid" class="mb-16">
            <!-- Section Heading -->
            <h2 class="mb-8 font-heading text-3xl font-bold text-neutral-900 dark:text-neutral-50 md:text-4xl">
              {{ page.title }} Topics
            </h2>

            <!-- Grid of Topic Cards -->
            <div class="grid grid-cols-1 gap-6" :class="gridColumns">
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

          <!-- Call to Action Section -->
          <section
            v-if="metadata?.callToAction"
            class="rounded-lg border border-neutral-200 bg-white p-8 dark:border-neutral-700 dark:bg-neutral-900 md:p-12"
          >
            <!-- Eyebrow -->
            <div class="mb-4">
              <Eyebrow
                text="Ready to Get Started?"
                variant="blue-blue"
                size="md"
              />
            </div>

            <!-- Heading -->
            <h2 class="mb-4 font-heading text-3xl font-bold text-neutral-900 dark:text-neutral-50 md:text-4xl">
              {{ metadata.callToAction.text }}
            </h2>

            <!-- Description -->
            <p class="mb-8 text-lg text-neutral-600 dark:text-neutral-300">
              Connect with experienced landscape professionals in your area. Get free quotes and compare services.
            </p>

            <!-- CTA Buttons -->
            <div class="flex flex-col gap-4 sm:flex-row">
              <Button
                text="Find a Contractor"
                :variant="metadata.callToAction.style === 'primary' ? 'primary' : metadata.callToAction.style === 'secondary' ? 'secondary' : 'primary-outline'"
                size="lg"
                :location="metadata.callToAction.url"
                icon="heroicons:magnifying-glass"
              />
            </div>
          </section>
        </article>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>

