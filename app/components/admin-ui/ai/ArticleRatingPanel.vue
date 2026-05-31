<script setup lang="ts">
/**
 * ArticleRatingPanel - Human evaluation panel for AI articles
 *
 * Provides 5-star ratings for each dimension, issue tagging,
 * and ability to mark as golden example.
 */
 import { toast } from 'vue-sonner'

interface EvalDimensionScores {
  readability: number
  seo: number
  accuracy: number
  engagement: number
  brandVoice: number
}

interface EvalIssue {
  category: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  suggestion: string
}

interface ArticleEval {
  id: string
  evalType: 'automated' | 'human'
  iteration?: number
  overallScore: number | null
  dimensionScores: EvalDimensionScores | null
  passed: boolean | null
  feedback: string | null
  issues: EvalIssue[]
  ratedBy: string | null
  ratedAt: string | null
}

const props = defineProps<{
  jobId: string
  jobStatus: string
  keyword: string
  existingEvals: ArticleEval[]
}>()

const emit = defineEmits<{
  evalCreated: [eval: ArticleEval]
  goldenCreated: []
}>()

// Rating dimensions
const DIMENSIONS = [
  { key: 'readability', label: 'Readability', icon: 'i-lucide-book-open' },
  { key: 'seo', label: 'SEO', icon: 'i-lucide-search' },
  { key: 'accuracy', label: 'Accuracy', icon: 'i-lucide-check-circle' },
  { key: 'engagement', label: 'Engagement', icon: 'i-lucide-heart' },
  { key: 'brandVoice', label: 'Brand Voice', icon: 'i-lucide-megaphone' },
] as const

const ISSUE_CATEGORIES = ['readability', 'seo', 'accuracy', 'engagement', 'brand_voice', 'other']
const ISSUE_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const

// Form state - star ratings (1-5) converted to 0-100 scale
const ratings = ref<Record<string, number>>({
  readability: 0,
  seo: 0,
  accuracy: 0,
  engagement: 0,
  brandVoice: 0,
})

const feedback = ref('')
const issues = ref<EvalIssue[]>([])
const submitting = ref(false)
const markingGolden = ref(false)

// New issue form
const newIssue = ref({
  category: 'other',
  severity: 'medium' as 'low' | 'medium' | 'high' | 'critical',
  description: '',
  suggestion: '',
})

// Computed - get the LATEST automated/human eval (highest iteration)
const automatedEval = computed(() => {
  const automated = props.existingEvals.filter(e => e.evalType === 'automated')
  if (automated.length === 0) return undefined
  // Sort by iteration descending and return the latest one
  return automated.sort((a, b) => (b.iteration ?? 1) - (a.iteration ?? 1))[0]
})
const humanEval = computed(() => {
  const human = props.existingEvals.filter(e => e.evalType === 'human')
  if (human.length === 0) return undefined
  // Sort by iteration descending and return the latest one
  return human.sort((a, b) => (b.iteration ?? 1) - (a.iteration ?? 1))[0]
})
const hasRated = computed(() => !!humanEval.value)
const canRate = computed(() => props.jobStatus === 'completed')
const canMarkGolden = computed(() =>
  props.jobStatus === 'completed' &&
  humanEval.value &&
  (humanEval.value.overallScore ?? 0) >= 80
)

// Computed - categorize issues into blocking vs recommendations
const automatedIssueStats = computed(() => {
  const issues = automatedEval.value?.issues ?? []
  const critical = issues.filter(i => i.severity === 'critical').length
  const high = issues.filter(i => i.severity === 'high').length
  const medium = issues.filter(i => i.severity === 'medium').length
  const low = issues.filter(i => i.severity === 'low').length
  return {
    blocking: critical + high,
    recommendations: medium + low,
    critical,
    high,
    medium,
    low,
    total: issues.length,
  }
})

const overallScore = computed(() => {
  const values = Object.values(ratings.value)
  if (values.every(v => v === 0)) return 0
  return Math.round(values.reduce((a, b) => a + b, 0) / 5)
})

