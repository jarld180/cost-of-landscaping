<script setup lang="ts">
// Hub Sidebar Component
// Displays grouped navigation sections for hub pages
// Sticky on desktop, collapsible on mobile

import { computed } from 'vue'

interface NavigationLink {
  label: string
  to: string
}

interface NavigationSection {
  title: string
  links: NavigationLink[]
}

interface Props {
  /**
   * Array of navigation sections with grouped links
   */
  sections: NavigationSection[]

  /**
   * The current active page path (to highlight active link)
   */
  activePage: string

  /**
   * Whether the sidebar should be sticky on desktop
   * @default true
   */
  sticky?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  sticky: true
})

// Check if a link is active
const isActiveLink = (linkTo: string) => {
  return props.activePage === linkTo
}

// Sidebar container classes
const sidebarClasses = computed(() => {
  const classes = [
    'border-r border-neutral-200 bg-white p-6',
    'dark:border-neutral-700 dark:bg-neutral-900'
  ]

  if (props.sticky) {
    classes.push('lg:sticky lg:top-2 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto')
  }

  return classes.join(' ')
})
</script>

<template>
  <aside :class="sidebarClasses">
    <!-- Sidebar Title -->
    <!-- <h2 class="mb-6 font-heading text-xl font-bold text-neutral-900 dark:text-neutral-100">
      Browse Topics
    </h2> -->

    <!-- Navigation Sections -->
    <nav class="space-y-8">
      <div
        v-for="section in sections"
        :key="section.title"
        class="space-y-3"
      >
        <!-- Section Title -->
        <h3 class="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {{ section.title }}
        </h3>

        <!-- Section Links -->
        <ul class="space-y-2">
          <li
            v-for="link in section.links"
            :key="link.to"
          >
            <NuxtLink
              :to="link.to"
              :class="[
                'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActiveLink(link.to)
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-neutral-700 hover:bg-neutral-100 hover:text-blue-600 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-blue-400'
              ]"
            >
              {{ link.label }}
            </NuxtLink>
          </li>
        </ul>

        <!-- Divider between sections (except last) -->
        <Divider v-if="section !== sections[sections.length - 1]" class="!mt-6" />
      </div>
    </nav>
  </aside>
</template>

<style scoped>
</style>

