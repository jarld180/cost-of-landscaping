<script setup lang="ts">
// Header component for the application
// Handles desktop and mobile navigation with responsive design
// Auto-imports: ref, computed, onMounted, onUnmounted, useColorMode (from Nuxt)

import {
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuRoot,
  NavigationMenuTrigger,
  NavigationMenuViewport
} from 'reka-ui'

// Fetch header menu dynamically (gets first enabled header menu)
const { fetchMenuByLocation } = useMenus()
const { data: headerMenuData } = await useAsyncData('header-menu', () =>
  fetchMenuByLocation('header')
)

// Transform menu data to match NavigationItem interface
interface NavigationItem {
  label: string
  link?: string
  description?: string
  openInNewTab?: boolean
  children?: NavigationItem[]
}

// Helper to get the link URL based on link_type
function getMenuItemLink(item: any): string | undefined {
  if (item.link_type === 'page' && item.page?.full_path) {
    return item.page.full_path
  }
  if (item.link_type === 'internal' && item.internal_path) {
    return item.internal_path
  }
  if (item.link_type === 'custom' && item.custom_url) {
    return item.custom_url
  }
  return undefined
}

const navigationItems = computed<NavigationItem[]>(() => {
  if (!headerMenuData.value?.items) return []

  return headerMenuData.value.items.map(item => ({
    label: item.label,
    link: getMenuItemLink(item),
    openInNewTab: item.open_in_new_tab,
    children: item.children?.length > 0 ? item.children.map(child => ({
      label: child.label,
      link: getMenuItemLink(child),
      description: child.description || undefined,
      openInNewTab: child.open_in_new_tab
    })) : undefined
  }))
})

// Static "Best Contractors" dropdown items for header nav
const bestContractorNavItems = [
  { label: 'Charlotte, NC', link: '/north-carolina/charlotte/best-landscapers', description: 'Top rated landscape pros in Charlotte' },
  { label: 'Raleigh, NC', link: '/north-carolina/raleigh/best-landscapers', description: 'Top rated landscape pros in Raleigh' },
  { label: 'Huntersville, NC', link: '/north-carolina/huntersville/best-landscapers', description: 'Top rated landscape pros in Huntersville' },
  { label: 'Concord, NC', link: '/north-carolina/concord/best-landscapers', description: 'Top rated landscape pros in Concord' },
  { label: 'Mooresville, NC', link: '/north-carolina/mooresville/best-landscapers', description: 'Top rated landscape pros in Mooresville' },
  { label: 'Louisville, KY', link: '/kentucky/louisville/best-landscapers', description: 'Top rated landscape pros in Louisville' },
  { label: 'Lexington, KY', link: '/kentucky/lexington/best-landscapers', description: 'Top rated landscape pros in Lexington' },
  { label: 'Browse all cities', link: '/find', description: 'Find top contractors near you' },
]

// Color mode
const colorMode = useColorMode()

// Authentication state
const user = useSupabaseUser()
const supabase = useSupabaseClient()
const router = useRouter()

// Use useAuthUser composable to get admin status (works on all pages, not just /admin)
const { isAdmin, ensureProfile } = useAuthUser()

// Mobile menu state
const isMobileMenuOpen = ref(false)
const activeSubmenu = ref<string | null>(null)

// Track if component is mounted (for SSR)
const isMounted = ref(false)

// Computed: Logo source based on color mode
const logoSrc = computed(() => {
  if (!isMounted.value) return '/images/logo-light.webp' // SSR fallback
  return colorMode.value === 'dark' ? '/images/logo-dark.webp' : '/images/logo-light.webp'
})

// Computed: Auth button text and location based on user state and account type
const authButtonText = computed(() => user.value ? 'Dashboard' : 'Login')
const authButtonLocation = computed(() => {
  if (!user.value) return '/login'
  // Redirect admins to /admin, business users to /owner
  // isAdmin is loaded via ensureProfile() - undefined means not yet loaded, treat as non-admin
  return isAdmin.value === true ? '/admin' : '/owner'
})
const secondaryButtonText = computed(() => user.value ? 'Logout' : 'Sign Up')

// Open mobile menu
const openMobileMenu = () => {
  isMobileMenuOpen.value = true
  // Lock body scroll on client side only
  if (import.meta.client) {
    document.body.style.overflow = 'hidden'
  }
}

// Close mobile menu
const closeMobileMenu = () => {
  isMobileMenuOpen.value = false
  activeSubmenu.value = null
  // Unlock body scroll on client side only
  if (import.meta.client) {
    document.body.style.overflow = ''
  }
}

