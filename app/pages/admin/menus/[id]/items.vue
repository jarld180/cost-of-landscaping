<script setup lang="ts">
import { ref, computed } from 'vue'
import { consola } from 'consola'
import { toast } from 'vue-sonner'
import type { Database } from '~/types/supabase'

type Menu = Database['public']['Tables']['menus']['Row']
type MenuItem = Database['public']['Tables']['menu_items']['Row']

// =====================================================
// PAGE METADATA
// =====================================================

definePageMeta({
  layout: 'admin'
})

useHead({
  title: 'Manage Menu Items - Admin'
})

// =====================================================
// STATE
// =====================================================

const route = useRoute()
const router = useRouter()
const { listMenus } = useMenus()
const { deleteMenuItem, reorderMenuItems } = useMenuItems()

const menuId = computed(() => route.params.id as string)
const menu = ref<Menu | null>(null)
const menuItems = ref<MenuItem[]>([])
const loading = ref(true)

// =====================================================
// FETCH DATA
// =====================================================

async function fetchMenuData() {
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
    await fetchMenuItems()
  } catch (error) {
    consola.error('[MenuItems] Error fetching data:', error)
    toast.error('Failed to load menu data')
  } finally {
    loading.value = false
  }
}

async function fetchMenuItems() {
  try {
    const response = await $fetch<{ success: boolean; data: MenuItem[] }>(`/api/menus/${menuId.value}/items`)
    if (response.success) {
      menuItems.value = response.data
    }
  } catch (error) {
    consola.error('[MenuItems] Error fetching items:', error)
    throw error
  }
}

onMounted(async () => {
  await fetchMenuData()
})

// =====================================================
// ACTIONS
// =====================================================

// Handle add dropdown menu (top-level, no link)
const handleAddDropdownMenu = () => {
  router.push(`/admin/menus/${menuId.value}/items/new?type=dropdown`)
}

// Handle add top-level link
const handleAddTopLevelLink = () => {
  router.push(`/admin/menus/${menuId.value}/items/new?type=link`)
}

// Handle add child link (under a dropdown)
const handleAddChildLink = (parentId: string) => {
  router.push(`/admin/menus/${menuId.value}/items/new?type=link&parentId=${parentId}`)
}

// Handle edit item
const handleEditItem = (itemId: string) => {
  router.push(`/admin/menus/${menuId.value}/items/${itemId}/edit`)
}

// Handle delete item
const showDeleteDialog = ref(false)
const itemToDelete = ref<string | null>(null)

const handleDeleteItem = (itemId: string) => {
  itemToDelete.value = itemId
  showDeleteDialog.value = true
}

const confirmDelete = async () => {
  if (!itemToDelete.value) return

  const success = await deleteMenuItem(itemToDelete.value)

  if (success) {
    toast.success('Menu item deleted successfully')
    await fetchMenuItems() // Refresh list
  } else {
    toast.error('Failed to delete menu item')
  }

  showDeleteDialog.value = false
  itemToDelete.value = null
}

const cancelDelete = () => {
  showDeleteDialog.value = false
  itemToDelete.value = null
}

// Handle reorder
const handleReorder = async (updates: Array<{ id: string; display_order: number }>) => {
  try {
    await reorderMenuItems(updates)
    toast.success('Menu items reordered successfully')
    await fetchMenuItems() // Refresh list
  } catch (error) {
    consola.error('[MenuItems] Error reordering:', error)
    toast.error('Failed to reorder menu items')
  }
}

// Handle toggle enabled
const handleToggleEnabled = async (itemId: string, value: boolean) => {
  // Optimistically update the local state
  const itemIndex = menuItems.value.findIndex(item => item.id === itemId)
  if (itemIndex !== -1) {
    menuItems.value[itemIndex].is_enabled = value
  }

  try {
    await $fetch(`/api/menu-items/${itemId}`, {
      method: 'PATCH',
      body: { is_enabled: value }
    })
    toast.success(`Menu item ${value ? 'enabled' : 'disabled'}`)
  } catch (error) {
    // Revert the optimistic update on error
    if (itemIndex !== -1) {
      menuItems.value[itemIndex].is_enabled = !value
    }
    consola.error('[MenuItems] Error toggling enabled:', error)
    toast.error('Failed to update menu item')
  }
}
</script>

<template>
  <div class="p-6">
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="flex flex-col items-center gap-3">
        <UiSpinner class="size-8" />
        <p class="text-sm text-muted-foreground">Loading menu items...</p>
      </div>
    </div>

    <!-- Content -->
    <template v-else-if="menu">
      <!-- Header -->
      <div class="mb-8 flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-foreground">
            {{ menu.name }} - Menu Items
          </h1>
          <p class="mt-2 text-sm text-muted-foreground">
            Manage navigation items for this menu
          </p>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-3">
          <!-- Hide "Add Dropdown Menu" button for footer menus -->
          <UiButton
            v-if="!menu.show_in_footer"
            variant="outline"
            @click="handleAddDropdownMenu"
          >
            Add Dropdown Menu
          </UiButton>
          <UiButton @click="handleAddTopLevelLink">
            <Icon name="heroicons:plus" class="size-4 mr-2" />
            Add Link
          </UiButton>
        </div>
      </div>

      <!-- Menu Item List -->
      <AdminMenuItemList
        :menu-items="menuItems"
        :loading="loading"
        @add-child-link="handleAddChildLink"
        @edit="handleEditItem"
        @delete="handleDeleteItem"
        @reorder="handleReorder"
        @toggle-enabled="handleToggleEnabled"
      />

      <!-- Delete Confirmation Dialog -->
      <UiAlertDialog :open="showDeleteDialog" @update:open="(val) => !val && cancelDelete()">
        <UiAlertDialogContent>
          <UiAlertDialogHeader>
            <UiAlertDialogTitle>Delete Menu Item</UiAlertDialogTitle>
            <UiAlertDialogDescription>
              Are you sure you want to delete this menu item? This action cannot be undone.
            </UiAlertDialogDescription>
          </UiAlertDialogHeader>
          <UiAlertDialogFooter>
            <UiAlertDialogCancel @click="cancelDelete">Cancel</UiAlertDialogCancel>
            <UiAlertDialogAction variant="destructive" @click="confirmDelete">Delete</UiAlertDialogAction>
          </UiAlertDialogFooter>
        </UiAlertDialogContent>
      </UiAlertDialog>
    </template>
  </div>
</template>

