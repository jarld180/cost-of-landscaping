<script setup lang="ts">
import { toast } from 'vue-sonner'

/**
 * Admin: Article Keywords
 * Route: /admin/ai/article-keywords
 *
 * Manage the master keyword list and batch-queue AI article generation.
 * 200+ pre-seeded keywords across categories: cost guides, how-to, comparisons, etc.
 */

definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'Article Keywords', robots: 'noindex, nofollow' })

const CATEGORIES = ['all', 'cost_guide', 'how_to', 'comparison', 'type', 'problem', 'maintenance', 'local_seo', 'general']
const STATUSES = ['all', 'pending', 'queued', 'completed', 'skipped']
const CATEGORY_LABELS: Record<string, string> = {
  all: 'All', cost_guide: 'Cost Guides', how_to: 'How-To', comparison: 'Comparisons',
  type: 'Concrete Types', problem: 'Problems', maintenance: 'Maintenance',
  local_seo: 'Local SEO', general: 'General'
}

const filterCategory = ref('all')
const filterStatus = ref('all')
const search = ref('')
const page = ref(1)
const limit = 50

interface Keyword {
  id: string
  keyword: string
  category: string
  priority: number
  status: string
  job_id: string | null
  queued_at: string | null
  completed_at: string | null
  article_context: string | null
}

interface KeywordsResponse {
  keywords: Keyword[]
  total: number
  statusCounts: Record<string, number>
  limit: number
  offset: number
  hasMore: boolean
}

const { data, pending, refresh } = await useFetch<KeywordsResponse>('/api/admin/article-keywords', {
  query: computed(() => ({
    category: filterCategory.value !== 'all' ? filterCategory.value : undefined,
    status: filterStatus.value !== 'all' ? filterStatus.value : undefined,
    limit,
    offset: (page.value - 1) * limit
  })),
  watch: [filterCategory, filterStatus, page]
})

const keywords = computed(() => {
  const kws = data.value?.keywords || []
  if (!search.value) return kws
  const q = search.value.toLowerCase()
  return kws.filter(k => k.keyword.toLowerCase().includes(q))
})

const totalPages = computed(() => Math.ceil((data.value?.total || 0) / limit))
const statusCounts = computed(() => data.value?.statusCounts || {})

// Batch queue
const batchRunning = ref(false)
const batchResult = ref<{ queued: number; total: number } | null>(null)

async function batchQueue(batchLimit = 50) {
  batchRunning.value = true
  batchResult.value = null
  try {
    const result = await $fetch<{ queued: number; total: number; message: string }>(
      '/api/admin/article-keywords/batch-queue',
      { method: 'POST', body: { limit: batchLimit } }
    )
    batchResult.value = result
    toast.success(`Queued ${result.queued} articles`, { description: result.message })
    await refresh()
  } catch (err: any) {
    toast.error('Batch queue failed', { description: err.data?.message || 'Unknown error' })
  } finally {
    batchRunning.value = false
  }
}

