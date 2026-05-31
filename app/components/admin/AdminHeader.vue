<script setup lang="ts">
/**
 * Admin Header
 * Top header bar with sidebar trigger, breadcrumbs, and user actions
 */
const route = useRoute()

// Notification bell
const showNotifications = ref(false)
const { data: notifData, refresh: refreshNotifs } = useFetch('/api/admin/notifications', {
  query: { limit: 10 },
  server: false
})
const unreadCount = computed(() => notifData.value?.unreadCount || 0)
const notifications = computed(() => notifData.value?.notifications || [])

async function markAllRead() {
  await $fetch('/api/admin/notifications/read-all', { method: 'POST' })
  await refreshNotifs()
}

function notifIcon(type: string) {
  switch (type) {
    case 'coi_submitted': return 'heroicons:document-check'
    case 'claim_submitted': return 'heroicons:user-plus'
    case 'coi_expiring': return 'heroicons:exclamation-triangle'
    case 'lead_received': return 'heroicons:envelope'
    default: return 'heroicons:bell'
  }
}

function notifColor(type: string) {
  switch (type) {
    case 'coi_submitted': return 'text-emerald-600'
    case 'claim_submitted': return 'text-blue-600'
    case 'coi_expiring': return 'text-orange-500'
    case 'lead_received': return 'text-purple-600'
    default: return 'text-neutral-500'
  }
}

// Refresh every 60s
onMounted(() => {
  const interval = setInterval(() => refreshNotifs(), 60000)
  onUnmounted(() => clearInterval(interval))
})

function setLinks() {
  // Remove /admin prefix and build breadcrumbs
  const path = route.fullPath.replace(/^\/admin\/?/, '')

  if (!path || path === '/') {
    return [{ title: 'Dashboard', href: '/admin' }]
  }

  const segments = path.split('/').filter(item => item !== '' && !item.startsWith('?'))

  // Filter out UUID segments from display (but keep them in the path for hrefs)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  const breadcrumbs: { title: string; href: string }[] = []
  for (let i = 0; i < segments.length; i++) {
    const item = segments[i]
    // Skip UUID segments - don't show them in breadcrumbs
    if (uuidRegex.test(item)) {
      continue
    }

    const str = item.replace(/-/g, ' ')
    const title = str
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')

    breadcrumbs.push({
      title,
      href: `/admin/${segments.slice(0, i + 1).join('/')}`,
    })
  }

  return [{ title: 'Dashboard', href: '/admin' }, ...breadcrumbs]
}

const links = ref<{ title: string; href: string }[]>(setLinks())

watch(() => route.fullPath, (val) => {
  if (val) {
    links.value = setLinks()
  }
})
</script>

<template>
  <header class="sticky top-0 md:top-2 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 md:px-6 md:rounded-tl-xl md:rounded-tr-xl before:absolute before:-top-2 before:left-0 before:right-0 before:h-2 before:bg-sidebar before:hidden md:before:block">
    <div class="flex w-full items-center gap-4">
      <UiSidebarTrigger />
      <UiSeparator orientation="vertical" class="!h-4" />
      <UiBreadcrumb>
        <UiBreadcrumbList>
          <template v-for="(link, index) in links" :key="link.href">
            <UiBreadcrumbItem>
              <UiBreadcrumbLink v-if="index < links.length - 1" as-child>
                <NuxtLink :to="link.href">{{ link.title }}</NuxtLink>
              </UiBreadcrumbLink>
              <UiBreadcrumbPage v-else>{{ link.title }}</UiBreadcrumbPage>
            </UiBreadcrumbItem>
            <UiBreadcrumbSeparator v-if="index < links.length - 1" />
          </template>
        </UiBreadcrumbList>
      </UiBreadcrumb>
    </div>
    <div class="ml-auto flex items-center gap-2">
      <!-- Notification Bell -->
      <div class="relative">
        <button
          type="button"
          class="relative rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          @click="showNotifications = !showNotifications"
        >
          <Icon name="heroicons:bell" class="h-5 w-5" />
          <span
            v-if="unreadCount > 0"
            class="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white"
          >
            {{ unreadCount > 9 ? '9+' : unreadCount }}
          </span>
        </button>

        <!-- Dropdown -->
        <div
          v-if="showNotifications"
          class="absolute right-0 top-full z-50 mt-1 w-80 rounded-xl border border-border bg-background shadow-lg"
        >
          <div class="flex items-center justify-between border-b border-border px-4 py-3">
            <span class="text-sm font-semibold">Notifications</span>
            <button
              v-if="unreadCount > 0"
              class="text-xs text-blue-600 hover:underline dark:text-blue-400"
              @click="markAllRead"
            >
              Mark all read
            </button>
          </div>
          <div class="max-h-80 overflow-y-auto">
            <div v-if="notifications.length === 0" class="px-4 py-6 text-center text-sm text-muted-foreground">
              No notifications
            </div>
            <div
              v-for="n in notifications"
              :key="n.id"
              :class="['flex items-start gap-3 px-4 py-3 border-b border-border last:border-b-0', !n.read && 'bg-blue-50/50 dark:bg-blue-900/10']"
            >
              <Icon :name="notifIcon(n.type)" :class="['mt-0.5 h-4 w-4 shrink-0', notifColor(n.type)]" />
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-foreground">{{ n.title }}</p>
                <p class="mt-0.5 text-xs text-muted-foreground line-clamp-2">{{ n.body }}</p>
                <p class="mt-1 text-[10px] text-muted-foreground">
                  {{ new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}
                </p>
              </div>
              <div v-if="!n.read" class="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
            </div>
          </div>
          <div class="border-t border-border px-4 py-2">
            <NuxtLink to="/admin/verifications" class="text-xs text-blue-600 hover:underline dark:text-blue-400" @click="showNotifications = false">
              View COI Queue →
            </NuxtLink>
          </div>
        </div>
      </div>
      <slot />
    </div>
  </header>
  <!-- Click outside to close -->
  <div v-if="showNotifications" class="fixed inset-0 z-40" @click="showNotifications = false" />
</template>

