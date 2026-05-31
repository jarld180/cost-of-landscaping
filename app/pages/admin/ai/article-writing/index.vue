<script setup lang="ts">
/**
 * AI Article Writing - Job List
 *
 * Create new article generation jobs and view/manage existing jobs.
 */
import { z } from 'zod'
import { toast } from 'vue-sonner'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import CountUp from 'vue-countup-v3'

definePageMeta({
  layout: 'admin'
})

// =====================================================
// FORM SCHEMA
// =====================================================

const parseKeywords = (value: string): string[] => {
  return value
    .split(',')
    .map(kw => kw.trim())
    .filter(kw => kw.length > 0)
    .filter((kw, i, arr) => arr.indexOf(kw) === i)
}

// Note: Avoid using .default() as it causes issues with @vee-validate/zod and Zod 4
// Use initialValues in useForm instead
const createJobSchema = z.object({
  keyword: z.string().min(2, 'Keyword must be at least 2 characters').max(200),
  articleContext: z.string().min(10, 'Context must be at least 10 characters').max(500, 'Context must be at most 500 characters'),
  secondaryKeywords: z.string().superRefine((val, ctx) => {
    const parsed = parseKeywords(val)
    if (parsed.length < 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Must provide at least 5 unique keywords (currently ${parsed.length})`,
      })
    }
    if (parsed.length > 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Must provide at most 10 unique keywords (currently ${parsed.length})`,
      })
    }
  }),
  autoPost: z.boolean(),
  targetWordCount: z.coerce.number().int().min(0).max(10000),
  generateImages: z.boolean(),
  maxImages: z.coerce.number().int().min(0).max(10),
  imageStyle: z.enum(['vivid', 'natural']),
  imageModel: z.enum(['dall-e-2', 'dall-e-3']),
})

type CreateJobInput = z.infer<typeof createJobSchema>

// =====================================================
// FORM SETUP
// =====================================================

const { handleSubmit, errors, defineField, resetForm, isSubmitting } = useForm({
  validationSchema: toTypedSchema(createJobSchema),
  initialValues: {
    keyword: '',
    articleContext: '',
    secondaryKeywords: '',
    autoPost: false,
    targetWordCount: 0,
    generateImages: false,
    maxImages: 3,
    imageStyle: 'natural' as const,
    imageModel: 'dall-e-3' as const,
  }
})

const [keyword] = defineField('keyword')
const [articleContext] = defineField('articleContext')
const [secondaryKeywords] = defineField('secondaryKeywords')
const [autoPost] = defineField('autoPost')
const [targetWordCount] = defineField('targetWordCount')
const [generateImages] = defineField('generateImages')
const [maxImages] = defineField('maxImages')
const [imageStyle] = defineField('imageStyle')
const [imageModel] = defineField('imageModel')

const estimatedImageCost = computed(() => {
  const costPerImage = imageModel.value === 'dall-e-2' ? 0.02 : 0.08
  return (Number(maxImages.value) * costPerImage).toFixed(2)
})

// =====================================================
// DATA FETCHING
// =====================================================

// Status filter
const statusFilter = ref<string>('all')
const page = ref(1)
const limit = 20

// Fetch jobs
const { data: jobsData, pending, error, refresh } = await useFetch('/api/ai/articles', {
  query: computed(() => ({
    status: statusFilter.value === 'all' ? undefined : statusFilter.value,
    limit,
    offset: (page.value - 1) * limit,
  })),
  watch: [statusFilter, page],
  lazy: true,
})

// Fetch stats for counters
const { data: statsData } = await useFetch('/api/ai/stats', { lazy: true })

const jobs = computed(() => jobsData.value?.jobs ?? [])
const total = computed(() => jobsData.value?.total ?? 0)
const stats = computed(() => statsData.value?.stats ?? { total: 0, pending: 0, processing: 0, completed: 0, failed: 0 })
const totalPages = computed(() => Math.ceil(total.value / limit))

// =====================================================
// JOB CREATION
// =====================================================

const onSubmit = handleSubmit(async (values: CreateJobInput) => {
  try {
    await $fetch('/api/ai/articles', {
      method: 'POST',
      body: {
        keyword: values.keyword,
        settings: {
          articleContext: values.articleContext,
          secondaryKeywords: parseKeywords(values.secondaryKeywords),
          autoPost: values.autoPost,
          targetWordCount: values.targetWordCount,
          generateImages: values.generateImages,
          maxImages: values.maxImages,
          imageStyle: values.imageStyle,
          imageModel: values.imageModel,
        },
      },
    })
    toast.success('Article job created!', { description: `Keyword: ${values.keyword}` })
    resetForm()
    refresh()
  } catch (err: any) {
    toast.error('Failed to create job', { description: err?.data?.message || err?.message })
  }
})