// Convert stars (1-5) to 0-100 score
function starsToScore(stars: number): number {
  return stars * 20
}

// Convert 0-100 score to stars (1-5)
function scoreToStars(score: number): number {
  return Math.round(score / 20)
}

// Set rating for a dimension
function setRating(dimension: string, stars: number) {
  ratings.value[dimension] = starsToScore(stars)
}

// Get current star value for a dimension
function getStars(dimension: string): number {
  return scoreToStars(ratings.value[dimension])
}

// Add issue
function addIssue() {
  if (!newIssue.value.description.trim()) {
    toast.error('Please enter an issue description')
    return
  }
  issues.value.push({ ...newIssue.value })
  newIssue.value = { category: 'other', severity: 'medium', description: '', suggestion: '' }
}

// Remove issue
function removeIssue(index: number) {
  issues.value.splice(index, 1)
}

// Submit evaluation
async function submitEvaluation() {
  if (Object.values(ratings.value).every(v => v === 0)) {
    toast.error('Please rate at least one dimension')
    return
  }

  submitting.value = true
  try {
    const response = await $fetch(`/api/ai/articles/${props.jobId}/evals`, {
      method: 'POST',
      body: {
        dimensionScores: ratings.value as EvalDimensionScores,
        feedback: feedback.value || undefined,
        issues: issues.value.length > 0 ? issues.value : undefined,
      },
    })

    toast.success('Evaluation submitted')
    emit('evalCreated', (response as { eval: ArticleEval }).eval)
  } catch (err) {
    toast.error((err as Error).message || 'Failed to submit evaluation')
  } finally {
    submitting.value = false
  }
}

// Mark as golden example
async function markAsGolden() {
  markingGolden.value = true
  try {
    await $fetch(`/api/ai/articles/${props.jobId}/golden`, {
      method: 'POST',
      body: {
        title: props.keyword,
        description: `High-quality example for "${props.keyword}"`,
        tags: [props.keyword.split(' ')[0]],
      },
    })

    toast.success('Marked as golden example')
    emit('goldenCreated')
  } catch (err) {
    toast.error((err as Error).message || 'Failed to mark as golden')
  } finally {
    markingGolden.value = false
  }
}
</script>

