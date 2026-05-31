<script setup lang="ts">
// Footer component for the application
// Features logo, quick links, social icons, and copyright section
// Background: #103a21 (dark navy blue)

// Fetch footer menu dynamically (gets first enabled footer menu)
const { fetchMenuByLocation } = useMenus()
const { data: footerMenuData } = await useAsyncData('footer-menu', () =>
  fetchMenuByLocation('footer')
)

// Helper to get the link URL based on link_type
function getMenuItemLink(item: any): string {
  if (item.link_type === 'page' && item.page?.full_path) {
    return item.page.full_path
  }
  if (item.link_type === 'internal' && item.internal_path) {
    return item.internal_path
  }
  if (item.link_type === 'custom' && item.custom_url) {
    return item.custom_url
  }
  return '/'
}

// Transform menu data to quick links format
const quickLinks = computed(() => {
  if (!footerMenuData.value?.items) return []

  return footerMenuData.value.items.map(item => ({
    text: item.label,
    to: getMenuItemLink(item),
    openInNewTab: item.open_in_new_tab
  }))
})

// Best contractors quick links for footer
const bestContractorLinks = [
  { text: 'Charlotte, NC', to: '/north-carolina/charlotte/best-landscapers' },
  { text: 'Raleigh, NC', to: '/north-carolina/raleigh/best-landscapers' },
  { text: 'Huntersville, NC', to: '/north-carolina/huntersville/best-landscapers' },
  { text: 'Concord, NC', to: '/north-carolina/concord/best-landscapers' },
  { text: 'Mooresville, NC', to: '/north-carolina/mooresville/best-landscapers' },
  { text: 'Louisville, KY', to: '/kentucky/louisville/best-landscapers' },
  { text: 'Lexington, KY', to: '/kentucky/lexington/best-landscapers' },
  { text: 'Browse all cities →', to: '/find' },
]

// Legal links
const legalLinks = [
  { text: 'Privacy Policy', to: '/privacy' },
  { text: 'Terms & Conditions', to: '/terms' }
]

// Current year for copyright
const currentYear = new Date().getFullYear()
</script>

<template>
  <footer class="w-full" style="background-color: #103a21;">
    <div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <!-- Top Section: Logo on left, Quick Links + Social on right -->
      <div class="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <!-- Logo Section -->
        <div class="flex flex-col items-start">
          <NuxtLink to="/" class="transition-opacity hover:opacity-80">
            <img
              src="/images/logo-light.webp"
              alt="Cost of Landscaping"
              class="h-18 w-auto brightness-0 invert"
              style="filter: brightness(0) invert(1);"
            />
          </NuxtLink>
        </div>

        <!-- Right Side: Quick Links + Social -->
        <div class="flex flex-col gap-8 sm:flex-row sm:gap-16 md:gap-20 lg:gap-24">
          <!-- Quick Links Section -->
          <div>
            <h3 class="mb-4 font-heading text-lg font-semibold text-white">
              Quick Links
            </h3>
            <nav>
              <ul class="space-y-3">
                <li v-for="link in quickLinks" :key="link.text">
                  <NuxtLink
                    :to="link.to"
                    :target="link.openInNewTab ? '_blank' : undefined"
                    class="text-neutral-300 transition-colors hover:text-white"
                  >
                    {{ link.text }}
                  </NuxtLink>
                </li>
              </ul>
            </nav>
          </div>

          <!-- Best Contractors Section -->
          <div>
            <h3 class="mb-4 font-heading text-lg font-semibold text-white">
              Best Contractors
            </h3>
            <nav>
              <ul class="space-y-3">
                <li v-for="link in bestContractorLinks" :key="link.text">
                  <NuxtLink
                    :to="link.to"
                    class="text-neutral-300 transition-colors hover:text-white"
                  >
                    {{ link.text }}
                  </NuxtLink>
                </li>
              </ul>
            </nav>
          </div>

        </div>
      </div>
    </div>

    <!-- Divider -->
      <div class="my-8 border-t border-white/20"></div>

      <!-- Bottom Section: Copyright & Legal Links -->
      <div class="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 pb-8 sm:flex-row">
        <!-- Copyright -->
        <p class="text-sm text-neutral-300">
          © {{ currentYear }} Cost of Landscaping. All rights reserved.
        </p>

        <!-- Legal Links -->
        <div class="flex gap-6">
          <NuxtLink
            v-for="link in legalLinks"
            :key="link.text"
            :to="link.to"
            class="text-sm text-neutral-300 transition-colors hover:text-white"
          >
            {{ link.text }}
          </NuxtLink>
        </div>
      </div>
  </footer>
</template>

<style scoped>
</style>

