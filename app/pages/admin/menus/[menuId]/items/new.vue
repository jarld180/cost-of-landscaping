<script setup lang="ts">
import { ref, computed } from 'vue'
import { consola } from 'consola'
import { toast } from 'vue-sonner'
import { menuItemFormDefaultValues, type MenuItemFormData } from '~/schemas/admin/menu-item-form.schema'
import type { Database } from '~/types/supabase'

type Menu = Database['public']['Tables']['menus']['Row']
type MenuItem = Database['public']['Tables']['menu_items']['Row']
type Page = Database['public']['Tables']['pages']['Row']

// =====================================================
// PAGE METADATA
// =====================================================

definePageMeta({
  layout: 'admin'
})

useHead({
  title: 'Create Menu Item - Admin'
})

// =====================================================
// STATE
// =====================================================

const route = useRoute()
const router = useRouter()
const { listMenus } = useMenus()
const { createMenuItem } = useMenuItems()
const { pages: pagesData, fetchPages } = useAdminPages()

const menuId = computed(() => route.params.menuId as string)
const parentIdFromQuery = computed(() => route.query.parentId as string | undefined)
const typeFromQuery = computed(() => route.query.type as 'dropdown' | 'link' | undefined)

const menu = ref<Menu | null>(null)
const menuItems = ref<MenuItem[]>([])
const pages = ref<Page[]>([])
const loading = ref(true)
const isSubmitting = ref(false)

// =====================================================
// FETCH DATA
// =====================================================

async function fetchData() {
  try {
    loading.value = true

    // Fetch menu
    const menus = await listMenus()
    menu.value = menus.find(m => m.id === menuId.value) || null

    if (!menu.value) {
      toast.error('Menu not found')
      router.push('/admin/menus')
      return
    }

    // Fetch menu items (for parent dropdown)
    const itemsResponse = await $fetch<{ success: boolean; data: MenuItem[] }>(`/api/menus/${menuId.value}/items`)
    if (itemsResponse.success) {
      // Only show dropdown menus as parent options (links can only be children of dropdowns)
      menuItems.value = itemsResponse.data.filter(item => item.link_type === 'dropdown')
    }

    // Fetch published pages (for page link dropdown)
    await fetchPages({ status: 'published', limit: 100 })
    pages.value = pagesData.value
  } catch (error) {
    consola.error('[CreateMenuItem] Error fetching data:', error)
    toast.error('Failed to load data')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await fetchData()
})

// =====================================================
// INITIAL FORM DATA
// =====================================================

const initialFormData = computed(() => {
  // Start with default values
  const data: Partial<MenuItemFormData> = { ...menuItemFormDefaultValues }

  // Set link_type based on query param
  if (typeFromQuery.value === 'dropdown') {
    data.link_type = 'dropdown'
    data.page_id = null
    data.custom_url = null
    data.parent_id = null // Dropdowns are always top-level
  } else if (typeFromQuery.value === 'link') {
    data.link_type = 'page' // Default to page link

    // If parentId is provided, set it (child link)
    if (parentIdFromQuery.value) {
      data.parent_id = parentIdFromQuery.value
    }
  }

  return data
})

// =====================================================
// FORM SUBMISSION
// =====================================================

/**
 * Map MenuItemFormData to CreateMenuItemInput for API
 */
function mapFormDataToApiInput(formData: MenuItemFormData) {
  return {
    link_type: formData.link_type,
    page_id: formData.page_id ?? null,
    custom_url: formData.custom_url ?? null,
    internal_path: formData.internal_path ?? null,
    label: formData.label,
    description: formData.description ?? null,
    parent_id: formData.parent_id ?? null,
    open_in_new_tab: formData.open_in_new_tab,
    is_enabled: formData.is_enabled,
    display_order: formData.display_order ?? null,
    metadata: formData.metadata ?? null
  }
}

/**
 * Handle form submission
 */
async function handleSubmit(formData: MenuItemFormData) {
  if (import.meta.client && import.meta.dev) {
    consola.info('[CreateMenuItem] Form submitted:', formData)
  }

  isSubmitting.value = true

  try {
    const input = mapFormDataToApiInput(formData)

    if (import.meta.client && import.meta.dev) {
      consola.info('[CreateMenuItem] API input:', input)
    }

    const newItem = await createMenuItem(menuId.value, input)

    if (newItem) {
      toast.success('Menu item created successfully')

      // Redirect to menu items list
      router.push(`/admin/menus/${menuId.value}/items`)
    } else {
      toast.error('Failed to create menu item')
    }
  } catch (error: any) {
    consola.error('[CreateMenuItem] Error:', error)

    // Get error message from nested data structure (H3 error wraps data)
    const errorMessage = error?.data?.message || error?.message

    // Show user-friendly error message
    if (errorMessage?.includes('depth') || errorMessage?.includes('nested')) {
      toast.error('Cannot create nested items more than 1 level deep')
    } else if (errorMessage?.includes('dropdown items')) {
      // Footer dropdown validation error - show exact message from backend
      toast.error(errorMessage)
    } else {
      toast.error(errorMessage || 'Failed to create menu item')
    }
  } finally {
    isSubmitting.value = false
  }
}

/**
 * Handle form cancellation
 */
function handleCancel() {
  router.push(`/admin/menus/${menuId.value}/items`)
}
</script>

<template>
  <div class="p-6">
    <div class="mx-auto max-w-4xl">
      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="flex flex-col items-center gap-3">
          <UiSpinner class="size-8" />
          <p class="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>

      <!-- Form -->
      <template v-else-if="menu">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-foreground">
            <template v-if="typeFromQuery === 'dropdown'">
              Create Dropdown Menu
            </template>
            <template v-else>
              Create Link
            </template>
          </h1>
          <p class="mt-2 text-sm text-muted-foreground">
            <template v-if="typeFromQuery === 'dropdown'">
              Add a new dropdown menu to {{ menu.name }}
            </template>
            <template v-else-if="parentIdFromQuery">
              Add a new link under a dropdown in {{ menu.name }}
            </template>
            <template v-else>
              Add a new top-level link to {{ menu.name }}
            </template>
          </p>
        </div>

        <!-- Form Card -->
        <UiCard>
          <UiCardContent class="pt-6">
            <MenuItemForm
              :menu-id="menuId"
              :menu="menu"
              :initial-data="initialFormData"
              :parent-items="menuItems"
              :pages="pages"
              :is-submitting="isSubmitting"
              @submit="handleSubmit"
              @cancel="handleCancel"
            />
          </UiCardContent>
        </UiCard>
      </template>
    </div>
  </div>
</template>

