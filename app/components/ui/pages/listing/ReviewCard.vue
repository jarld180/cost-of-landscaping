<script setup lang="ts">
/**
 * PublicReview interface - matches real Google review data from API
 */
export interface PublicReview {
  id: string
  authorName: string
  authorInitials: string
  authorPhotoUrl: string | null
  rating: number
  date: string
  content: string
  isLocalGuide: boolean
  likesCount: number
  ownerResponse: {
    text: string
    date: string | null
  } | null
}

interface Props {
  /** The review data to display */
  review: PublicReview
  /** Maximum characters before showing "Read more" */
  truncateAt?: number
}

const props = withDefaults(defineProps<Props>(), {
  truncateAt: 200
})

// Expand/collapse state for long reviews
const isExpanded = ref(false)

// Expand/collapse state for owner response
const isResponseExpanded = ref(false)

// Check if content needs truncation
const needsTruncation = computed(() => props.review.content.length > props.truncateAt)

// Displayed content (truncated or full)
const displayedContent = computed(() => {
  if (!needsTruncation.value || isExpanded.value) {
    return props.review.content
  }
  return props.review.content.slice(0, props.truncateAt) + '...'
})

// Format date as relative time (e.g., "2 months ago")
const formatRelativeDate = (dateStr: string | null) => {
  if (!dateStr) return ''
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30)
    return `${months} ${months === 1 ? 'month' : 'months'} ago`
  }
  const years = Math.floor(diffDays / 365)
  return `${years} ${years === 1 ? 'year' : 'years'} ago`
}

const relativeDate = computed(() => formatRelativeDate(props.review.date))
const responseRelativeDate = computed(() =>
  props.review.ownerResponse ? formatRelativeDate(props.review.ownerResponse.date) : ''
)

// Generate avatar background color based on initials
const avatarColor = computed(() => {
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
    'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-red-500'
  ]
  const index = props.review.authorName.charCodeAt(0) % colors.length
  return colors[index]
})

// Star rating calculation
const starRating = computed(() => {
  const rating = props.review.rating
  return {
    full: rating,
    empty: 5 - rating
  }
})

// Toggle expand/collapse
const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
}

// Toggle owner response
const toggleResponse = () => {
  isResponseExpanded.value = !isResponseExpanded.value
}
</script>

<template>
  <article class="border-b border-neutral-200 pb-6 last:border-b-0 dark:border-neutral-700">
    <!-- Header: Avatar, Name, Local Guide, Date, Stars -->
    <div class="mb-3 flex items-start justify-between gap-4">
      <div class="flex items-center gap-3">
        <!-- Avatar: Real photo or initials fallback -->
        <div
          v-if="review.authorPhotoUrl"
          class="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden"
        >
          <img
            :src="review.authorPhotoUrl"
            :alt="review.authorName"
            class="h-full w-full object-cover"
          />
        </div>
        <div
          v-else
          :class="[avatarColor, 'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full']"
        >
          <span class="text-sm font-bold text-white">{{ review.authorInitials }}</span>
        </div>

        <!-- Name & Local Guide Badge -->
        <div>
          <div class="flex items-center gap-2">
            <span class="font-semibold text-neutral-900 dark:text-white">
              {{ review.authorName }}
            </span>
          </div>
          <!-- Local Guide & Date -->
          <div class="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
            <span
              v-if="review.isLocalGuide"
              class="flex items-center gap-1 text-blue-600 dark:text-blue-400"
            >
              <Icon name="heroicons:map-pin" class="h-3.5 w-3.5" />
              Local Guide
            </span>
            <span v-if="review.isLocalGuide">·</span>
            <span>{{ relativeDate }}</span>
          </div>
        </div>
      </div>

      <!-- Star Rating -->
      <div class="flex items-center gap-0.5">
        <Icon
          v-for="i in starRating.full"
          :key="`full-${i}`"
          name="heroicons:star-solid"
          class="h-4 w-4 text-yellow-400"
        />
        <Icon
          v-for="i in starRating.empty"
          :key="`empty-${i}`"
          name="heroicons:star"
          class="h-4 w-4 text-neutral-300 dark:text-neutral-600"
        />
      </div>
    </div>

    <!-- Review Content -->
    <p class="mb-3 text-sm text-neutral-600 dark:text-neutral-300">
      {{ displayedContent }}
      <button
        v-if="needsTruncation"
        type="button"
        class="ml-1 font-medium text-blue-500 hover:text-blue-600 hover:underline dark:text-blue-400"
        @click="toggleExpand"
      >
        {{ isExpanded ? 'Read less' : 'Read more' }}
      </button>
    </p>

    <!-- Footer: Helpful count -->
    <div
      v-if="review.likesCount > 0"
      class="mb-3 flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400"
    >
      <Icon name="heroicons:hand-thumb-up" class="h-4 w-4" />
      {{ review.likesCount }} found helpful
    </div>

    <!-- Owner Response (Collapsible) -->
    <div v-if="review.ownerResponse" class="mt-3">
      <button
        type="button"
        class="flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
        @click="toggleResponse"
      >
        <Icon
          :name="isResponseExpanded ? 'heroicons:chevron-down' : 'heroicons:chevron-right'"
          class="h-4 w-4"
        />
        <Icon name="heroicons:chat-bubble-left-ellipsis" class="h-4 w-4" />
        Owner response
        <span v-if="responseRelativeDate" class="font-normal text-neutral-400">
          · {{ responseRelativeDate }}
        </span>
      </button>

      <!-- Response Content -->
      <div
        v-if="isResponseExpanded"
        class="mt-2 rounded-lg border-l-4 border-blue-500 bg-neutral-50 py-3 pl-4 pr-3 dark:bg-neutral-800/50"
      >
        <p class="text-sm text-neutral-600 dark:text-neutral-300">
          {{ review.ownerResponse.text }}
        </p>
      </div>
    </div>
  </article>
</template>

<style scoped>
</style>

