<script setup lang="ts">
import { toast } from 'vue-sonner'

/**
 * Admin: City Listicles Dashboard
 * Route: /admin/ai/city-listicles
 *
 * Manages AI content generation for /[state]/[city]/best-concrete-contractors pages.
 * Shows all cities 30K+ population with contractor count and content status.
 */

definePageMeta({ layout: 'admin' })

useSeoMeta({ title: 'City Listicles', robots: 'noindex, nofollow' })

// Filters
const filterState = ref('')
const filterContent = ref<'all' | 'true' | 'false'>('all')
const search = ref('')
const page = ref(1)
const limit = 50

interface CityListicleRow {
  id: string
  name: string
  slug: string
  stateCode: string
  population: number | null
  contractorCount: number
  content: {
    status: string
    generatedAt: string | null
    wordCount: number | null
  } | null
}

interface AdminCityListiclesResponse {
  cities: CityListicleRow[]
  total: number
  withContent: number
  withoutContent: number
  limit: number
  offset: number
  hasMore: boolean
}

const { data, pending, refresh } = await useFetch<AdminCityListiclesResponse>('/api/admin/city-listicles', {
  query: computed(() => ({
    stateCode: filterState.value || undefined,
    hasContent: filterContent.value !== 'all' ? filterContent.value : undefined,
    limit,
    offset: (page.value - 1) * limit,
    orderBy: 'contractor_count',
    minPopulation: 0
  })),
  watch: [filterState, filterContent, page]
})

const cities = computed(() => data.value?.cities || [])
const totalPages = computed(() => Math.ceil((data.value?.total || 0) / limit))

// Filter cities client-side by name search
const filteredCities = computed(() => {
  if (!search.value) return cities.value
  const q = search.value.toLowerCase()
  return cities.value.filter(c => c.name.toLowerCase().includes(q) || c.stateCode.toLowerCase().includes(q))
})

// Generation
const generatingIds = ref<Set<string>>(new Set())

async function generateContent(city: CityListicleRow) {
  if (generatingIds.value.has(city.id)) return
  generatingIds.value.add(city.id)

  try {
    await $fetch(`/api/admin/city-listicles/${city.id}/generate`, { method: 'POST' })
    toast.success(`Queued: ${city.name}, ${city.stateCode}`, {
      description: 'AI content generation started. Check the article jobs queue for progress.'
    })
    await refresh()
  } catch (err: any) {
    toast.error('Failed to queue', { description: err.data?.message || 'Unknown error' })
  } finally {
    generatingIds.value.delete(city.id)
  }
}

// Batch generate (no content, most contractors first)
const batchRunning = ref(false)
const batchTotal = ref(0)
const batchDone = ref(0)

async function batchGenerate() {
  const targets = filteredCities.value.filter(c => !c.content && c.contractorCount > 0)
  if (targets.length === 0) {
    toast.info('No cities to queue', { description: 'All cities with contractors already have content.' })
    return
  }

  batchRunning.value = true
  batchTotal.value = targets.length
  batchDone.value = 0

  for (const city of targets) {
    try {
      await $fetch(`/api/admin/city-listicles/${city.id}/generate`, { method: 'POST' })
      batchDone.value++
      // Brief pause to avoid overwhelming the queue
      await new Promise(r => setTimeout(r, 500))
    } catch {
      // Continue on error
    }
  }

  batchRunning.value = false
  toast.success(`Queued ${batchDone.value} cities`, {
    description: 'Check the AI article jobs page for progress.'
  })
  await refresh()
}

