<script setup lang="ts">
import type { SidebarMenuButtonVariants } from '~/components/admin-ui/sidebar'
import type { AdminNavLink } from '~/types/admin-nav'
import { useSidebar } from '~/components/admin-ui/sidebar'

withDefaults(defineProps<{
  item: AdminNavLink
  size?: SidebarMenuButtonVariants['size']
}>(), {
  size: 'default',
})

const { setOpenMobile } = useSidebar()
</script>

<template>
  <UiSidebarMenu>
    <UiSidebarMenuItem>
      <UiSidebarMenuButton as-child :tooltip="item.title" :size="size" :data-active="item.link === $route.path">
        <NuxtLink
          :to="item.link"
          :target="item.external ? '_blank' : undefined"
          :rel="item.external ? 'noopener noreferrer' : undefined"
          @click="setOpenMobile(false)"
        >
          <Icon :name="item.icon || ''" />
          <span>{{ item.title }}</span>
          <span v-if="item.new" class="rounded-md bg-[#adfa1d] px-1.5 py-0.5 text-xs text-black leading-none no-underline group-hover:no-underline">
            New
          </span>
        </NuxtLink>
      </UiSidebarMenuButton>
    </UiSidebarMenuItem>
  </UiSidebarMenu>
</template>

