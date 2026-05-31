<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  /**
   * Current active page number
   */
  currentPage: number

  /**
   * Total number of pages
   */
  totalPages: number

  /**
   * Maximum number of visible page numbers (excluding first, last, and ellipsis)
   * @default 5
   */
  maxVisiblePages?: number

  /**
   * Size variant
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg'

  /**
   * Whether to show page numbers (desktop only)
   * @default true
   */
  showPageNumbers?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  maxVisiblePages: 5,
  size: 'md',
  showPageNumbers: true
})

const emit = defineEmits<{
  'update:currentPage': [page: number]
  'page-change': [page: number]
}>()

/**
 * Calculate which page numbers to display with smart ellipsis
 * Algorithm:
 * - Always show first and last page
 * - Show current page and surrounding pages
 * - Use ellipsis (...) for gaps
 *
 * Examples:
 * - Page 1 of 10: [1] [2] [3] ... [10]
 * - Page 5 of 10: [1] ... [4] [5] [6] ... [10]
 * - Page 10 of 10: [1] ... [8] [9] [10]
 * - Page 2 of 3: [1] [2] [3] (no ellipsis)
 */
const visiblePages = computed(() => {
  const pages: (number | 'ellipsis')[] = []
  const total = props.totalPages
  const current = props.currentPage
  const maxVisible = props.maxVisiblePages

  // If total pages is small, show all pages
  if (total <= maxVisible + 2) {
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
    return pages
  }

  // Always show first page
  pages.push(1)

  // Calculate range around current page
  const sidePages = Math.floor(maxVisible / 2)
  let startPage = Math.max(2, current - sidePages)
  let endPage = Math.min(total - 1, current + sidePages)

  // Adjust range if at the beginning or end
  if (current <= sidePages + 1) {
    endPage = Math.min(total - 1, maxVisible)
  } else if (current >= total - sidePages) {
    startPage = Math.max(2, total - maxVisible)
  }

  // Add ellipsis before start page if needed
  if (startPage > 2) {
    pages.push('ellipsis')
  }

  // Add pages in range
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i)
  }

  // Add ellipsis after end page if needed
  if (endPage < total - 1) {
    pages.push('ellipsis')
  }

  // Always show last page
  if (total > 1) {
    pages.push(total)
  }

  return pages
})

/**
 * Handle page change
 */
const handlePageChange = (page: number) => {
  if (page === props.currentPage) return
  if (page < 1 || page > props.totalPages) return

  emit('update:currentPage', page)
  emit('page-change', page)
}

/**
 * Handle previous page
 */
const handlePrevious = () => {
  if (props.currentPage > 1) {
    handlePageChange(props.currentPage - 1)
  }
}

/**
 * Handle next page
 */
const handleNext = () => {
  if (props.currentPage < props.totalPages) {
    handlePageChange(props.currentPage + 1)
  }
}

/**
 * Size classes for buttons
 */
const buttonSizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'h-10 w-10'
    case 'lg':
      return 'h-16 w-16'
    case 'md':
    default:
      return 'h-12 w-12'
  }
})

/**
 * Size classes for icons
 */
const iconSizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'h-4 w-4'
    case 'lg':
      return 'h-8 w-8'
    case 'md':
    default:
      return 'h-6 w-6'
  }
})

/**
 * Size classes for page numbers
 */
const pageNumberSizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'text-sm px-2 py-1'
    case 'lg':
      return 'text-lg px-4 py-2'
    case 'md':
    default:
      return 'text-base px-3 py-1.5'
  }
})
</script>

<template>
  <nav
    role="navigation"
    aria-label="Pagination"
    class="flex items-center justify-center gap-2 md:gap-3"
  >
    <!-- Previous Button -->
    <button
      type="button"
      :disabled="currentPage === 1"
      :class="[
        buttonSizeClasses,
        'flex items-center justify-center rounded-full transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        currentPage === 1
          ? 'cursor-not-allowed bg-neutral-200 text-neutral-400 dark:bg-neutral-700 dark:text-neutral-500'
          : 'bg-blue-500 text-neutral-50 hover:bg-blue-600 active:bg-blue-700 shadow-md hover:shadow-lg'
      ]"
      :aria-label="currentPage === 1 ? 'No previous page' : 'Go to previous page'"
      @click="handlePrevious"
    >
      <Icon :name="'heroicons:chevron-left'" :class="iconSizeClasses" />
    </button>

    <!-- Page Numbers (Desktop only) -->
    <div
      v-if="showPageNumbers"
      class="hidden items-center gap-1 md:flex md:gap-2"
    >
      <template v-for="(page, index) in visiblePages" :key="index">
        <!-- Ellipsis -->
        <span
          v-if="page === 'ellipsis'"
          class="px-2 text-neutral-400 dark:text-neutral-500"
          aria-hidden="true"
        >
          ...
        </span>

        <!-- Page Number Button -->
        <button
          v-else
          type="button"
          :class="[
            pageNumberSizeClasses,
            'min-w-[2.5rem] rounded-lg font-medium transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            page === currentPage
              ? 'bg-blue-500 text-neutral-50 hover:bg-blue-600 active:bg-blue-700 shadow-md hover:shadow-lg'
              : 'text-blue-500 hover:bg-blue-50 active:bg-blue-100 dark:text-blue-400 dark:hover:bg-neutral-800 dark:active:bg-neutral-700'
          ]"
          :aria-label="`Go to page ${page}`"
          :aria-current="page === currentPage ? 'page' : undefined"
          @click="handlePageChange(page)"
        >
          {{ page }}
        </button>
      </template>
    </div>

    <!-- Current Page Indicator (Mobile only) -->
    <div
      v-if="showPageNumbers"
      class="flex items-center md:hidden"
    >
      <span class="text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {{ currentPage }}
      </span>
    </div>

    <!-- Next Button -->
    <button
      type="button"
      :disabled="currentPage === totalPages"
      :class="[
        buttonSizeClasses,
        'flex items-center justify-center rounded-full transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        currentPage === totalPages
          ? 'cursor-not-allowed bg-neutral-200 text-neutral-400 dark:bg-neutral-700 dark:text-neutral-500'
          : 'bg-blue-500 text-neutral-50 hover:bg-blue-600 active:bg-blue-700 shadow-md hover:shadow-lg'
      ]"
      :aria-label="currentPage === totalPages ? 'No next page' : 'Go to next page'"
      @click="handleNext"
    >
      <Icon :name="'heroicons:chevron-right'" :class="iconSizeClasses" />
    </button>
  </nav>
</template>

<style scoped>
/* Additional styles if needed */
</style>

