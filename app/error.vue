<script setup lang="ts">
// Custom Error Page - Handles all application errors (404, 403, 500, etc.)
// This page is displayed when an error is thrown anywhere in the application
// Follows Nuxt 4 error handling best practices

import type { NuxtError } from '#app'

// Define props to receive error object from Nuxt
const props = defineProps({
  error: Object as () => NuxtError
})

// Get runtime config for site info
const config = useRuntimeConfig()

// Determine error type and messaging
const errorType = computed(() => {
  const code = props.error?.statusCode || 500

  if (code === 404) {
    return {
      title: 'Page Not Found',
      description: 'Sorry, we couldn\'t find the page you\'re looking for.',
      icon: '404',
      showSearch: true,
      showSuggestions: true
    }
  }

  if (code === 403) {
    return {
      title: 'Access Denied',
      description: 'You don\'t have permission to view this page.',
      icon: '🔒',
      showSearch: false,
      showSuggestions: false
    }
  }

  if (code >= 500) {
    return {
      title: 'Server Error',
      description: 'Something went wrong on our end. We\'re working to fix it.',
      icon: '⚠️',
      showSearch: false,
      showSuggestions: false
    }
  }

  return {
    title: 'Error',
    description: props.error?.message || 'An unexpected error occurred.',
    icon: '⚠️',
    showSearch: false,
    showSuggestions: false
  }
})

// Suggested pages for 404 errors
const suggestedPages = [
  { title: 'Home', path: '/', description: 'Return to the homepage' },
  { title: 'landscape Basics', path: '/landscape-basics', description: 'Learn about landscape fundamentals' },
  { title: 'Search Contractors', path: '/search', description: 'Find landscape pros near you' }
]

// Handle error clearing and navigation
const handleClearError = () => {
  clearError({ redirect: '/' })
}

// Check if we're in development mode
const isDev = computed(() => import.meta.dev)

// Log error in development
if (import.meta.dev) {
  console.error('Error page displayed:', {
    statusCode: props.error?.statusCode,
    statusMessage: props.error?.statusMessage,
    message: props.error?.message,
    url: props.error?.url
  })
}
</script>

<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-900">
    <div class="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <!-- Error Content -->
      <div class="text-center">
        <!-- Error Icon/Code -->
        <div class="mb-8">
          <span class="text-8xl font-bold text-neutral-300 dark:text-neutral-700">
            {{ errorType.icon }}
          </span>
        </div>

        <!-- Error Title -->
        <h1 class="mb-4 font-heading text-4xl font-bold text-neutral-900 dark:text-white sm:text-5xl">
          {{ errorType.title }}
        </h1>

        <!-- Error Description -->
        <p class="mb-8 text-lg text-neutral-600 dark:text-neutral-400">
          {{ errorType.description }}
        </p>

        <!-- Error Details (Development Only) -->
        <div v-if="isDev && error?.message" class="mb-8">
          <details class="rounded-lg border border-neutral-200 bg-white p-4 text-left dark:border-neutral-700 dark:bg-neutral-800">
            <summary class="cursor-pointer font-medium text-neutral-900 dark:text-white">
              Error Details (Dev Only)
            </summary>
            <div class="mt-4 space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
              <p><strong>Status Code:</strong> {{ error.statusCode }}</p>
              <p><strong>Status Message:</strong> {{ error.statusMessage }}</p>
              <p><strong>Message:</strong> {{ error.message }}</p>
              <p v-if="error.url"><strong>URL:</strong> {{ error.url }}</p>
              <pre v-if="error.stack" class="mt-2 overflow-auto rounded bg-neutral-100 p-2 text-xs dark:bg-neutral-900">{{ error.stack }}</pre>
            </div>
          </details>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button
            @click="handleClearError"
            class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600 sm:w-auto"
          >
            <Icon name="lucide:home" class="h-5 w-5" />
            Go to Homepage
          </button>

          <button
            @click="$router.back()"
            class="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-6 py-3 text-base font-semibold text-neutral-900 transition-all hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700 sm:w-auto"
          >
            <Icon name="lucide:arrow-left" class="h-5 w-5" />
            Go Back
          </button>
        </div>

        <!-- Suggested Pages (404 Only) -->
        <div v-if="errorType.showSuggestions" class="mt-16">
          <h2 class="mb-6 text-xl font-semibold text-neutral-900 dark:text-white">
            Suggested Pages
          </h2>
          <div class="grid gap-4 sm:grid-cols-3">
            <NuxtLink
              v-for="page in suggestedPages"
              :key="page.path"
              :to="page.path"
              class="group rounded-lg border border-neutral-200 bg-white p-6 text-left transition-all hover:border-blue-500 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-blue-400"
            >
              <h3 class="mb-2 font-semibold text-neutral-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                {{ page.title }}
              </h3>
              <p class="text-sm text-neutral-600 dark:text-neutral-400">
                {{ page.description }}
              </p>
            </NuxtLink>
          </div>
        </div>

        <!-- Search Section (404 Only) -->
        <div v-if="errorType.showSearch" class="mt-16">
          <h2 class="mb-6 text-xl font-semibold text-neutral-900 dark:text-white">
            Looking for something specific?
          </h2>
          <div class="mx-auto max-w-2xl">
            <div class="relative">
              <input
                type="text"
                placeholder="Search for landscape topics..."
                class="w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 pl-12 text-neutral-900 placeholder-neutral-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:placeholder-neutral-400 dark:focus:border-blue-400 dark:focus:ring-blue-400"
                @keyup.enter="$router.push('/search')"
              />
              <Icon
                name="lucide:search"
                class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400"
              />
            </div>
            <p class="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
              Press Enter to search
            </p>
          </div>
        </div>

        <!-- Help Text -->
        <div class="mt-16 rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800">
          <h3 class="mb-2 font-semibold text-neutral-900 dark:text-white">
            Need Help?
          </h3>
          <p class="text-sm text-neutral-600 dark:text-neutral-400">
            If you continue to experience issues, please contact our support team.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Additional styles if needed */
</style>

