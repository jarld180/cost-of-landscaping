<script setup lang="ts">
import { toast } from 'vue-sonner'

/**
 * Test page for the new admin layout
 * This page is temporary and should be deleted after testing
 */
definePageMeta({
  layout: 'admin'
})

function showToast() {
  toast.success('Success toast!')
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-4">New Admin Layout Test</h1>
    <p class="text-muted-foreground mb-4">
      This page tests the new shadcn-based admin layout with SidebarProvider pattern.
    </p>

    <div class="grid gap-4">
      <UiCard>
        <UiCardHeader>
          <UiCardTitle>Sidebar Test</UiCardTitle>
          <UiCardDescription>
            Test the collapsible sidebar functionality
          </UiCardDescription>
        </UiCardHeader>
        <UiCardContent>
          <ul class="list-disc list-inside space-y-2 text-sm">
            <li>Click the sidebar rail (right edge) to collapse/expand</li>
            <li>Use keyboard shortcut Ctrl+B to toggle sidebar</li>
            <li>On mobile, sidebar should appear as a drawer</li>
            <li>Navigation links should work and close mobile drawer</li>
          </ul>
        </UiCardContent>
      </UiCard>

      <UiCard>
        <UiCardHeader>
          <UiCardTitle>Breadcrumb Test</UiCardTitle>
          <UiCardDescription>
            Breadcrumbs should display the current path
          </UiCardDescription>
        </UiCardHeader>
        <UiCardContent>
          <p class="text-sm text-muted-foreground">
            Current path should show: Dashboard / Test New Layout
          </p>
        </UiCardContent>
      </UiCard>

      <UiCard>
        <UiCardHeader>
          <UiCardTitle>Toast Test</UiCardTitle>
          <UiCardDescription>
            Test Sonner toast notifications
          </UiCardDescription>
        </UiCardHeader>
        <UiCardContent>
          <UiButton @click="showToast">
            Show Success Toast
          </UiButton>
        </UiCardContent>
      </UiCard>
    </div>
  </div>
</template>

