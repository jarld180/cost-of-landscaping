<script setup lang="ts">
/**
 * SEO Fields Section Component
 *
 * Expandable section containing all SEO-related fields:
 * - Basic SEO (Meta Title, Description, Keywords, Focus Keyword)
 * - Advanced SEO (Canonical URL, Meta Robots, Sitemap)
 * - Social Media (Open Graph, Twitter Card)
 * - Schema.org (Structured Data)
 */

import type { PageFormData } from '~/schemas/admin/page-form.schema'

interface Props {
  values: Partial<PageFormData>
  errors: Partial<Record<keyof PageFormData, string | undefined>>
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
})

const emit = defineEmits<{
  'update:field': [name: keyof PageFormData, value: any]
}>()

// Type definitions
type MetaRobotValue = 'index' | 'noindex' | 'follow' | 'nofollow' | 'noarchive' | 'nosnippet' | 'noimageindex' | 'notranslate' | 'none' | 'all'

// Expandable sections state
const expandedSections = ref({
  basic: true,
  advanced: false,
  social: false,
  schema: false
})

// Toggle section
function toggleSection(section: keyof typeof expandedSections.value) {
  expandedSections.value[section] = !expandedSections.value[section]
}

// Helper to update field
function updateField(name: keyof PageFormData, value: any) {
  emit('update:field', name, value)
}

// Meta Robots options
const metaRobotsOptions: Array<{ label: string; value: MetaRobotValue }> = [
  { label: 'Index', value: 'index' },
  { label: 'No Index', value: 'noindex' },
  { label: 'Follow', value: 'follow' },
  { label: 'No Follow', value: 'nofollow' },
  { label: 'No Archive', value: 'noarchive' },
  { label: 'No Snippet', value: 'nosnippet' },
  { label: 'No Image Index', value: 'noimageindex' },
  { label: 'No Translate', value: 'notranslate' }
]

