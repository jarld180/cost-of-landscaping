<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'

interface Props {
  /**
   * Array of image URLs to display in the lightbox
   */
  images: string[]

  /**
   * Initial image index to display
   * @default 0
   */
  initialIndex?: number

  /**
   * Whether the lightbox is open (controlled mode)
   */
  open?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  initialIndex: 0,
  open: false
})

interface Emits {
  (e: 'update:open', value: boolean): void
}

const emit = defineEmits<Emits>()

// Current image index
const currentIndex = ref(props.initialIndex)

// Watch for initialIndex changes
watch(() => props.initialIndex, (newIndex) => {
  currentIndex.value = newIndex
})

// Navigation functions
const goToPrevious = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--
  }
}

const goToNext = () => {
  if (currentIndex.value < props.images.length - 1) {
    currentIndex.value++
  }
}

const close = () => {
  emit('update:open', false)
}

// Keyboard navigation
const handleKeydown = (event: KeyboardEvent) => {
  if (!props.open) return

  switch (event.key) {
    case 'ArrowLeft':
      event.preventDefault()
      goToPrevious()
      break
    case 'ArrowRight':
      event.preventDefault()
      goToNext()
      break
    case 'Escape':
      event.preventDefault()
      close()
      break
  }
}

// Add/remove keyboard listener
onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

// Computed values
const isFirstImage = computed(() => currentIndex.value === 0)
const isLastImage = computed(() => currentIndex.value === props.images.length - 1)
const currentImageUrl = computed(() => props.images[currentIndex.value])
const imageCounter = computed(() => `${currentIndex.value + 1} / ${props.images.length}`)
</script>

<template>
  <DialogRoot
    :open="open"
    @update:open="(value) => emit('update:open', value)"
  >
    <DialogPortal>
      <!-- Dark overlay backdrop -->
      <DialogOverlay
        class="fixed inset-0 z-50 bg-black/90 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
      />

      <!-- Lightbox content -->
      <DialogContent
        class="fixed left-[50%] top-[50%] z-50 flex h-screen w-screen translate-x-[-50%] translate-y-[-50%] items-center justify-center focus:outline-none"
        @interact-outside="close"
      >
        <!-- Visually hidden title for accessibility -->
        <DialogTitle class="sr-only">
          Image {{ currentIndex + 1 }} of {{ images.length }}
        </DialogTitle>

        <!-- Visually hidden description for accessibility -->
        <DialogDescription class="sr-only">
          Image gallery lightbox. Use arrow keys to navigate between images, or press Escape to close.
        </DialogDescription>

        <!-- Close button -->
        <button
          @click="close"
          class="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 sm:right-6 sm:top-6"
          aria-label="Close lightbox"
        >
          <Icon name="heroicons:x-mark" class="h-6 w-6" />
        </button>

        <!-- Previous button -->
        <button
          v-if="!isFirstImage"
          @click="goToPrevious"
          class="absolute left-4 top-[50%] z-10 flex h-12 w-12 translate-y-[-50%] items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 sm:left-6"
          aria-label="Previous image"
        >
          <Icon name="heroicons:chevron-left" class="h-8 w-8" />
        </button>

        <!-- Next button -->
        <button
          v-if="!isLastImage"
          @click="goToNext"
          class="absolute right-4 top-[50%] z-10 flex h-12 w-12 translate-y-[-50%] items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 sm:right-6"
          aria-label="Next image"
        >
          <Icon name="heroicons:chevron-right" class="h-8 w-8" />
        </button>

        <!-- Image container -->
        <div class="flex h-full w-full items-center justify-center p-4 sm:p-12">
          <img
            :src="currentImageUrl"
            :alt="`Image ${currentIndex + 1} of ${images.length}`"
            class="max-h-[90vh] max-w-[90vw] object-contain transition-opacity duration-300"
          />
        </div>

        <!-- Image counter -->
        <div
          class="absolute bottom-6 left-[50%] translate-x-[-50%] rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm"
        >
          {{ imageCounter }}
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