function statusColor(status: string) {
  switch (status) {
    case 'published': return 'bg-emerald-100 text-emerald-800'
    case 'draft': return 'bg-yellow-100 text-yellow-800'
    default: return 'bg-neutral-100 text-neutral-600'
  }
}

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
]
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">City Listicles</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Generate AI content for <code>/[state]/[city]/best-concrete-contractors</code> pages.
        </p>
      </div>
      <NuxtLink to="/admin/ai" class="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <Icon name="heroicons:arrow-left" class="h-4 w-4" />
        Back to AI Hub
      </NuxtLink>
    </div>

    <!-- Stats Bar -->
    <div v-if="data" class="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div class="rounded-lg border border-border bg-card p-4">
        <p class="text-sm text-muted-foreground">Total Cities</p>
        <p class="text-2xl font-bold">{{ data.total.toLocaleString() }}</p>
      </div>
      <div class="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-900/10">
        <p class="text-sm text-emerald-700 dark:text-emerald-300">Have Content</p>
        <p class="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{{ data.withContent.toLocaleString() }}</p>
      </div>
      <div class="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/10">
        <p class="text-sm text-orange-700 dark:text-orange-300">Need Content</p>
        <p class="text-2xl font-bold text-orange-700 dark:text-orange-300">{{ data.withoutContent.toLocaleString() }}</p>
      </div>
      <div class="rounded-lg border border-border bg-card p-4">
        <p class="text-sm text-muted-foreground">Coverage</p>
        <p class="text-2xl font-bold">
          {{ data.total > 0 ? Math.round((data.withContent / data.total) * 100) : 0 }}%
        </p>
      </div>
    </div>

    <!-- Filters + Batch Actions -->
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <!-- Search -->
      <input
        v-model="search"
        type="text"
        placeholder="Search city..."
        class="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />

      <!-- State filter -->
      <select
        v-model="filterState"
        class="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">All States</option>
        <option v-for="st in US_STATES" :key="st" :value="st">{{ st }}</option>
      </select>

      <!-- Content filter -->
      <select
        v-model="filterContent"
        class="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="all">All cities</option>
        <option value="false">Missing content</option>
        <option value="true">Has content</option>
      </select>

      <div class="ml-auto flex items-center gap-2">
        <!-- Batch generate button -->
        <button
          :disabled="batchRunning || pending"
          class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          @click="batchGenerate"
        >
          <span v-if="batchRunning">Queuing... {{ batchDone }}/{{ batchTotal }}</span>
          <span v-else>Batch Generate (missing)</span>
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

    <!-- Table -->
    <div class="overflow-hidden rounded-lg border border-border bg-card">
      <table class="w-full text-sm">
        <thead class="border-b border-border bg-muted/30">
          <tr>
            <th class="px-4 py-3 text-left font-medium text-muted-foreground">City</th>
            <th class="px-4 py-3 text-left font-medium text-muted-foreground">State</th>
            <th class="px-4 py-3 text-right font-medium text-muted-foreground">Population</th>
            <th class="px-4 py-3 text-right font-medium text-muted-foreground">Contractors</th>
            <th class="px-4 py-3 text-left font-medium text-muted-foreground">Content</th>
            <th class="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-if="pending">
            <td colspan="6" class="py-8 text-center text-muted-foreground">
              <Icon name="heroicons:arrow-path" class="mx-auto h-6 w-6 animate-spin" />
            </td>
          </tr>
          <tr v-else-if="filteredCities.length === 0">
            <td colspan="6" class="py-8 text-center text-muted-foreground">No cities found.</td>
          </tr>
          <tr
            v-for="city in filteredCities"
            :key="city.id"
            class="hover:bg-muted/20"
          >
            <td class="px-4 py-3 font-medium text-foreground">
              <NuxtLink
                :to="`/${city.stateCode.toLowerCase()}/${city.slug}/best-concrete-contractors`"
                target="_blank"
                class="hover:text-blue-600 dark:hover:text-blue-400"
              >
                {{ city.name }}
                <Icon name="heroicons:arrow-top-right-on-square" class="inline h-3 w-3 opacity-50" />
              </NuxtLink>
            </td>
            <td class="px-4 py-3 text-muted-foreground">{{ city.stateCode }}</td>
            <td class="px-4 py-3 text-right text-muted-foreground">
              {{ city.population ? city.population.toLocaleString() : '—' }}
            </td>
            <td class="px-4 py-3 text-right">
              <span :class="city.contractorCount > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'">
                {{ city.contractorCount }}
              </span>
            </td>
            <td class="px-4 py-3">
              <span v-if="city.content" :class="['rounded-full px-2.5 py-0.5 text-xs font-semibold', statusColor(city.content.status)]">
                {{ city.content.status }}
              </span>
              <span v-else class="text-xs text-muted-foreground">—</span>
            </td>
            <td class="px-4 py-3">
              <button
                :disabled="generatingIds.has(city.id) || city.contractorCount === 0"
                class="rounded-md bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                :title="city.contractorCount === 0 ? 'No contractors in this city yet' : ''"
                @click="generateContent(city)"
              >
                <Icon v-if="generatingIds.has(city.id)" name="heroicons:arrow-path" class="h-3 w-3 animate-spin" />
                <span v-else>{{ city.content ? 'Regenerate' : 'Generate' }}</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="mt-4 flex items-center justify-center gap-2">
      <button
        :disabled="page <= 1"
        class="rounded-lg border border-input px-3 py-1.5 text-sm disabled:opacity-50"
        @click="page--"
      >
        Previous
      </button>
      <span class="text-sm text-muted-foreground">Page {{ page }} of {{ totalPages }}</span>
      <button
        :disabled="!data?.hasMore"
        class="rounded-lg border border-input px-3 py-1.5 text-sm disabled:opacity-50"
        @click="page++"
      >
        Next
      </button>
    </div>
  </div>
</template>
