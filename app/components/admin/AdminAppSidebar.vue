<script setup lang="ts">
/**
 * Admin App Sidebar
 * Main sidebar component for the admin panel using shadcn sidebar primitives
 */
import type { AdminNavLink, AdminNavGroup, AdminNavSectionTitle } from '~/types/admin-nav'
import { adminNavMenu, adminNavMenuBottom } from '~/constants/admin-menus'

function resolveNavItemComponent(item: AdminNavLink | AdminNavGroup | AdminNavSectionTitle): any {
  if ('children' in item)
    return resolveComponent('AdminSidebarNavGroup')

  return resolveComponent('AdminSidebarNavLink')
}
</script>

<template>
  <UiSidebar collapsible="offcanvas" variant="inset">
    <UiSidebarHeader>
      <AdminSidebarNavHeader />
    </UiSidebarHeader>
    <UiSidebarContent>
      <UiSidebarGroup v-for="(nav, indexGroup) in adminNavMenu" :key="indexGroup">
        <UiSidebarGroupLabel v-if="nav.heading">
          {{ nav.heading }}
        </UiSidebarGroupLabel>
        <component
          :is="resolveNavItemComponent(item)"
          v-for="(item, index) in nav.items"
          :key="index"
          :item="item"
        />
      </UiSidebarGroup>
      <UiSidebarGroup class="mt-auto">
        <component
          :is="resolveNavItemComponent(item)"
          v-for="(item, index) in adminNavMenuBottom"
          :key="index"
          :item="item"
          size="sm"
        />
      </UiSidebarGroup>
    </UiSidebarContent>
    <UiSidebarFooter>
      <AdminSidebarNavFooter />
    </UiSidebarFooter>
    <UiSidebarRail />
  </UiSidebar>
</template>