// =====================================================
// JOB ACTIONS
// =====================================================

const cancellingId = ref<string | null>(null)
const retryingId = ref<string | null>(null)

async function cancelJob(jobId: string) {
  try {
    cancellingId.value = jobId
    await $fetch(`/api/ai/articles/${jobId}/cancel`, { method: 'POST' })
    toast.success('Job cancelled')
    refresh()
  } catch (err: any) {
    toast.error('Failed to cancel job', { description: err?.data?.message || err?.message })
  } finally {
    cancellingId.value = null
  }
}

async function retryJob(jobId: string) {
  try {
    retryingId.value = jobId
    await $fetch(`/api/ai/articles/${jobId}/retry`, { method: 'POST' })
    toast.success('Job restarted', { description: 'The job is now processing again' })
    refresh()
  } catch (err: any) {
    toast.error('Failed to retry job', { description: err?.data?.message || err?.message })
  } finally {
    retryingId.value = null
  }
}

// =====================================================
// STATUS HELPERS
// =====================================================

function getStatusVariant(status: string) {
  switch (status) {
    case 'completed': return 'success'
    case 'processing': return 'info'
    case 'pending': return 'secondary'
    case 'failed': return 'destructive'
    case 'cancelled': return 'outline'
    default: return 'secondary'
  }
}

