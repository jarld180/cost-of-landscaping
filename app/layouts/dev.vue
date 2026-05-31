<script setup lang="ts">
// Dev layout for UI component showcase pages
// Features a fixed header navigation for quick component section access

const navItems = [
  { name: 'Eyebrows', href: '#eyebrows' },
  { name: 'Badges', href: '#badges' },
  { name: 'Buttons', href: '#buttons' },
  { name: 'Popovers', href: '#popovers' },
  { name: 'Dialogs', href: '#dialogs' },
  { name: 'Cards', href: '#cards' },
  { name: 'Search Inputs', href: '#search-inputs' },
  { name: 'Dividers', href: '#dividers' }
]

const colorMode = useColorMode()

// Track if component is mounted to avoid hydration mismatch
// Server always renders light mode, client updates after mount
const isMounted = ref(false)

// Viewport mode state - initialize with desktop to match SSR
const viewportMode = ref<'desktop' | 'tablet' | 'mobile'>('desktop')

onMounted(() => {
  isMounted.value = true

  // Load viewport mode from localStorage after mount
  const savedViewport = localStorage.getItem('dev-viewport-mode')
  if (savedViewport && ['desktop', 'tablet', 'mobile'].includes(savedViewport)) {
    viewportMode.value = savedViewport as 'desktop' | 'tablet' | 'mobile'
  }
})

// Watch for viewport changes and save to localStorage
watch(viewportMode, (newMode) => {
  if (import.meta.client) {
    localStorage.setItem('dev-viewport-mode', newMode)
  }
})

// Computed properties for color mode dependent values
// Use fallback values during SSR to match server render
const currentColorMode = computed(() => isMounted.value ? colorMode.value : 'light')
const logoSrc = computed(() => currentColorMode.value === 'dark' ? '/images/logo-dark.webp' : '/images/logo-light.webp')
const themeIcon = computed(() => currentColorMode.value === 'dark' ? 'heroicons:sun' : 'heroicons:moon')
const themeToggleLabel = computed(() => currentColorMode.value === 'dark' ? 'Switch to light mode' : 'Switch to dark mode')

const toggleColorMode = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

// Computed property for content max-width
const contentMaxWidth = computed(() => {
  const widths = {
    mobile: 'max-w-[400px]',
    tablet: 'max-w-[768px]',
    desktop: 'max-w-8xl'
  }
  return widths[viewportMode.value]
})

// Computed property for viewport width label
const viewportLabel = computed(() => {
  const labels = {
    mobile: '400px',
    tablet: '768px',
    desktop: 'Full Width'
  }
  return labels[viewportMode.value]
})

// Check if viewport is constrained (mobile or tablet)
const isConstrainedViewport = computed(() => viewportMode.value !== 'desktop')

// Handler to change viewport
const setViewport = (mode: 'desktop' | 'tablet' | 'mobile') => {
  viewportMode.value = mode
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-neutral-100 font-sans dark:bg-neutral-800">
    <!-- Fixed Header Navigation -->
    <header class="fixed top-0 z-50 w-full border-b border-neutral-200 bg-neutral-50/95 shadow-sm backdrop-blur-sm dark:border-neutral-700 dark:bg-neutral-900/95">
      <div class="mx-auto max-w-8xl px-4 py-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between">
          <!-- Logo/Title -->
          <div class="flex items-center gap-6">
            <NuxtLink to="/" class="transition-opacity hover:opacity-80">
              <img
                :src="logoSrc"
                alt="Cost of Landscaping"
                class="h-8 w-auto"
              />
            </NuxtLink>
            <span class="hidden text-neutral-400 dark:text-neutral-600 sm:inline">|</span>
            <span class="hidden text-sm font-medium text-neutral-500 dark:text-neutral-400 sm:inline">Dev UI Showcase</span>
          </div>

          <!-- Right Side: Component Navigation + Viewport Controls + Color Mode Toggle -->
          <div class="flex items-center gap-4">
            <!-- Component Navigation -->
            <nav class="flex items-center gap-1">
              <a
                v-for="item in navItems"
                :key="item.href"
                :href="item.href"
                class="rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 transition-all hover:bg-neutral-100 hover:text-blue-500 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-blue-400"
              >
                {{ item.name }}
              </a>
            </nav>

            <!-- Viewport Controls -->
            <div class="flex items-center gap-1 border-l border-neutral-300 pl-4 dark:border-neutral-600">
              <!-- Mobile Viewport Button -->
              <button
                @click="setViewport('mobile')"
                :class="[
                  'rounded-lg p-2 transition-all',
                  viewportMode === 'mobile'
                    ? 'bg-blue-500 text-white dark:bg-blue-600'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-blue-500 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-blue-400'
                ]"
                :aria-label="`Switch to mobile viewport (400px)`"
                title="Mobile (400px)"
              >
                <Icon name="heroicons:device-phone-mobile" class="h-5 w-5" />
              </button>

              <!-- Tablet Viewport Button -->
              <button
                @click="setViewport('tablet')"
                :class="[
                  'rounded-lg p-2 transition-all',
                  viewportMode === 'tablet'
                    ? 'bg-blue-500 text-white dark:bg-blue-600'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-blue-500 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-blue-400'
                ]"
                :aria-label="`Switch to tablet viewport (768px)`"
                title="Tablet (768px)"
              >
                <Icon name="heroicons:device-tablet" class="h-5 w-5" />
              </button>

              <!-- Desktop Viewport Button -->
              <button
                @click="setViewport('desktop')"
                :class="[
                  'rounded-lg p-2 transition-all',
                  viewportMode === 'desktop'
                    ? 'bg-blue-500 text-white dark:bg-blue-600'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-blue-500 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-blue-400'
                ]"
                :aria-label="`Switch to desktop viewport (full width)`"
                title="Desktop (Full Width)"
              >
                <Icon name="heroicons:computer-desktop" class="h-5 w-5" />
              </button>

              <!-- Viewport Width Label -->
              <span class="ml-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                {{ viewportLabel }}
              </span>
            </div>

            <!-- Color Mode Toggle -->
            <button
              @click="toggleColorMode"
              class="rounded-lg p-2 text-neutral-600 transition-all hover:bg-neutral-100 hover:text-blue-500 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-blue-400"
              :aria-label="themeToggleLabel"
            >
              <Icon
                :name="themeIcon"
                class="h-5 w-5"
              />
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content with top padding to account for fixed header -->
    <main class="flex-1 pt-20">
      <!-- Container query wrapper -->
      <div
        :class="[
          contentMaxWidth,
          '@container mx-auto px-1 py-8 transition-all duration-300 sm:px-1 lg:px-2',
          isConstrainedViewport ? 'border-x-2 border-blue-400 bg-white shadow-xl dark:border-blue-500 dark:bg-neutral-900' : ''
        ]"
      >
        <slot />
      </div>
    </main>

    <!-- Footer -->
    <footer class="mt-auto border-t border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900">
      <div class="mx-auto max-w-8xl px-4 py-6 sm:px-6 lg:px-8">
        <p class="text-center text-sm text-neutral-500 dark:text-neutral-400">
          © {{ new Date().getFullYear() }} Cost of landscape. Built with Nuxt 4 & Tailwind CSS.
        </p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* Smooth scrolling for anchor links */
:global(html) {
  scroll-behavior: smooth;
}

/* Add scroll padding to account for fixed header */
:global(html) {
  scroll-padding-top: 6rem;
}
</style>

