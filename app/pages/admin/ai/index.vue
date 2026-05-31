<script setup lang="ts">
/**
 * AI Overview Dashboard
 *
 * Landing page for the AI section showing job stats and quick actions.
 */

import CountUp from 'vue-countup-v3'

definePageMeta({
  layout: 'admin'
})

// Fetch AI stats
const { data: statsData, pending, error, refresh } = await useFetch('/api/ai/stats', {
  lazy: true
})

// Computed stats with defaults
const stats = computed(() => statsData.value?.stats ?? {
  total: 0,
  pending: 0,
  processing: 0,
  completed: 0,
  failed: 0,
  cancelled: 0
})

// Quick action cards
const quickActions = [
  {
    title: 'Article Writing',
    description: 'Generate SEO-optimized articles using AI agents',
    icon: 'i-lucide-pen-tool',
    link: '/admin/ai/article-writing',
    color: 'text-blue-500'
  },
  {
    title: 'Manage Personas',
    description: 'Configure AI agent personalities and prompts',
    icon: 'i-lucide-users-round',
    link: '/admin/ai/personas',
    color: 'text-purple-500'
  }
]
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold">AI Overview</h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Manage AI-powered content generation and agent configurations
      </p>
    </div>

    <!-- Error State -->
    <UiCard v-if="error" class="mb-6 border-destructive bg-destructive/10">
      <UiCardContent class="pt-6">
        <div class="flex items-start gap-3">
          <Icon name="i-lucide-alert-triangle" class="mt-0.5 size-5 flex-shrink-0 text-destructive" />
          <div>
            <h3 class="text-sm font-medium text-destructive">Error loading stats</h3>
            <p class="mt-1 text-sm text-destructive/80">{{ error.message }}</p>
            <UiButton variant="outline" size="sm" class="mt-2" @click="refresh()">
              <Icon name="i-lucide-refresh-cw" class="mr-1 size-4" />
              Retry
            </UiButton>
          </div>
        </div>
      </UiCardContent>
    </UiCard>

    <!-- Stats Grid -->
    <div class="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
      <!-- Total Jobs -->
      <UiCard>
        <UiCardHeader class="pb-2">
          <UiCardDescription>Total Jobs</UiCardDescription>
          <UiCardTitle class="text-2xl font-semibold tabular-nums">
            <CountUp :end-val="stats.total" />
          </UiCardTitle>
        </UiCardHeader>
      </UiCard>

      <!-- Processing -->
      <UiCard>
        <UiCardHeader class="pb-2">
          <UiCardDescription class="flex items-center gap-1.5">
            <span class="relative flex size-2">
              <span class="absolute inline-flex size-full animate-ping rounded-full bg-blue-400 opacity-75" />
              <span class="relative inline-flex size-2 rounded-full bg-blue-500" />
            </span>
            Processing
          </UiCardDescription>
          <UiCardTitle class="text-2xl font-semibold tabular-nums text-blue-600 dark:text-blue-400">
            <CountUp :end-val="stats.processing" />
          </UiCardTitle>
        </UiCardHeader>
      </UiCard>

      <!-- Pending -->
      <UiCard>
        <UiCardHeader class="pb-2">
          <UiCardDescription>Pending</UiCardDescription>
          <UiCardTitle class="text-2xl font-semibold tabular-nums text-amber-600 dark:text-amber-400">
            <CountUp :end-val="stats.pending" />
          </UiCardTitle>
        </UiCardHeader>
      </UiCard>

      <!-- Completed -->
      <UiCard>
        <UiCardHeader class="pb-2">
          <UiCardDescription>Completed</UiCardDescription>
          <UiCardTitle class="text-2xl font-semibold tabular-nums text-green-600 dark:text-green-400">
            <CountUp :end-val="stats.completed" />
          </UiCardTitle>
        </UiCardHeader>
      </UiCard>

      <!-- Failed -->
      <UiCard>
        <UiCardHeader class="pb-2">
          <UiCardDescription>Failed</UiCardDescription>
          <UiCardTitle class="text-2xl font-semibold tabular-nums text-red-600 dark:text-red-400">
            <CountUp :end-val="stats.failed" />
          </UiCardTitle>
        </UiCardHeader>
      </UiCard>
    </div>

    <!-- Quick Actions -->
    <div class="mb-6">
      <h2 class="mb-4 text-lg font-semibold">Quick Actions</h2>
      <div class="grid gap-4 md:grid-cols-2">
        <NuxtLink
          v-for="action in quickActions"
          :key="action.title"
          :to="action.link"
          class="group"
        >
          <UiCard class="h-full transition-colors hover:border-primary/50 hover:bg-accent/50">
            <UiCardHeader>
              <div class="flex items-start gap-4">
                <div class="rounded-lg bg-muted p-2">
                  <Icon :name="action.icon" :class="['size-6', action.color]" />
                </div>
                <div class="flex-1">
                  <UiCardTitle class="text-base group-hover:text-primary">
                    {{ action.title }}
                    <Icon name="i-lucide-arrow-right" class="ml-1 inline size-4 opacity-0 transition-opacity group-hover:opacity-100" />
                  </UiCardTitle>
                  <UiCardDescription class="mt-1">
                    {{ action.description }}
                  </UiCardDescription>
                </div>
              </div>
            </UiCardHeader>
          </UiCard>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

