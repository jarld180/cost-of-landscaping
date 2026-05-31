<script setup lang="ts">
/**
 * Admin Sidebar Footer
 * Displays the current user with dropdown menu for logout, etc.
 */
import { useSidebar } from '~/components/admin-ui/sidebar'

const { isMobile, setOpenMobile, state } = useSidebar()

// Supabase auth
const supabase = useSupabaseClient()
const user = useSupabaseUser()

async function handleLogout() {
  await supabase.auth.signOut()

  // Invalidate the middleware's cached auth state to ensure clean logout
  const authUserState = useState<any | null | undefined>('admin-auth:user', () => undefined)
  const isAdminState = useState<boolean | undefined>('admin-auth:isAdmin', () => undefined)
  const accountStatusState = useState<string | null | undefined>('admin-auth:status', () => undefined)
  authUserState.value = undefined
  isAdminState.value = undefined
  accountStatusState.value = undefined

  navigateTo('/login')
}
</script>

<template>
  <UiSidebarMenu>
    <UiSidebarMenuItem>
      <UiDropdownMenu>
        <UiDropdownMenuTrigger as-child>
          <UiSidebarMenuButton
            size="lg"
            class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <div class="flex aspect-square size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Icon name="i-lucide-user" class="size-4" />
            </div>
            <div v-if="state === 'expanded'" class="grid flex-1 text-left text-sm leading-tight">
              <span class="truncate font-semibold">{{ user?.email || 'Admin' }}</span>
              <span class="truncate text-xs text-muted-foreground">Administrator</span>
            </div>
            <Icon v-if="state === 'expanded'" name="i-lucide-chevrons-up-down" class="ml-auto size-4" />
          </UiSidebarMenuButton>
        </UiDropdownMenuTrigger>
        <UiDropdownMenuContent
          class="min-w-56 w-[--reka-dropdown-menu-trigger-width] rounded-lg"
          :side="isMobile ? 'bottom' : 'right'"
          align="end"
        >
          <UiDropdownMenuLabel class="p-0 font-normal">
            <div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <div class="flex aspect-square size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Icon name="i-lucide-user" class="size-4" />
              </div>
              <div class="grid flex-1 text-left text-sm leading-tight">
                <span class="truncate font-semibold">{{ user?.email || 'Admin' }}</span>
                <span class="truncate text-xs text-muted-foreground">Administrator</span>
              </div>
            </div>
          </UiDropdownMenuLabel>
          <UiDropdownMenuSeparator />
          <UiDropdownMenuGroup>
            <UiDropdownMenuItem as-child>
              <NuxtLink to="/admin/settings" @click="setOpenMobile(false)">
                <Icon name="i-lucide-settings" />
                Settings
              </NuxtLink>
            </UiDropdownMenuItem>
          </UiDropdownMenuGroup>
          <UiDropdownMenuSeparator />
          <UiDropdownMenuItem @click="handleLogout">
            <Icon name="i-lucide-log-out" />
            Log out
          </UiDropdownMenuItem>
        </UiDropdownMenuContent>
      </UiDropdownMenu>
    </UiSidebarMenuItem>
  </UiSidebarMenu>
</template>

