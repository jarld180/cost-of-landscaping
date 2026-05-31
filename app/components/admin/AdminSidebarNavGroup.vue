<script setup lang="ts">
import type { SidebarMenuButtonVariants } from '~/components/admin-ui/sidebar'
import type { AdminNavGroup } from '~/types/admin-nav'
import { useSidebar } from '~/components/admin-ui/sidebar'

withDefaults(defineProps<{
  item: AdminNavGroup
  size?: SidebarMenuButtonVariants['size']
}>(), {
  size: 'default',
})

const { setOpenMobile } = useSidebar()

const openCollapsible = ref(false)
</script>

<template>
  <UiSidebarMenu>
    <UiCollapsible
      :key="item.title"
      v-model:open="openCollapsible"
      as-child
      class="group/collapsible"
    >
      <UiSidebarMenuItem>
        <UiCollapsibleTrigger as-child>
          <UiSidebarMenuButton :tooltip="item.title" :size="size">
            <Icon :name="item.icon || ''" mode="svg" />
            <span>{{ item.title }}</span>
            <span v-if="item.new" class="rounded-md bg-[#adfa1d] px-1.5 py-0.5 text-xs text-black leading-none no-underline group-hover:no-underline">
              New
            </span>
            <Icon name="i-lucide-chevron-right" class="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </UiSidebarMenuButton>
        </UiCollapsibleTrigger>
        <UiCollapsibleContent>
          <UiSidebarMenuSub>
            <UiSidebarMenuSubItem
              v-for="subItem in item.children"
              :key="subItem.title"
            >
              <UiSidebarMenuSubButton as-child :data-active="subItem.link === $route.path">
                <NuxtLink :to="subItem.link" @click="setOpenMobile(false)">
                  <span>{{ subItem.title }}</span>
                  <span v-if="subItem.new" class="rounded-md bg-[#adfa1d] px-1.5 py-0.5 text-xs text-black leading-none no-underline group-hover:no-underline">
                    New
                  </span>
                </NuxtLink>
              </UiSidebarMenuSubButton>
            </UiSidebarMenuSubItem>
          </UiSidebarMenuSub>
        </UiCollapsibleContent>
      </UiSidebarMenuItem>
    </UiCollapsible>
  </UiSidebarMenu>
</template>

