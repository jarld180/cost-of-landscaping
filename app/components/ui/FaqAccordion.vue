<script setup lang="ts">
/**
 * FaqAccordion Component (Front-end)
 *
 * Accessible FAQ accordion using Reka UI Accordion
 * Supports Schema.org FAQPage structured data
 */

interface FaqItem {
  question: string
  answer: string
}

interface Props {
  /** Array of FAQ items */
  items: FaqItem[]
  /** Optional title displayed as H2 above the accordion */
  title?: string
  /** Whether to include Schema.org FAQPage structured data */
  includeSchema?: boolean
  /** Allow multiple items open at once */
  multiple?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  includeSchema: true,
  multiple: false
})

// Generate slug for heading ID (for TOC linking)
const titleId = computed(() => {
  if (!props.title) return ''
  return props.title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
})

// Generate Schema.org FAQPage structured data
const faqSchema = computed(() => {
  if (!props.includeSchema || !props.items.length) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: props.items.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer
      }
    }))
  }
})

// Inject structured data
useHead(() => {
  if (!faqSchema.value) return {}
  return {
    script: [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify(faqSchema.value)
      }
    ]
  }
})
</script>

<template>
  <div>
    <!-- Optional H2 title -->
    <h2
      v-if="title"
      :id="titleId"
      class="font-heading text-2xl font-bold text-neutral-900 dark:text-neutral-50 mb-4"
    >
      {{ title }}
    </h2>

    <AccordionRoot
      :type="multiple ? 'multiple' : 'single'"
      :collapsible="!multiple"
      class="w-full divide-y divide-neutral-200 dark:divide-neutral-700 border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden"
    >
    <AccordionItem
      v-for="(item, index) in items"
      :key="index"
      :value="`faq-${index}`"
      class="bg-white dark:bg-neutral-800"
    >
      <AccordionHeader>
        <AccordionTrigger
          class="group flex w-full items-center justify-between px-4 py-4 text-left font-medium text-neutral-900 dark:text-neutral-50 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
        >
          <span class="pr-4">{{ item.question }}</span>
          <svg
            class="size-5 shrink-0 text-neutral-500 dark:text-neutral-400 transition-transform duration-200 group-data-[state=open]:rotate-180"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </AccordionTrigger>
      </AccordionHeader>
      <AccordionContent
        class="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up"
      >
        <div class="px-4 pb-4 text-neutral-600 dark:text-neutral-300 prose prose-sm dark:prose-invert max-w-none">
          {{ item.answer }}
        </div>
      </AccordionContent>
    </AccordionItem>
    </AccordionRoot>
  </div>
</template>

<style scoped>
/* Accordion animations */
@keyframes accordion-down {
  from { height: 0; opacity: 0; }
  to { height: var(--reka-accordion-content-height); opacity: 1; }
}

@keyframes accordion-up {
  from { height: var(--reka-accordion-content-height); opacity: 1; }
  to { height: 0; opacity: 0; }
}

.animate-accordion-down {
  animation: accordion-down 0.2s ease-out;
}

.animate-accordion-up {
  animation: accordion-up 0.2s ease-out;
}
</style>