function statusColor(status: string) {
  switch (status) {
    case 'completed': return 'bg-emerald-100 text-emerald-800'
    case 'queued': return 'bg-blue-100 text-blue-800'
    case 'pending': return 'bg-neutral-100 text-neutral-600'
    case 'skipped': return 'bg-yellow-100 text-yellow-800'
    default: return 'bg-neutral-100 text-neutral-600'
  }
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">Article Keywords</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Master keyword list for AI article generation. 200+ pre-seeded across 8 categories.
        </p>
      </div>
      <NuxtLink to="/admin/ai" class="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <Icon name="heroicons:arrow-left" class="h-4 w-4" /> Back to AI Hub
      </NuxtLink>
    </div>

    <!-- Status Stats -->
    <div class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800">
        <p class="text-sm text-muted-foreground">Pending</p>
        <p class="text-2xl font-bold text-neutral-700 dark:text-neutral-300">{{ statusCounts.pending || 0 }}</p>
      </div>
      <div class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/10">
        <p class="text-sm text-blue-600 dark:text-blue-400">Queued</p>
        <p class="text-2xl font-bold text-blue-700 dark:text-blue-300">{{ statusCounts.queued || 0 }}</p>
      </div>
      <div class="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-900/10">
        <p class="text-sm text-emerald-600 dark:text-emerald-400">Completed</p>
        <p class="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{{ statusCounts.completed || 0 }}</p>
      </div>
      <div class="rounded-lg border border-border bg-card p-4">
        <p class="text-sm text-muted-foreground">Coverage</p>
        <p class="text-2xl font-bold">
          {{ data ? Math.round(((statusCounts.completed || 0) / (Object.values(statusCounts).reduce((a, b) => a + b, 0) || 1)) * 100) : 0 }}%
        </p>
      </div>
    </div>

    <!-- Actions Bar -->
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <input
        v-model="search"
        type="text"
        placeholder="Search keywords..."
        class="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <select
        v-model="filterCategory"
        class="rounded-lg border border-input bg-background px-3 py-2 text-sm"
      >
        <option v-for="c in CATEGORIES" :key="c" :value="c">{{ CATEGORY_LABELS[c] }}</option>
      </select>
      <select
        v-model="filterStatus"
        class="rounded-lg border border-input bg-background px-3 py-2 text-sm"
      >
        <option v-for="s in STATUSES" :key="s" :value="s">{{ s.charAt(0).toUpperCase() + s.slice(1) }}</option>
      </select>

      <div class="ml-auto flex items-center gap-2">
        <button
          :disabled="batchRunning || (statusCounts.pending || 0) === 0"
          class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          @click="batchQueue(25)"
        >
          <span v-if="batchRunning">Queuing...</span>
          <span v-else>Queue Next 25</span>
        </button>
        <button
          :disabled="batchRunning || (statusCounts.pending || 0) === 0"
          class="rounded-lg border border-input bg-background px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
          @click="batchQueue(50)"
        >
          Queue 50
        </button>
        <button
          :disabled="pending"
          class="rounded-lg border border-input bg-background px-3 py-2 text-sm hover:bg-muted"
          @click="refresh()"
        >
          <Icon name="heroicons:arrow-path" :class="['h-4 w-4', pending && 'animate-spin']" />
        </button>
      </div>
    </div>

    <!-- Note about pipeline -->
    <div class="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-900/10 dark:text-blue-300">
      <strong>How it works:</strong> Queuing creates AI article jobs that run through the 7-agent pipeline (research → outline → writer → SEO → QA → project manager → publish). Track progress in
      <NuxtLink to="/admin/ai/article-writing" class="font-semibold underline">Article Writing</NuxtLink>.
      Start with 25 at a time to monitor quality before bulk-queuing all 200+.
    </div>

    <!-- Keywords Table -->
    <div class="overflow-hidden rounded-lg border border-border bg-card">
      <table class="w-full text-sm">
        <thead class="border-b border-border bg-muted/30">
          <tr>
            <th class="px-4 py-3 text-left font-medium text-muted-foreground">Keyword</th>
            <th class="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
            <th class="px-4 py-3 text-right font-medium text-muted-foreground">Priority</th>
            <th class="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
            <th class="px-4 py-3 text-left font-medium text-muted-foreground">Queued</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-if="pending">
            <td colspan="5" class="py-8 text-center">
              <Icon name="heroicons:arrow-path" class="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
            </td>
          </tr>
          <tr v-else-if="keywords.length === 0">
            <td colspan="5" class="py-8 text-center text-muted-foreground">No keywords found.</td>
          </tr>
          <tr v-for="kw in keywords" :key="kw.id" class="hover:bg-muted/20">
            <td class="px-4 py-3">
              <span class="font-medium text-foreground">{{ kw.keyword }}</span>
              <p v-if="kw.article_context" class="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{{ kw.article_context }}</p>
            </td>
            <td class="px-4 py-3 text-xs text-muted-foreground">{{ CATEGORY_LABELS[kw.category] || kw.category }}</td>
            <td class="px-4 py-3 text-right text-muted-foreground">{{ kw.priority }}</td>
            <td class="px-4 py-3">
              <span :class="['rounded-full px-2.5 py-0.5 text-xs font-semibold', statusColor(kw.status)]">
                {{ kw.status }}
              </span>
            </td>
            <td class="px-4 py-3 text-xs text-muted-foreground">
              {{ kw.queued_at ? new Date(kw.queued_at).toLocaleDateString() : '—' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="mt-4 flex items-center justify-center gap-2">
      <button :disabled="page <= 1" class="rounded-lg border border-input px-3 py-1.5 text-sm disabled:opacity-50" @click="page--">Previous</button>
      <span class="text-sm text-muted-foreground">Page {{ page }} of {{ totalPages }}</span>
      <button :disabled="!data?.hasMore" class="rounded-lg border border-input px-3 py-1.5 text-sm disabled:opacity-50" @click="page++">Next</button>
    </div>
  </div>
</template>
