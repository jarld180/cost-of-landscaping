<script setup lang="ts">
import { ref, computed } from 'vue'
import { consola } from 'consola'
import { toast } from 'vue-sonner'
import type { MenuItemFormData } from '~/schemas/admin/menu-item-form.schema'
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
  title: 'Edit Menu Item - Admin'
})

// =====================================================
// STATE
// =====================================================

const route = useRoute()
const router = useRouter()
const { listMenus } = useMenus()
const { updateMenuItem } = useMenuItems()
const { pages: pagesData, fetchPages } = useAdminPages()

const menuId = computed(() => route.params.menuId as string)
const itemId = computed(() => route.params.id as string)

const menu = ref<Menu | null>(null)
const menuItem = ref<MenuItem | null>(null)
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

    // Fetch menu items
    const itemsResponse = await $fetch<{ success: boolean; data: MenuItem[] }>(`/api/menus/${menuId.value}/items`)
    if (itemsResponse.success) {
      const allItems = itemsResponse.data

      // Find the item being edited
      menuItem.value = allItems.find(item => item.id === itemId.value) || null

      if (!menuItem.value) {
        toast.error('Menu item not found')
        router.push(`/admin/menus/${menuId.value}/items`)
        return
      }

      // Only show top-level items as parent options (1-level depth limit)
      // Exclude the current item and its children
      menuItems.value = allItems.filter(item =>
        item.parent_id === null &&
        item.id !== itemId.value
      )
    }

    // Fetch published pages (for page link dropdown)
    await fetchPages({ status: 'published', limit: 100 })
    pages.value = pagesData.value
  } catch (error) {
    consola.error('[EditMenuItem] Error fetching data:', error)
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

const initialFormData = computed<Partial<MenuItemFormData> | undefined>(() => {
  if (!menuItem.value) return undefined

  return {
    label: menuItem.value.label,
    link_type: menuItem.value.link_type as MenuItemFormData['link_type'],
    page_id: menuItem.value.page_id,
    custom_url: menuItem.value.custom_url,
    internal_path: (menuItem.value as any).internal_path ?? null,
    description: menuItem.value.description,
    parent_id: menuItem.value.parent_id,
    open_in_new_tab: menuItem.value.open_in_new_tab,
    is_enabled: menuItem.value.is_enabled,
    display_order: menuItem.value.display_order,
    metadata: menuItem.value.metadata
  }
})

// =====================================================
// FORM SUBMISSION
// =====================================================

/**
 * Map MenuItemFormData to UpdateMenuItemInput for API
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
    consola.info('[EditMenuItem] Form submitted:', formData)
  }

  isSubmitting.value = true

  try {
    const input = mapFormDataToApiInput(formData)

    if (import.meta.client && import.meta.dev) {
      consola.info('[EditMenuItem] API input:', input)
    }

    const success = await updateMenuItem(itemId.value, input)

    if (success) {
      toast.success('Menu item updated successfully')

      // Redirect to menu items list
      router.push(`/admin/menus/${menuId.value}/items`)
    } else {
      toast.error('Failed to update menu item')
    }
  } catch (error: any) {
    consola.error('[EditMenuItem] Error:', error)

    // Get error message from nested data structure (H3 error wraps data)
    const errorMessage = error?.data?.message || error?.message

    // Show user-friendly error message
    if (errorMessage?.includes('depth') || errorMessage?.includes('nested')) {
      toast.error('Cannot create nested items more than 1 level deep')
    } else if (errorMessage?.includes('dropdown items')) {
      // Footer dropdown validation error - show exact message from backend
      toast.error(errorMessage)
    } else {
      toast.error(errorMessage || 'Failed to update menu item')
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
      <template v-else-if="menu && menuItem">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-foreground">
            Edit Menu Item
          </h1>
          <p class="mt-2 text-sm text-muted-foreground">
            Update {{ menuItem.label }} in {{ menu.name }}
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
              :is-edit-mode="true"
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