<template>
  <UiCard>
    <UiCardHeader>
      <UiCardTitle class="flex items-center gap-2">
        <Icon name="i-lucide-star" class="size-5 text-yellow-500" />
        Human Evaluation
      </UiCardTitle>
      <UiCardDescription>
        Rate the article quality across 5 dimensions
      </UiCardDescription>
    </UiCardHeader>

    <UiCardContent class="space-y-6">
      <!-- Automated Eval (always visible when present) -->
      <div v-if="automatedEval" class="rounded-lg border bg-muted/30 p-3">
        <div class="mb-2 flex items-center justify-between">
          <div class="flex items-center gap-2 text-sm font-medium">
            <Icon name="i-lucide-bot" class="size-4" />
            Automated Score
          </div>
          <span class="text-[10px] text-muted-foreground">
            Evaluation
          </span>
        </div>
        <div class="flex items-baseline gap-1">
          <span
            class="text-2xl font-bold"
            :class="{
              'text-green-600 dark:text-green-400': (automatedEval.overallScore ?? 0) >= 70,
              'text-yellow-600 dark:text-yellow-400': (automatedEval.overallScore ?? 0) >= 50 && (automatedEval.overallScore ?? 0) < 70,
              'text-red-600 dark:text-red-400': (automatedEval.overallScore ?? 0) < 50,
            }"
          >{{ automatedEval.overallScore ?? 'N/A' }}</span>
          <span class="text-sm text-muted-foreground">/100</span>
        </div>
        <!-- Issue/Recommendation Summary -->
        <div v-if="automatedIssueStats.total > 0" class="mt-2 space-y-1">
          <!-- Blocking issues (critical/high) - shown as problems -->
          <div
            v-if="automatedIssueStats.blocking > 0"
            class="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400"
          >
            <Icon name="i-lucide-alert-circle" class="size-3.5" />
            <span>{{ automatedIssueStats.blocking }} issue{{ automatedIssueStats.blocking > 1 ? 's' : '' }} to fix</span>
            <span class="text-muted-foreground">
              ({{ automatedIssueStats.critical }} critical, {{ automatedIssueStats.high }} high)
            </span>
          </div>
          <!-- No blocking issues message -->
          <div
            v-else
            class="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400"
          >
            <Icon name="i-lucide-check-circle" class="size-3.5" />
            <span>No blocking issues</span>
          </div>
          <!-- Recommendations (medium/low) - shown as suggestions -->
          <div
            v-if="automatedIssueStats.recommendations > 0"
            class="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <Icon name="i-lucide-lightbulb" class="size-3.5 text-yellow-500" />
            <span>{{ automatedIssueStats.recommendations }} recommendation{{ automatedIssueStats.recommendations > 1 ? 's' : '' }}</span>
            <span class="text-muted-foreground/70">
              ({{ automatedIssueStats.medium }} medium, {{ automatedIssueStats.low }} low)
            </span>
          </div>
        </div>
        <!-- No issues at all -->
        <div
          v-else-if="automatedEval.issues !== undefined"
          class="mt-2 flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400"
        >
          <Icon name="i-lucide-sparkles" class="size-3.5" />
          <span>Perfect score - no issues or recommendations</span>
        </div>
        <div v-if="automatedEval.dimensionScores" class="mt-2 space-y-1 text-xs">
          <div class="mb-1 text-[10px] text-muted-foreground">Dimension Scores (weighted):</div>
          <div v-for="dim in DIMENSIONS" :key="dim.key" class="flex justify-between">
            <span class="text-muted-foreground">{{ dim.label }}</span>
            <span>{{ automatedEval.dimensionScores[dim.key as keyof EvalDimensionScores] }}/100</span>
          </div>
        </div>
      </div>

      <UiCollapsible v-if="automatedEval" :default-open="false" class="rounded-lg border border-border/40">
        <template #default="{ open }">
          <UiCollapsibleTrigger class="flex w-full items-center justify-between gap-3 rounded-md bg-muted/50 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <span>Evaluation details</span>
            <span class="flex items-center gap-1 text-xs">
              {{ open ? 'Hide details' : 'Show details' }}
              <Icon :name="open ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="size-4" />
            </span>
          </UiCollapsibleTrigger>
          <div>
            <div v-if="open" class="border-t border-border/40 px-3 py-4">
              <div class="space-y-6">
              <!-- Human Eval -->
              <div v-if="humanEval" class="rounded-lg border bg-muted/30 p-3">
                <div class="mb-2 flex items-center justify-between">
                  <div class="flex items-center gap-2 text-sm font-medium">
                    <Icon name="i-lucide-user" class="size-4" />
                    Human Score
                  </div>
                  <UiBadge
                    :variant="(humanEval.overallScore ?? 0) >= 70 ? 'default' : 'destructive'"
                    class="text-[10px]"
                  >
                    {{ (humanEval.overallScore ?? 0) >= 70 ? 'PASSED' : 'FAILED' }}
                  </UiBadge>
                </div>
                <div class="flex items-baseline gap-1">
                  <span
                    class="text-2xl font-bold"
                    :class="{
                      'text-green-600 dark:text-green-400': (humanEval.overallScore ?? 0) >= 70,
                      'text-yellow-600 dark:text-yellow-400': (humanEval.overallScore ?? 0) >= 50 && (humanEval.overallScore ?? 0) < 70,
                      'text-red-600 dark:text-red-400': (humanEval.overallScore ?? 0) < 50,
                    }"
                  >{{ humanEval.overallScore ?? 'N/A' }}</span>
                  <span class="text-sm text-muted-foreground">/100</span>
                </div>
                <div v-if="humanEval.dimensionScores" class="mt-2 space-y-1 text-xs">
                  <div class="mb-1 text-[10px] text-muted-foreground">Dimension Scores:</div>
                  <div v-for="dim in DIMENSIONS" :key="dim.key" class="flex justify-between">
                    <span class="text-muted-foreground">{{ dim.label }}</span>
                    <span>{{ humanEval.dimensionScores[dim.key as keyof EvalDimensionScores] }}/100</span>
                  </div>
                </div>
              </div>

              <!-- Rating Form (if not yet rated) -->
              <template v-if="canRate && !hasRated">
                <UiSeparator />

                <!-- Star Ratings -->
                <div class="space-y-2">
                  <div v-for="dim in DIMENSIONS" :key="dim.key" class="flex items-center gap-3">
                    <div class="flex w-28 items-center gap-2">
                      <Icon :name="dim.icon" class="size-4 text-muted-foreground" />
                      <span class="text-sm">{{ dim.label }}</span>
                    </div>
                    <div class="flex gap-1">
                      <button
                        v-for="star in 5"
                        :key="star"
                        type="button"
                        class="text-xl transition-colors hover:scale-110"
                        @click="setRating(dim.key, star)"
                      >
                        <Icon
                          :name="star <= getStars(dim.key) ? 'i-lucide-star' : 'i-lucide-star'"
                          :class="star <= getStars(dim.key) ? 'text-yellow-500' : 'text-muted-foreground/30'"
                        />
                      </button>
                    </div>
                    <span class="text-sm text-muted-foreground">{{ ratings[dim.key] }}/100</span>
                  </div>
                </div>

                <div class="text-center text-sm">
                  Overall: <span class="font-bold">{{ overallScore }}</span>/100
                </div>

                <!-- Feedback -->
                <div class="space-y-2">
                  <UiLabel>Feedback (optional)</UiLabel>
                  <UiTextarea v-model="feedback" placeholder="Any additional feedback..." rows="2" />
                </div>

                <!-- Issues -->
                <div class="space-y-2">
                  <UiLabel>Issues Found</UiLabel>
                  <div v-if="issues.length > 0" class="space-y-2">
                    <div
                      v-for="(issue, idx) in issues"
                      :key="idx"
                      class="flex items-start gap-2 rounded border p-2 text-sm"
                    >
                      <Badge variant="outline" class="capitalize">{{ issue.category }}</Badge>
                      <Badge
                        :variant="issue.severity === 'critical' ? 'destructive' : 'secondary'"
                        class="capitalize"
                      >
                        {{ issue.severity }}
                      </Badge>
                      <span class="flex-1">{{ issue.description }}</span>
                      <button type="button" class="text-muted-foreground hover:text-destructive" @click="removeIssue(idx)">
                        <Icon name="i-lucide-x" class="size-4" />
                      </button>
                    </div>
                  </div>

                  <!-- Add issue form -->
                  <div class="grid gap-2 rounded border p-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                    <UiSelect v-model="newIssue.category">
                      <UiSelectTrigger class="w-full"><UiSelectValue placeholder="Category" /></UiSelectTrigger>
                      <UiSelectContent>
                        <UiSelectItem v-for="cat in ISSUE_CATEGORIES" :key="cat" :value="cat" class="capitalize">
                          {{ cat.replace('_', ' ') }}
                        </UiSelectItem>
                      </UiSelectContent>
                    </UiSelect>
                    <UiSelect v-model="newIssue.severity">
                      <UiSelectTrigger class="w-full"><UiSelectValue placeholder="Severity" /></UiSelectTrigger>
                      <UiSelectContent>
                        <UiSelectItem v-for="sev in ISSUE_SEVERITIES" :key="sev" :value="sev" class="capitalize">
                          {{ sev }}
                        </UiSelectItem>
                      </UiSelectContent>
                    </UiSelect>
                    <UiButton type="button" variant="secondary" size="sm" class="w-full md:w-auto" @click="addIssue">
                      <Icon name="i-lucide-save" class="mr-1 size-4" />
                      Save issue
                    </UiButton>
                    <UiInput v-model="newIssue.description" placeholder="Description" class="md:col-span-3 w-full" />
                  </div>
                </div>

                <!-- Submit -->
                <UiButton :disabled="submitting" class="w-full" @click="submitEvaluation">
                  <Icon :name="submitting ? 'i-lucide-loader-2' : 'i-lucide-check'" :class="['mr-2 size-4', { 'animate-spin': submitting }]" />
                  Submit Evaluation
                </UiButton>
              </template>

              <!-- Not completed message -->
              <div v-else-if="!canRate" class="text-center text-sm text-muted-foreground">
                Evaluation available after job completes
              </div>

              <!-- Mark as Golden -->
              <div v-if="canMarkGolden" class="border-t pt-4">
                <UiButton variant="outline" class="w-full" :disabled="markingGolden" @click="markAsGolden">
                  <Icon :name="markingGolden ? 'i-lucide-loader-2' : 'i-lucide-trophy'" :class="['mr-2 size-4 text-yellow-500', { 'animate-spin': markingGolden }]" />
                  Mark as Golden Example
                </UiButton>
                <p class="mt-1 text-center text-xs text-muted-foreground">
                  High-quality examples are used for few-shot learning
                </p>
              </div>
              </div>
            </div>
          </div>
        </template>
      </UiCollapsible>

      <template v-else>
        <!-- Human Eval (if no automated eval present) -->
        <div v-if="humanEval" class="rounded-lg border bg-muted/30 p-3">
          <div class="mb-2 flex items-center justify-between">
            <div class="flex items-center gap-2 text-sm font-medium">
              <Icon name="i-lucide-user" class="size-4" />
              Human Score
            </div>
            <UiBadge
              :variant="(humanEval.overallScore ?? 0) >= 70 ? 'default' : 'destructive'"
              class="text-[10px]"
            >
              {{ (humanEval.overallScore ?? 0) >= 70 ? 'PASSED' : 'FAILED' }}
            </UiBadge>
          </div>
          <div class="flex items-baseline gap-1">
            <span
              class="text-2xl font-bold"
              :class="{
                'text-green-600 dark:text-green-400': (humanEval.overallScore ?? 0) >= 70,
                'text-yellow-600 dark:text-yellow-400': (humanEval.overallScore ?? 0) >= 50 && (humanEval.overallScore ?? 0) < 70,
                'text-red-600 dark:text-red-400': (humanEval.overallScore ?? 0) < 50,
              }"
            >{{ humanEval.overallScore ?? 'N/A' }}</span>
            <span class="text-sm text-muted-foreground">/100</span>
          </div>
          <div v-if="humanEval.dimensionScores" class="mt-2 space-y-1 text-xs">
            <div class="mb-1 text-[10px] text-muted-foreground">Dimension Scores:</div>
            <div v-for="dim in DIMENSIONS" :key="dim.key" class="flex justify-between">
              <span class="text-muted-foreground">{{ dim.label }}</span>
              <span>{{ humanEval.dimensionScores[dim.key as keyof EvalDimensionScores] }}/100</span>
            </div>
          </div>
        </div>

        <!-- Rating Form (if not yet rated) -->
        <template v-if="canRate && !hasRated">
        <UiSeparator v-if="automatedEval" />

        <!-- Star Ratings -->
        <div class="space-y-2">
          <div v-for="dim in DIMENSIONS" :key="dim.key" class="flex items-center gap-3">
            <div class="flex w-28 items-center gap-2">
              <Icon :name="dim.icon" class="size-4 text-muted-foreground" />
              <span class="text-sm">{{ dim.label }}</span>
            </div>
            <div class="flex gap-1">
              <button
                v-for="star in 5"
                :key="star"
                type="button"
                class="text-xl transition-colors hover:scale-110"
                @click="setRating(dim.key, star)"
              >
                <Icon
                  :name="star <= getStars(dim.key) ? 'i-lucide-star' : 'i-lucide-star'"
                  :class="star <= getStars(dim.key) ? 'text-yellow-500' : 'text-muted-foreground/30'"
                />
              </button>
            </div>
            <span class="text-sm text-muted-foreground">{{ ratings[dim.key] }}/100</span>
          </div>
        </div>

        <div class="text-center text-sm">
          Overall: <span class="font-bold">{{ overallScore }}</span>/100
        </div>

        <!-- Feedback -->
        <div class="space-y-2">
          <UiLabel>Feedback (optional)</UiLabel>
          <UiTextarea v-model="feedback" placeholder="Any additional feedback..." rows="2" />
        </div>

        <!-- Issues -->
        <div class="space-y-2">
          <UiLabel>Issues Found</UiLabel>
          <div v-if="issues.length > 0" class="space-y-2">
            <div
              v-for="(issue, idx) in issues"
              :key="idx"
              class="flex items-start gap-2 rounded border p-2 text-sm"
            >
              <Badge variant="outline" class="capitalize">{{ issue.category }}</Badge>
              <Badge
                :variant="issue.severity === 'critical' ? 'destructive' : 'secondary'"
                class="capitalize"
              >
                {{ issue.severity }}
              </Badge>
              <span class="flex-1">{{ issue.description }}</span>
              <button type="button" class="text-muted-foreground hover:text-destructive" @click="removeIssue(idx)">
                <Icon name="i-lucide-x" class="size-4" />
              </button>
            </div>
          </div>

          <!-- Add issue form -->
          <div class="grid gap-2 rounded border p-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <UiSelect v-model="newIssue.category">
              <UiSelectTrigger class="w-full"><UiSelectValue placeholder="Category" /></UiSelectTrigger>
              <UiSelectContent>
                <UiSelectItem v-for="cat in ISSUE_CATEGORIES" :key="cat" :value="cat" class="capitalize">
                  {{ cat.replace('_', ' ') }}
                </UiSelectItem>
              </UiSelectContent>
            </UiSelect>
            <UiSelect v-model="newIssue.severity">
              <UiSelectTrigger class="w-full"><UiSelectValue placeholder="Severity" /></UiSelectTrigger>
              <UiSelectContent>
                <UiSelectItem v-for="sev in ISSUE_SEVERITIES" :key="sev" :value="sev" class="capitalize">
                  {{ sev }}
                </UiSelectItem>
              </UiSelectContent>
            </UiSelect>
            <UiButton type="button" variant="secondary" size="sm" class="w-full md:w-auto" @click="addIssue">
              <Icon name="i-lucide-save" class="mr-1 size-4" />
              Save issue
            </UiButton>
            <UiInput v-model="newIssue.description" placeholder="Description" class="md:col-span-3 w-full" />
          </div>
        </div>

        <!-- Submit -->
        <UiButton :disabled="submitting" class="w-full" @click="submitEvaluation">
          <Icon :name="submitting ? 'i-lucide-loader-2' : 'i-lucide-check'" :class="['mr-2 size-4', { 'animate-spin': submitting }]" />
          Submit Evaluation
        </UiButton>
        </template>

        <!-- Not completed message -->
        <div v-else-if="!canRate" class="text-center text-sm text-muted-foreground">
          Evaluation available after job completes
        </div>

        <!-- Mark as Golden -->
        <div v-if="canMarkGolden" class="border-t pt-4">
          <UiButton variant="outline" class="w-full" :disabled="markingGolden" @click="markAsGolden">
            <Icon :name="markingGolden ? 'i-lucide-loader-2' : 'i-lucide-trophy'" :class="['mr-2 size-4 text-yellow-500', { 'animate-spin': markingGolden }]" />
            Mark as Golden Example
          </UiButton>
          <p class="mt-1 text-center text-xs text-muted-foreground">
            High-quality examples are used for few-shot learning
          </p>
        </div>
      </template>
    </UiCardContent>
  </UiCard>
</template>

