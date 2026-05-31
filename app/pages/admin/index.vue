<script setup lang="ts">
/**
 * Admin Dashboard
 *
 * Main dashboard for the admin panel using shadcn-based components.
 * Styled to match the reference template aesthetic.
 */

import CountUp from 'vue-countup-v3'

// Page metadata - use new admin layout
definePageMeta({
  layout: 'admin'
})

// Simplified stats structure (no trend properties)
interface DashboardStat {
  label: string
  value: number
  description: string
}

const stats = ref<DashboardStat[]>([
  { label: 'Total Contractors', value: 0, description: 'In database' },
  { label: 'Pending Claims', value: 0, description: 'Awaiting review' },
  { label: 'Need Enrichment', value: 0, description: 'Missing AI data' },
  { label: 'Cities', value: 0, description: 'With coverage' }
])

// Fetch in onMounted to trigger CountUp animation
onMounted(async () => {
  try {
    const response = await $fetch('/api/admin/dashboard-stats')
    if (response.success) {
      stats.value = [
        { label: 'Total Contractors', value: response.stats.activeContractors, description: 'In database' },
        { label: 'Pending Claims', value: response.stats.pendingClaims, description: 'Awaiting review' },
        { label: 'Need Enrichment', value: response.stats.needEnrichment, description: 'Missing AI data' },
        { label: 'Cities', value: response.stats.citiesWithCoverage, description: 'With coverage' }
      ]
    }
  } catch {
    // Values remain at 0
  }
})

// Mock recent activity
const recentActivity = ref([
  {
    id: '1',
    action: 'Page created',
    title: 'Concrete Contractors in Los Angeles',
    user: 'Admin User',
    timestamp: '2 hours ago'
  },
  {
    id: '2',
    action: 'Page updated',
    title: 'Cost of Concrete Calculator',
    user: 'Admin User',
    timestamp: '5 hours ago'
  },
  {
    id: '3',
    action: 'Menu updated',
    title: 'Footer Navigation',
    user: 'Admin User',
    timestamp: '1 day ago'
  },
  {
    id: '4',
    action: 'Page published',
    title: 'Concrete Pricing Guide 2024',
    user: 'Admin User',
    timestamp: '2 days ago'
  }
])

// Quick actions
const quickActions = ref([
  {
    label: 'Create Page',
    icon: 'heroicons:plus-circle',
    href: '/admin/pages/new',
    variant: 'default' as const
  },
  {
    label: 'Manage Pages',
    icon: 'heroicons:document-text',
    href: '/admin/pages',
    variant: 'outline' as const
  },
  {
    label: 'Manage Menus',
    icon: 'heroicons:bars-3',
    href: '/admin/menus',
    variant: 'outline' as const
  },
  {
    label: 'Settings',
    icon: 'heroicons:cog-6-tooth',
    href: '/admin/settings',
    variant: 'outline' as const
  }
])


</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <!-- Page Header -->
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-2xl font-bold tracking-tight">
        Dashboard
      </h2>
      <p class="text-sm text-muted-foreground">
        Welcome back! Here's what's happening with your site.
      </p>
    </div>

    <!-- Stats Grid - Matching reference template structure -->
    <main class="@container/main flex flex-1 flex-col gap-4 md:gap-8">
      <div class="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        <UiCard v-for="stat in stats" :key="stat.label" class="@container/card">
          <UiCardHeader>
            <UiCardDescription>{{ stat.label }}</UiCardDescription>
            <UiCardTitle class="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              <CountUp :end-val="stat.value" />
            </UiCardTitle>

          </UiCardHeader>
          <UiCardFooter class="flex-col items-start gap-1.5 text-sm">

            <div class="text-muted-foreground">
              {{ stat.description }}
            </div>
          </UiCardFooter>
        </UiCard>
      </div>

      <!-- Content Grid -->
      <div class="grid grid-cols-1 gap-4 md:gap-8 lg:grid-cols-2">
        <!-- Quick Actions -->
        <UiCard class="@container/card">
          <UiCardHeader>
            <UiCardTitle>Quick Actions</UiCardTitle>
          </UiCardHeader>
          <UiCardContent>
            <div class="grid grid-cols-2 gap-3">
              <UiButton
                v-for="action in quickActions"
                :key="action.label"
                :variant="action.variant"
                as-child
                class="h-auto flex-col gap-2 py-4"
              >
                <NuxtLink :to="action.href">
                  <Icon :name="action.icon" class="size-8" />
                  <span class="text-sm font-medium">
                    {{ action.label }}
                  </span>
                </NuxtLink>
              </UiButton>
            </div>
          </UiCardContent>
        </UiCard>

        <!-- Recent Activity -->
        <UiCard class="@container/card">
          <UiCardHeader>
            <UiCardTitle>Recent Activity</UiCardTitle>
          </UiCardHeader>
          <UiCardContent>
            <div class="space-y-4">
              <div
                v-for="activity in recentActivity"
                :key="activity.id"
                class="flex items-start gap-3 border-b pb-4 last:border-0 last:pb-0"
              >
                <div class="rounded-full bg-primary/10 p-2">
                  <Icon
                    name="heroicons:clock"
                    class="size-4 text-primary"
                  />
                </div>
                <div class="flex-1">
                  <p class="text-sm font-medium">
                    {{ activity.action }}
                  </p>
                  <p class="mt-1 text-sm text-muted-foreground">
                    {{ activity.title }}
                  </p>
                  <p class="mt-1 text-xs text-muted-foreground">
                    {{ activity.timestamp }}
                  </p>
                </div>
              </div>
            </div>
          </UiCardContent>
        </UiCard>
      </div>
    </main>
  </div>
</template>
