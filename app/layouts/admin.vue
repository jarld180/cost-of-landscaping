<script setup lang="ts">
/**
 * Admin Layout
 *
 * shadcn-based admin layout with SidebarProvider pattern.
 * Features:
 * - Collapsible sidebar with icon mode
 * - Mobile drawer (responsive)
 * - Dark mode support via CSS custom properties
 * - Breadcrumbs
 * - Toast notifications via Sonner
 *
 * NOTE: SSR is disabled for all /admin/** routes via nuxt.config.ts routeRules.
 * This eliminates hydration issues since the page is rendered client-side only.
 */
</script>

<template>
  <UiSidebarProvider class="bg-sidebar">
    <AdminAppSidebar />
    <UiSidebarInset class="md:shadow-sm">
      <AdminHeader />
      <div class="flex flex-1 flex-col">
        <div class="flex-1 p-4 lg:p-6">
          <slot />
        </div>
      </div>
    </UiSidebarInset>
  </UiSidebarProvider>
  <!-- Toast notifications via Sonner -->
  <UiSonner />
</template>

<style>
@import '~/assets/css/admin-theme.css';
</style>