// Open submenu
const openSubmenu = (category: string) => {
  activeSubmenu.value = category
}

// Close submenu (back to main menu)
const closeSubmenu = () => {
  activeSubmenu.value = null
}

// Handle logout
const handleLogout = async () => {
  try {
    await supabase.auth.signOut()
    // Close mobile menu if open
    if (isMobileMenuOpen.value) {
      closeMobileMenu()
    }
    // Redirect to home page
    await router.push('/')
  }
  catch (error) {
    if (import.meta.dev) {
      console.error('[Header] Logout error', error)
    }
  }
}

// Handle ESC key to close menu
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isMobileMenuOpen.value) {
    closeMobileMenu()
  }
}

// Add/remove keyboard event listener
onMounted(async () => {
  isMounted.value = true
  window.addEventListener('keydown', handleKeydown)
  // Load profile data (including isAdmin) if user is logged in
  if (user.value) {
    await ensureProfile()
  }
})

// Watch for user login to load profile
watch(user, async (newUser) => {
  if (newUser) {
    await ensureProfile()
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  // Ensure scroll is unlocked when component unmounts
  if (import.meta.client) {
    document.body.style.overflow = ''
  }
})
</script>

<template>
  <header class="top-0 z-50 bg-neutral-50 dark:bg-neutral-900">
    <div class="mx-auto max-w-8xl px-4 py-4 sm:px-6 lg:px-8">
      <!-- Desktop & Mobile Header -->
      <div class="flex items-center justify-between gap-4">
        <!-- Logo (Left) -->
        <NuxtLink to="/" class="flex-shrink-0 transition-opacity hover:opacity-80">
          <img
            :src="logoSrc"
            alt="Cost of Landscaping"
            class="h-11 w-auto"
          />
        </NuxtLink>

        <!-- Desktop Navigation (Center) - Hidden on mobile/tablet -->
        <div class="hidden flex-1 items-center justify-center lg:flex">
          <NavigationMenuRoot class="relative z-50">
            <NavigationMenuList class="flex items-center gap-1">
              <!-- Loop through navigation items -->
              <NavigationMenuItem
                v-for="item in navigationItems"
                :key="item.label"
              >
                <!-- Single link (no children) -->
                <NavigationMenuLink
                  v-if="!item.children"
                  as-child
                >
                  <NuxtLink
                    :to="item.link"
                    :target="item.openInNewTab ? '_blank' : undefined"
                    class="text-md rounded-md px-4 py-2 font-medium text-blue-600 transition-colors hover:bg-neutral-100 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-neutral-800 dark:hover:text-blue-300"
                  >
                    {{ item.label }}
                  </NuxtLink>
                </NavigationMenuLink>

                <!-- Dropdown (has children) -->
                <template v-else>
                  <NavigationMenuTrigger
                    class="text-md group flex items-center gap-1 rounded-md px-4 py-2 font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {{ item.label }}
                    <Icon
                      name="heroicons:chevron-down"
                      class="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180"
                    />
                  </NavigationMenuTrigger>
                  <NavigationMenuContent
                    class="NavigationMenuContent grid w-[600px] grid-cols-2 gap-1 rounded-lg border border-neutral-200 bg-white p-4 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
                  >
                    <NavigationMenuLink
                      v-for="child in item.children"
                      :key="child.label"
                      as-child
                    >
                      <NuxtLink
                        :to="child.link"
                        :target="child.openInNewTab ? '_blank' : undefined"
                        class="flex items-start gap-1 rounded-md px-4 py-3 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700"
                      >
                        <Icon
                          name="heroicons:arrow-small-right-20-solid"
                          class="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400"
                        />
                        <div class="flex-1">
                          <div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                            {{ child.label }}
                          </div>
                          <div
                            v-if="child.description"
                            class="mt-1 text-xs leading-tight text-neutral-600 dark:text-neutral-400"
                          >
                            {{ child.description }}
                          </div>
                        </div>
                      </NuxtLink>
                    </NavigationMenuLink>
                  </NavigationMenuContent>
                </template>
              </NavigationMenuItem>
              <!-- Static "Best Contractors" dropdown -->
              <NavigationMenuItem>
                <NavigationMenuTrigger
                  class="text-md group flex items-center gap-1 rounded-md px-4 py-2 font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Best Contractors
                  <Icon
                    name="heroicons:chevron-down"
                    class="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180"
                  />
                </NavigationMenuTrigger>
                <NavigationMenuContent
                  class="NavigationMenuContent grid w-[600px] grid-cols-2 gap-1 rounded-lg border border-neutral-200 bg-white p-4 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
                >
                  <NavigationMenuLink
                    v-for="item in bestContractorNavItems"
                    :key="item.label"
                    as-child
                  >
                    <NuxtLink
                      :to="item.link"
                      class="flex items-start gap-1 rounded-md px-4 py-3 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700"
                    >
                      <Icon
                        name="heroicons:arrow-small-right-20-solid"
                        class="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400"
                      />
                      <div class="flex-1">
                        <div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">{{ item.label }}</div>
                        <div class="mt-1 text-xs leading-tight text-neutral-600 dark:text-neutral-400">{{ item.description }}</div>
                      </div>
                    </NuxtLink>
                  </NavigationMenuLink>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <!-- Blog link -->
              <NavigationMenuItem>
                <NavigationMenuLink as-child>
                  <NuxtLink
                    to="/blog"
                    class="text-md rounded-md px-4 py-2 font-medium text-blue-600 transition-colors hover:bg-neutral-100 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-neutral-800 dark:hover:text-blue-300"
                  >
                    Blog
                  </NuxtLink>
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>

            <!-- Viewport for content rendering -->
            <NavigationMenuViewport class="NavigationMenuViewport data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:fade-in absolute top-full mt-2 origin-top overflow-hidden" />
          </NavigationMenuRoot>
        </div>

        <!-- Desktop: Auth Buttons - Hidden on mobile/tablet -->
        <div class="hidden flex-shrink-0 items-center gap-3 lg:flex">
          <Button
            :text="authButtonText"
            :location="authButtonLocation"
            variant="primary"
            size="md"
          />
          <Button
            v-if="!user"
            :text="secondaryButtonText"
            variant="primary-outline"
            size="md"
          />
          <Button
            v-else
            :text="secondaryButtonText"
            variant="primary-outline"
            size="md"
            @click="handleLogout"
          />
        </div>

        <!-- Mobile/Tablet: Hamburger Menu Button - Visible on mobile and tablet -->
        <button
          @click="openMobileMenu"
          class="flex-shrink-0 rounded-lg p-2 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-blue-500 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-blue-400 lg:hidden"
          aria-label="Open menu"
        >
          <Icon name="heroicons:bars-3" class="h-6 w-6" />
        </button>
      </div>
    </div>

    <!-- Mobile Menu Backdrop -->
    <Transition
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-300"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isMobileMenuOpen"
        @click="closeMobileMenu"
        class="fixed inset-0 z-40 bg-neutral-900/50 backdrop-blur-sm dark:bg-neutral-950/70 lg:hidden"
        aria-hidden="true"
      />
    </Transition>

    <!-- Mobile Menu Slide-out Panel -->
    <Transition
      enter-active-class="transition-transform duration-300 ease-out"
      enter-from-class="translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition-transform duration-300 ease-in"
      leave-from-class="translate-x-0"
      leave-to-class="translate-x-full"
    >
      <div
        v-if="isMobileMenuOpen"
        class="fixed right-0 top-0 z-50 h-full w-80 max-w-[85vw] overflow-hidden bg-neutral-50 shadow-2xl dark:bg-neutral-900 lg:hidden"
      >
        <!-- Main Menu -->
        <div
          class="absolute inset-0 flex flex-col transition-transform duration-300 ease-out"
          :class="activeSubmenu ? '-translate-x-full' : 'translate-x-0'"
        >
          <!-- Main Menu Header -->
          <div class="flex items-center justify-between border-b border-neutral-200 p-4 dark:border-neutral-700">
            <h2 class="font-heading text-xl font-bold text-neutral-700 dark:text-neutral-100">
              Menu
            </h2>
            <button
              @click="closeMobileMenu"
              class="rounded-lg p-2 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-red-500 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-red-400"
              aria-label="Close menu"
            >
              <Icon name="heroicons:x-mark" class="h-6 w-6" />
            </button>
          </div>

          <!-- Main Menu Content -->
          <div class="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
            <!-- SearchInput -->
            <div>
              <SearchInput
                placeholder="Type a city, state or zip code.."
                variant="secondary-light-outline"
                size="sm"
              />
            </div>

            <!-- Divider -->
            <Divider />

            <!-- Navigation Items -->
            <nav>
              <ul class="space-y-2">
                <li
                  v-for="item in navigationItems"
                  :key="item.label"
                >
                  <!-- Single link (no children) -->
                  <NuxtLink
                    v-if="!item.children"
                    :to="item.link"
                    :target="item.openInNewTab ? '_blank' : undefined"
                    @click="closeMobileMenu"
                    class="block rounded-lg px-4 py-3 text-base font-medium text-blue-600 transition-colors hover:bg-neutral-100 dark:text-blue-400 dark:hover:bg-neutral-800"
                  >
                    {{ item.label }}
                  </NuxtLink>

                  <!-- Category with children -->
                  <button
                    v-else
                    @click="openSubmenu(item.label)"
                    class="flex w-full items-center justify-between rounded-lg px-4 py-3 text-base font-medium text-blue-600 transition-colors hover:bg-neutral-100 dark:text-blue-400 dark:hover:bg-neutral-800"
                  >
                    {{ item.label }}
                    <Icon name="heroicons:chevron-right" class="h-5 w-5" />
                  </button>
                </li>
              </ul>
            </nav>

            <!-- Divider -->
            <Divider />

            <!-- Auth Buttons -->
            <div class="flex flex-col gap-3">
              <Button
                :text="authButtonText"
                :location="authButtonLocation"
                variant="primary"
                size="lg"
              />
              <Button
                v-if="!user"
                :text="secondaryButtonText"
                variant="primary-outline"
                size="lg"
              />
              <Button
                v-else
                :text="secondaryButtonText"
                variant="primary-outline"
                size="lg"
                @click="handleLogout"
              />
            </div>
          </div>
        </div>

        <!-- Submenu Panel -->
        <div
          class="absolute inset-0 flex flex-col transition-transform duration-300 ease-out"
          :class="activeSubmenu ? 'translate-x-0' : 'translate-x-full'"
        >
          <!-- Submenu Header -->
          <div class="flex items-center justify-between border-b border-neutral-200 p-4 dark:border-neutral-700">
            <button
              @click="closeSubmenu"
              class="rounded-lg p-2 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-blue-500 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-blue-400"
              aria-label="Back to main menu"
            >
              <Icon name="heroicons:arrow-left" class="h-6 w-6" />
            </button>
            <span class="flex-1 text-center font-heading text-lg font-bold text-neutral-700 dark:text-neutral-100">
              {{ activeSubmenu }}
            </span>
            <!-- <button
              @click="closeMobileMenu"
              class="rounded-lg p-2 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-red-500 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-red-400"
              aria-label="Close menu"
            >
              <Icon name="heroicons:x-mark" class="h-6 w-6" />
            </button> -->
          </div>

          <!-- Submenu Content -->
          <div class="flex-1 overflow-y-auto p-6">
            <ul class="space-y-1">
              <li
                v-for="item in navigationItems.find(i => i.label === activeSubmenu)?.children"
                :key="item?.label"
              >
                <NuxtLink
                  :to="item?.link || '/search'"
                  :target="item?.openInNewTab ? '_blank' : undefined"
                  @click="closeMobileMenu"
                  class="flex items-start gap-1 rounded-lg px-4 py-3 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <Icon
                    name="heroicons:arrow-small-right-20-solid"
                    class="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400"
                  />
                  <div class="flex-1">
                    <div class="text-base font-medium text-neutral-900 dark:text-neutral-100">
                      {{ item?.label }}
                    </div>
                    <div
                      v-if="item?.description"
                      class="text-xs leading-tight text-neutral-600 dark:text-neutral-400"
                    >
                      {{ item?.description }}
                    </div>
                  </div>
                </NuxtLink>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </Transition>
  </header>
</template>

<style scoped>
/* Reka UI Navigation Menu - Advanced Animation */

/* Content positioning and animation */
.NavigationMenuContent {
  position: absolute;
  top: 0;
  left: 0;
  animation-duration: 250ms;
  animation-timing-function: ease;
}

.NavigationMenuContent[data-motion="from-start"] {
  animation-name: enterFromLeft;
}

.NavigationMenuContent[data-motion="from-end"] {
  animation-name: enterFromRight;
}

.NavigationMenuContent[data-motion="to-start"] {
  animation-name: exitToLeft;
}

.NavigationMenuContent[data-motion="to-end"] {
  animation-name: exitToRight;
}

/* Viewport sizing and positioning with CSS variables */
.NavigationMenuViewport {
  left: var(--reka-navigation-menu-viewport-left);
  width: var(--reka-navigation-menu-viewport-width);
  height: var(--reka-navigation-menu-viewport-height);
  transition: width, height, 250ms ease;
}

/* Smooth slide animations */
@keyframes enterFromRight {
  from {
    opacity: 0;
    transform: translateX(200px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes enterFromLeft {
  from {
    opacity: 0;
    transform: translateX(-200px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes exitToRight {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(200px);
  }
}

@keyframes exitToLeft {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(-200px);
  }
}
</style>