function getAgentLabel(agent: string | null) {
  if (!agent) return '-'
  return agent.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatDate(dateString: string | null) {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString()
}
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold">Article Writing</h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Create and manage AI-generated articles
      </p>
    </div>

    <!-- Stats Row -->
    <div class="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
      <UiCard class="p-3">
        <div class="text-xs text-muted-foreground">Total</div>
        <div class="text-xl font-semibold tabular-nums"><CountUp :end-val="stats.total" /></div>
      </UiCard>
      <UiCard class="p-3">
        <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span class="relative flex size-2">
            <span class="absolute inline-flex size-full animate-ping rounded-full bg-blue-400 opacity-75" />
            <span class="relative inline-flex size-2 rounded-full bg-blue-500" />
          </span>
          Processing
        </div>
        <div class="text-xl font-semibold tabular-nums text-blue-600 dark:text-blue-400">
          <CountUp :end-val="stats.processing" />
        </div>
      </UiCard>
      <UiCard class="p-3">
        <div class="text-xs text-muted-foreground">Pending</div>
        <div class="text-xl font-semibold tabular-nums text-amber-600 dark:text-amber-400">
          <CountUp :end-val="stats.pending" />
        </div>
      </UiCard>
      <UiCard class="p-3">
        <div class="text-xs text-muted-foreground">Completed</div>
        <div class="text-xl font-semibold tabular-nums text-green-600 dark:text-green-400">
          <CountUp :end-val="stats.completed" />
        </div>
      </UiCard>
      <UiCard class="p-3">
        <div class="text-xs text-muted-foreground">Failed</div>
        <div class="text-xl font-semibold tabular-nums text-red-600 dark:text-red-400">
          <CountUp :end-val="stats.failed" />
        </div>
      </UiCard>
    </div>

    <!-- Create Job Form -->
    <UiCard class="mb-6">
      <UiCardHeader class="pb-4">
        <UiCardTitle class="text-base">Create New Article</UiCardTitle>
      </UiCardHeader>
      <UiCardContent>
        <form class="space-y-4" @submit="onSubmit">
          <div class="grid gap-4 md:grid-cols-3">
            <!-- Keyword -->
            <div class="md:col-span-2">
              <label for="keyword" class="mb-1.5 block text-sm font-medium">Target Keyword</label>
              <UiInput
                id="keyword"
                v-model="keyword"
                placeholder="e.g., concrete driveway cost"
                :class="{ 'border-destructive': errors.keyword }"
              />
              <p v-if="errors.keyword" class="mt-1 text-xs text-destructive">{{ errors.keyword }}</p>
            </div>

            <!-- Target Word Count -->
            <div>
              <label for="targetWordCount" class="mb-1.5 block text-sm font-medium">Word Count</label>
              <UiInput
                id="targetWordCount"
                v-model="targetWordCount"
                type="number"
                placeholder="0 = auto"
                min="0"
                max="10000"
              />
              <p class="mt-1 text-xs text-muted-foreground">0 = determined by research</p>
            </div>

            <!-- Article Context -->
            <div class="md:col-span-3">
              <label for="articleContext" class="mb-1.5 block text-sm font-medium">Article Context</label>
              <UiTextarea
                id="articleContext"
                v-model="articleContext"
                placeholder="e.g., Focus on DIY homeowners looking for cost-effective solutions"
                :class="{ 'border-destructive': errors.articleContext }"
                rows="3"
              />
              <p v-if="errors.articleContext" class="mt-1 text-xs text-destructive">{{ errors.articleContext }}</p>
              <p v-else class="mt-1 text-xs text-muted-foreground">Brief angle or focus for the article (10-500 characters)</p>
            </div>

            <!-- Secondary Keywords -->
            <div class="md:col-span-3">
              <label for="secondaryKeywords" class="mb-1.5 block text-sm font-medium">Secondary Keywords</label>
              <UiTextarea
                id="secondaryKeywords"
                v-model="secondaryKeywords"
                placeholder="e.g., concrete cost, driveway installation, concrete contractors, DIY concrete"
                :class="{ 'border-destructive': errors.secondaryKeywords }"
                rows="3"
              />
              <p v-if="errors.secondaryKeywords" class="mt-1 text-xs text-destructive">{{ errors.secondaryKeywords }}</p>
              <p v-else class="mt-1 text-xs text-muted-foreground">Enter 5-10 related keywords separated by commas</p>
            </div>
          </div>

          <!-- Image Generation Settings -->
          <div class="space-y-4 border-t pt-4 mt-4">
            <div class="flex items-center gap-2">
              <label class="flex cursor-pointer items-center gap-2">
                <UiCheckbox v-model="generateImages" />
                <span class="text-sm font-medium">Generate AI images for headings</span>
              </label>
              <UiTooltip>
                <UiTooltipTrigger as-child>
                  <Icon name="heroicons:information-circle" class="h-4 w-4 text-muted-foreground cursor-help" />
                </UiTooltipTrigger>
                <UiTooltipContent>
                  <p>This agent uses GPT-4o-mini to generate image prompts, then the selected DALL-E model to create images.</p>
                </UiTooltipContent>
              </UiTooltip>
            </div>

            <div v-if="generateImages" class="grid gap-4 md:grid-cols-2 pl-6">
              <!-- Max Images -->
              <div>
                <label class="mb-1.5 block text-sm font-medium">Maximum images</label>
                <UiInput v-model="maxImages" type="number" min="0" max="10" />
                <p class="mt-1 text-xs text-muted-foreground">0-10 images per article</p>
              </div>

              <!-- Image Style (native radio, following MenuForm.vue pattern) -->
              <div class="space-y-2">
                <label class="text-sm font-medium">DALL-E Model</label>
                <UiSelect v-model="imageModel">
                  <UiSelectTrigger>
                    <UiSelectValue />
                  </UiSelectTrigger>
                  <UiSelectContent>
                    <UiSelectItem value="dall-e-2">DALL-E 2 ($0.02/image, faster)</UiSelectItem>
                    <UiSelectItem value="dall-e-3">DALL-E 3 ($0.08/image, better quality)</UiSelectItem>
                  </UiSelectContent>
                </UiSelect>
              </div>

              <div v-if="imageModel === 'dall-e-3'">
                <label class="mb-1.5 block text-sm font-medium">Style</label>
                <div class="flex gap-4">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="radio" v-model="imageStyle" value="natural" class="accent-primary">
                    <span class="text-sm">Natural</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="radio" v-model="imageStyle" value="vivid" class="accent-primary">
                    <span class="text-sm">Vivid</span>
                  </label>
                </div>
              </div>

              <!-- Cost Estimate -->
              <div class="md:col-span-2">
                <p class="text-sm text-muted-foreground">
                  Estimated image cost: <span class="font-medium">${{ estimatedImageCost }}</span>
                  <span class="text-xs ml-1">({{ maxImages }} images × ${{ imageModel === 'dall-e-2' ? '0.02' : '0.08' }})</span>
                </p>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between">
            <!-- Auto-post toggle -->
            <label class="flex cursor-pointer items-center gap-2">
              <UiCheckbox v-model="autoPost" />
              <span class="text-sm">Auto-publish when complete</span>
            </label>

            <UiButton type="submit" :disabled="isSubmitting">
              <Icon v-if="isSubmitting" name="i-lucide-loader-2" class="mr-1.5 size-4 animate-spin" />
              <Icon v-else name="i-lucide-plus" class="mr-1.5 size-4" />
              Create Job
            </UiButton>
          </div>
        </form>
      </UiCardContent>
    </UiCard>

    <!-- Jobs List -->
    <UiCard>
      <UiCardHeader class="flex-row items-center justify-between pb-4">
        <UiCardTitle class="text-base">Recent Jobs</UiCardTitle>
        <div class="flex items-center gap-2">
          <UiSelect v-model="statusFilter" class="w-32">
            <UiSelectTrigger>
              <UiSelectValue placeholder="Filter" />
            </UiSelectTrigger>
            <UiSelectContent>
              <UiSelectItem value="all">All</UiSelectItem>
              <UiSelectItem value="pending">Pending</UiSelectItem>
              <UiSelectItem value="processing">Processing</UiSelectItem>
              <UiSelectItem value="completed">Completed</UiSelectItem>
              <UiSelectItem value="failed">Failed</UiSelectItem>
              <UiSelectItem value="cancelled">Cancelled</UiSelectItem>
            </UiSelectContent>
          </UiSelect>
          <UiButton variant="outline" size="icon" :disabled="pending" @click="refresh()">
            <Icon name="i-lucide-refresh-cw" :class="['size-4', { 'animate-spin': pending }]" />
          </UiButton>
        </div>
      </UiCardHeader>
      <UiCardContent class="p-0">
        <!-- Error State -->
        <div v-if="error" class="p-6 text-center">
          <Icon name="i-lucide-alert-triangle" class="mx-auto mb-2 size-8 text-destructive" />
          <p class="text-sm text-destructive">{{ error.message }}</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="!pending && jobs.length === 0" class="p-6 text-center">
          <Icon name="i-lucide-file-text" class="mx-auto mb-2 size-8 text-muted-foreground/50" />
          <p class="text-sm text-muted-foreground">No jobs found</p>
        </div>

        <!-- Jobs Table -->
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="border-b bg-muted/50 text-left">
              <tr>
                <th class="px-4 py-2 font-medium">Keyword</th>
                <th class="px-4 py-2 font-medium">Status</th>
                <th class="px-4 py-2 font-medium">Agent</th>
                <th class="px-4 py-2 font-medium">Progress</th>
                <th class="px-4 py-2 font-medium">Created</th>
                <th class="px-4 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="job in jobs" :key="job.id" class="border-b last:border-0">
                <td class="px-4 py-3 font-medium">{{ job.keyword }}</td>
                <td class="px-4 py-3">
                  <UiBadge :variant="getStatusVariant(job.status)">{{ job.status }}</UiBadge>
                </td>
                <td class="px-4 py-3 text-muted-foreground">{{ getAgentLabel(job.currentAgent) }}</td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <div class="h-2 w-16 overflow-hidden rounded-full bg-muted">
                      <div
                        class="h-full bg-primary transition-all"
                        :style="{ width: `${job.progressPercent}%` }"
                      />
                    </div>
                    <span class="text-xs text-muted-foreground">{{ job.progressPercent }}%</span>
                  </div>
                </td>
                <td class="whitespace-nowrap px-4 py-3 text-muted-foreground">
                  {{ formatDate(job.createdAt) }}
                </td>
                <td class="px-4 py-3 text-right">
                  <div class="flex items-center justify-end gap-1">
                    <NuxtLink :to="`/admin/ai/article-writing/${job.id}`">
                      <UiButton variant="ghost" size="icon" class="size-8">
                        <Icon name="i-lucide-eye" class="size-4" />
                      </UiButton>
                    </NuxtLink>
                    <UiButton
                      v-if="job.status === 'pending' || job.status === 'processing'"
                      variant="ghost"
                      size="icon"
                      class="size-8 text-destructive hover:text-destructive"
                      :disabled="cancellingId === job.id"
                      @click="cancelJob(job.id)"
                    >
                      <Icon
                        :name="cancellingId === job.id ? 'i-lucide-loader-2' : 'i-lucide-x'"
                        :class="['size-4', { 'animate-spin': cancellingId === job.id }]"
                      />
                    </UiButton>
                    <UiButton
                      v-if="job.status === 'failed' || job.status === 'cancelled'"
                      variant="ghost"
                      size="icon"
                      class="size-8"
                      :disabled="retryingId === job.id"
                      @click="retryJob(job.id)"
                    >
                      <Icon
                        :name="retryingId === job.id ? 'i-lucide-loader-2' : 'i-lucide-refresh-cw'"
                        :class="['size-4', { 'animate-spin': retryingId === job.id }]"
                      />
                    </UiButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="flex items-center justify-between border-t px-4 py-3">
          <p class="text-sm text-muted-foreground">
            Showing {{ (page - 1) * limit + 1 }} - {{ Math.min(page * limit, total) }} of {{ total }}
          </p>
          <div class="flex gap-1">
            <UiButton variant="outline" size="sm" :disabled="page <= 1" @click="page--">
              Previous
            </UiButton>
            <UiButton variant="outline" size="sm" :disabled="page >= totalPages" @click="page++">
              Next
            </UiButton>
          </div>
        </div>
      </UiCardContent>
    </UiCard>
  </div>
</template>

