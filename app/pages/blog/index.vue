<script setup lang="ts">
definePageMeta({ layout: 'default' })

const config = useRuntimeConfig()
const siteUrl = config.public.siteUrl || 'https://costoflandscaping.com'

useSeoMeta({
  title: 'landscaping Blog — Cost Guides, How-To, and Tips',
  description: 'Expert landscaping cost guides, step-by-step tutorials, maintenance tips, and advice on hiring the right contractor.',
  ogTitle: 'landscaping Blog — Cost Guides, How-To, and Tips',
  ogDescription: 'Expert landscaping cost guides, step-by-step tutorials, maintenance tips, and contractor hiring advice.',
  ogType: 'website',
  ogUrl: `${siteUrl}/blog`,
})

useHead({
  link: [{ rel: 'canonical', href: `${siteUrl}/blog` }],
})

const LIMIT = 24
const offset = ref(0)

const { data, refresh } = await useFetch('/api/public/blog', {
  query: computed(() => ({ limit: LIMIT, offset: offset.value })),
  key: computed(() => `blog-${offset.value}`),
})

const articles = computed(() => data.value?.articles || [])
const total = computed(() => data.value?.total || 0)
const hasMore = computed(() => data.value?.hasMore || false)

const CATEGORIES = [
  { label: 'Cost Guides', slug: 'cost_guide' },
  { label: 'How-To', slug: 'how_to' },
  { label: 'Comparisons', slug: 'comparison' },
  { label: 'Maintenance', slug: 'maintenance' },
  { label: 'Hiring Tips', slug: 'local_seo' },
]

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="border-b border-neutral-200 bg-white py-12 dark:border-neutral-800 dark:bg-neutral-950">
      <div class="mx-auto max-w-6xl px-4">
        <p class="mb-2 text-sm font-semibold uppercase tracking-widest text-amber-500">landscaping Blog</p>
        <h1 class="font-heading text-4xl font-bold text-neutral-900 dark:text-white md:text-5xl">
          Cost Guides, How-To's<br class="hidden sm:block" /> & Expert Tips
        </h1>
        <p class="mt-4 max-w-2xl text-lg text-neutral-600 dark:text-neutral-400">
          Everything homeowners need to know about landscape projects — from pricing to hiring the right contractor.
        </p>
      </div>
    </section>

    <div class="mx-auto max-w-6xl px-4 py-12">
      <!-- Article grid -->
      <div v-if="articles.length > 0" class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <NuxtLink
          v-for="article in articles"
          :key="article.id"
          :to="article.path"
          class="group flex flex-col rounded-2xl border border-neutral-200 bg-white transition-shadow hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
        >
          <!-- Image placeholder or og_image -->
          <div class="aspect-[16/9] overflow-hidden rounded-t-2xl bg-neutral-100 dark:bg-neutral-800">
            <img
              v-if="article.image"
              :src="article.image"
              :alt="article.title"
              class="h-full w-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
            <div v-else class="flex h-full items-center justify-center">
              <Icon name="heroicons:document-text" class="h-12 w-12 text-neutral-300 dark:text-neutral-600" />
            </div>
          </div>

          <div class="flex flex-1 flex-col gap-3 p-5">
            <!-- Tags -->
            <div v-if="article.tags?.length" class="flex flex-wrap gap-1.5">
              <span
                v-for="tag in article.tags"
                :key="tag"
                class="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
              >
                {{ tag }}
              </span>
            </div>

            <h2 class="font-heading text-base font-bold leading-snug text-neutral-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
              {{ article.title }}
            </h2>

            <p v-if="article.excerpt" class="flex-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              {{ article.excerpt.length > 120 ? article.excerpt.slice(0, 120) + '…' : article.excerpt }}
            </p>

            <p v-if="article.publishedAt" class="mt-auto text-xs text-neutral-400">
              {{ formatDate(article.publishedAt) }}
            </p>
          </div>
        </NuxtLink>
      </div>

      <!-- Empty state (before articles are generated) -->
      <div v-else class="flex flex-col items-center gap-4 py-24 text-center">
        <Icon name="heroicons:pencil-square" class="h-16 w-16 text-neutral-300 dark:text-neutral-700" />
        <p class="text-lg font-semibold text-neutral-600 dark:text-neutral-400">Articles coming soon</p>
        <p class="text-sm text-neutral-400">Our team is generating expert landscaping guides. Check back shortly.</p>
      </div>

      <!-- Pagination -->
      <div v-if="total > LIMIT" class="mt-10 flex items-center justify-between text-sm text-neutral-500">
        <p>{{ total }} articles</p>
        <div class="flex gap-2">
          <button
            :disabled="offset === 0"
            class="rounded-lg border border-neutral-200 px-4 py-2 hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-700 dark:hover:bg-neutral-800"
            @click="offset = Math.max(0, offset - LIMIT)"
          >
            ← Previous
          </button>
          <button
            :disabled="!hasMore"
            class="rounded-lg border border-neutral-200 px-4 py-2 hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-700 dark:hover:bg-neutral-800"
            @click="offset += LIMIT"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