// Sitemap Changefreq options
const changefreqOptions = [
  { label: 'Always', value: 'always' },
  { label: 'Hourly', value: 'hourly' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
  { label: 'Never', value: 'never' }
]

// OG Type options
const ogTypeOptions = [
  { label: 'Website', value: 'website' },
  { label: 'Article', value: 'article' },
  { label: 'Product', value: 'product' },
  { label: 'Profile', value: 'profile' }
]

// Twitter Card options
const twitterCardOptions = [
  { label: 'Summary', value: 'summary' },
  { label: 'Summary Large Image', value: 'summary_large_image' },
  { label: 'App', value: 'app' },
  { label: 'Player', value: 'player' }
]

// Schema.org Type options
const schemaTypeOptions = [
  { label: 'Web Page', value: 'WebPage' },
  { label: 'Article', value: 'Article' },
  { label: 'How-To', value: 'HowTo' },
  { label: 'FAQ Page', value: 'FAQPage' },
  { label: 'Local Business', value: 'LocalBusiness' },
  { label: 'Product', value: 'Product' },
  { label: 'Organization', value: 'Organization' }
]

// Handle keywords input (comma-separated)
const keywordsInput = ref(props.values.metaKeywords?.join(', ') || '')
watch(keywordsInput, (newValue) => {
  if (!newValue || newValue.trim() === '') {
    updateField('metaKeywords', null)
  } else {
    const keywords = newValue.split(',').map(k => k.trim()).filter(k => k.length > 0)
    updateField('metaKeywords', keywords.length > 0 ? keywords : null)
  }
})

// Watch for external changes to metaKeywords
watch(() => props.values.metaKeywords, (newValue) => {
  keywordsInput.value = newValue?.join(', ') || ''
})

// Handle meta robots checkboxes
function toggleMetaRobot(value: MetaRobotValue) {
  const currentRobots = props.values.metaRobots || []
  const index = currentRobots.indexOf(value)

  if (index > -1) {
    const updated = [...currentRobots]
    updated.splice(index, 1)
    updateField('metaRobots', updated.length > 0 ? updated : null)
  } else {
    updateField('metaRobots', [...currentRobots, value])
  }
}

function isMetaRobotSelected(value: MetaRobotValue): boolean {
  return props.values.metaRobots?.includes(value) || false
}
</script>

<template>
  <div class="space-y-4 border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-gray-50 dark:bg-gray-800/50">
    <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">SEO Settings</h3>
    <p class="text-sm text-gray-600 dark:text-gray-400">Configure search engine optimization and social media settings</p>

    <!-- Basic SEO Section -->
    <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
      <button
        type="button"
        @click="toggleSection('basic')"
        class="flex w-full items-center justify-between text-left"
      >
        <h4 class="text-base font-medium text-gray-900 dark:text-gray-100">Basic SEO</h4>
        <svg
          :class="{ 'rotate-180': expandedSections.basic }"
          class="h-5 w-5 text-gray-500 transition-transform"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div v-show="expandedSections.basic" class="mt-4 space-y-4">
        <!-- Meta Title -->
        <div>
          <TextInput
            id="metaTitle"
            :model-value="values.metaTitle"
            @update:model-value="(val) => updateField('metaTitle', val)"
            label="Meta Title"
            type="text"
            :disabled="disabled"
            placeholder="Enter meta title (max 60 characters)"
            size="lg"
          />
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {{ values.metaTitle?.length || 0 }}/60 characters
          </p>
          <p v-if="errors.metaTitle" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ errors.metaTitle }}</p>
        </div>

        <!-- Meta Description -->
        <div>
          <label for="metaDescription" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Meta Description
          </label>
          <textarea
            id="metaDescription"
            :value="values.metaDescription"
            @input="(e) => updateField('metaDescription', (e.target as HTMLTextAreaElement).value || null)"
            :disabled="disabled"
            placeholder="Enter meta description (max 160 characters)"
            maxlength="160"
            rows="3"
            class="w-full px-4 py-3 text-sm rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-y transition-all"
          ></textarea>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {{ values.metaDescription?.length || 0 }}/160 characters
          </p>
          <p v-if="errors.metaDescription" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ errors.metaDescription }}</p>
        </div>

        <!-- Meta Keywords -->
        <div>
          <TextInput
            id="metaKeywords"
            v-model="keywordsInput"
            label="Meta Keywords"
            type="text"
            :disabled="disabled"
            placeholder="Enter keywords separated by commas"
            size="lg"
          />
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Separate keywords with commas</p>
          <p v-if="errors.metaKeywords" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ errors.metaKeywords }}</p>
        </div>

        <!-- Focus Keyword -->
        <div>
          <TextInput
            id="focusKeyword"
            :model-value="values.focusKeyword"
            @update:model-value="(val) => updateField('focusKeyword', val)"
            label="Focus Keyword"
            type="text"
            :disabled="disabled"
            placeholder="Enter primary focus keyword"
            size="lg"
          />
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Main keyword to optimize this page for</p>
          <p v-if="errors.focusKeyword" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ errors.focusKeyword }}</p>
        </div>
      </div>
    </div>

    <!-- Advanced SEO Section -->
    <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
      <button
        type="button"
        @click="toggleSection('advanced')"
        class="flex w-full items-center justify-between text-left"
      >
        <h4 class="text-base font-medium text-gray-900 dark:text-gray-100">Advanced SEO</h4>
        <svg
          :class="{ 'rotate-180': expandedSections.advanced }"
          class="h-5 w-5 text-gray-500 transition-transform"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div v-show="expandedSections.advanced" class="mt-4 space-y-4">
        <!-- Canonical URL -->
        <div>
          <TextInput
            id="canonicalUrl"
            :model-value="values.canonicalUrl"
            @update:model-value="(val) => updateField('canonicalUrl', val)"
            label="Canonical URL"
            type="text"
            :disabled="disabled"
            placeholder="https://example.com/canonical-page"
            size="lg"
          />
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Preferred URL for this page (optional)</p>
          <p v-if="errors.canonicalUrl" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ errors.canonicalUrl }}</p>
        </div>

        <!-- Meta Robots -->
        <div>
          <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Meta Robots
          </label>
          <div class="grid grid-cols-2 gap-2">
            <div
              v-for="option in metaRobotsOptions"
              :key="option.value"
              class="flex items-center space-x-2 p-2 rounded border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-700"
            >
              <Checkbox
                :model-value="isMetaRobotSelected(option.value)"
                @update:model-value="toggleMetaRobot(option.value)"
                :disabled="disabled"
                size="sm"
              />
              <span class="text-sm text-neutral-700 dark:text-neutral-300">{{ option.label }}</span>
            </div>
          </div>
          <p v-if="errors.metaRobots" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ errors.metaRobots }}</p>
        </div>

        <!-- Sitemap Priority -->
        <div>
          <label for="sitemapPriority" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Sitemap Priority (0.0 - 1.0)
          </label>
          <input
            id="sitemapPriority"
            type="number"
            :value="values.sitemapPriority"
            @input="(e) => updateField('sitemapPriority', (e.target as HTMLInputElement).value ? parseFloat((e.target as HTMLInputElement).value) : null)"
            :disabled="disabled"
            min="0"
            max="1"
            step="0.1"
            placeholder="0.5"
            class="w-full h-12 px-4 text-sm rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          />
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Priority of this page in sitemap (0.0 = lowest, 1.0 = highest)</p>
          <p v-if="errors.sitemapPriority" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ errors.sitemapPriority }}</p>
        </div>

        <!-- Sitemap Change Frequency -->
        <div>
          <FilterSelect
            id="sitemapChangefreq"
            :model-value="values.sitemapChangefreq"
            @update:model-value="(val) => updateField('sitemapChangefreq', val)"
            label="Sitemap Change Frequency"
            :options="changefreqOptions"
            :disabled="disabled"
            placeholder="Select frequency"
            size="lg"
          />
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">How frequently this page is likely to change</p>
          <p v-if="errors.sitemapChangefreq" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ errors.sitemapChangefreq }}</p>
        </div>
      </div>
    </div>

    <!-- Social Media Section -->
    <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
      <button
        type="button"
        @click="toggleSection('social')"
        class="flex w-full items-center justify-between text-left"
      >
        <h4 class="text-base font-medium text-gray-900 dark:text-gray-100">Social Media</h4>
        <svg
          :class="{ 'rotate-180': expandedSections.social }"
          class="h-5 w-5 text-gray-500 transition-transform"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div v-show="expandedSections.social" class="mt-4 space-y-6">
        <!-- Open Graph -->
        <div class="space-y-4">
          <h5 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Open Graph (Facebook, LinkedIn)</h5>

          <div>
            <TextInput
              id="ogTitle"
              :model-value="values.ogTitle"
              @update:model-value="(val) => updateField('ogTitle', val)"
              label="OG Title"
              type="text"
              :disabled="disabled"
              placeholder="Enter Open Graph title (max 95 characters)"
              size="lg"
            />
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ values.ogTitle?.length || 0 }}/95 characters</p>
            <p v-if="errors.ogTitle" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ errors.ogTitle }}</p>
          </div>

          <div>
            <label for="ogDescription" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              OG Description
            </label>
            <textarea
              id="ogDescription"
              :value="values.ogDescription"
              @input="(e) => updateField('ogDescription', (e.target as HTMLTextAreaElement).value || null)"
              :disabled="disabled"
              placeholder="Enter Open Graph description (max 200 characters)"
              maxlength="200"
              rows="3"
              class="w-full px-4 py-3 text-sm rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-y transition-all"
            ></textarea>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ values.ogDescription?.length || 0 }}/200 characters</p>
            <p v-if="errors.ogDescription" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ errors.ogDescription }}</p>
          </div>

          <div>
            <TextInput
              id="ogImage"
              :model-value="values.ogImage"
              @update:model-value="(val) => updateField('ogImage', val)"
              label="OG Image URL"
              type="text"
              :disabled="disabled"
              placeholder="https://example.com/image.jpg"
              size="lg"
            />
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Recommended: 1200x630px (optional)</p>
            <p v-if="errors.ogImage" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ errors.ogImage }}</p>
          </div>

          <div>
            <FilterSelect
              id="ogType"
              :model-value="values.ogType"
              @update:model-value="(val) => updateField('ogType', val)"
              label="OG Type"
              :options="ogTypeOptions"
              :disabled="disabled"
              placeholder="Select type"
              size="lg"
            />
            <p v-if="errors.ogType" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ errors.ogType }}</p>
          </div>
        </div>

        <!-- Twitter Card -->
        <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h5 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Twitter Card</h5>

          <div>
            <FilterSelect
              id="twitterCard"
              :model-value="values.twitterCard"
              @update:model-value="(val) => updateField('twitterCard', val)"
              label="Card Type"
              :options="twitterCardOptions"
              :disabled="disabled"
              placeholder="Select card type"
              size="lg"
            />
            <p v-if="errors.twitterCard" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ errors.twitterCard }}</p>
          </div>

          <div>
            <TextInput
              id="twitterTitle"
              :model-value="values.twitterTitle"
              @update:model-value="(val) => updateField('twitterTitle', val)"
              label="Twitter Title"
              type="text"
              :disabled="disabled"
              placeholder="Enter Twitter card title (max 70 characters)"
              size="lg"
            />
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ values.twitterTitle?.length || 0 }}/70 characters</p>
            <p v-if="errors.twitterTitle" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ errors.twitterTitle }}</p>
          </div>

          <div>
            <label for="twitterDescription" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Twitter Description
            </label>
            <textarea
              id="twitterDescription"
              :value="values.twitterDescription"
              @input="(e) => updateField('twitterDescription', (e.target as HTMLTextAreaElement).value || null)"
              :disabled="disabled"
              placeholder="Enter Twitter card description (max 200 characters)"
              maxlength="200"
              rows="3"
              class="w-full px-4 py-3 text-sm rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-y transition-all"
            ></textarea>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ values.twitterDescription?.length || 0 }}/200 characters</p>
            <p v-if="errors.twitterDescription" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ errors.twitterDescription }}</p>
          </div>

          <div>
            <TextInput
              id="twitterImage"
              :model-value="values.twitterImage"
              @update:model-value="(val) => updateField('twitterImage', val)"
              label="Twitter Image URL"
              type="text"
              :disabled="disabled"
              placeholder="https://example.com/image.jpg"
              size="lg"
            />
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Recommended: 1200x675px for summary_large_image (optional)</p>
            <p v-if="errors.twitterImage" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ errors.twitterImage }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Schema.org Section -->
    <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
      <button
        type="button"
        @click="toggleSection('schema')"
        class="flex w-full items-center justify-between text-left"
      >
        <h4 class="text-base font-medium text-gray-900 dark:text-gray-100">Schema.org Structured Data</h4>
        <svg
          :class="{ 'rotate-180': expandedSections.schema }"
          class="h-5 w-5 text-gray-500 transition-transform"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div v-show="expandedSections.schema" class="mt-4 space-y-4">
        <div>
          <FilterSelect
            id="schemaType"
            :model-value="values.schemaType"
            @update:model-value="(val) => updateField('schemaType', val)"
            label="Schema Type"
            :options="schemaTypeOptions"
            :disabled="disabled"
            placeholder="Select schema type"
            size="lg"
          />
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Select the most appropriate schema type for this page</p>
          <p v-if="errors.schemaType" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ errors.schemaType }}</p>
        </div>

        <div class="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p class="text-sm text-blue-800 dark:text-blue-200">
            <strong>Note:</strong> Schema.org structured data helps search engines understand your content better and can enable rich results in search.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

