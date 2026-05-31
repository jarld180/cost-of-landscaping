<script setup lang="ts">
import { consola } from 'consola'
import { toast } from 'vue-sonner'
import type { Database } from '~/types/supabase'

type Menu = Database['public']['Tables']['menus']['Row']

// Page metadata
definePageMeta({
  layout: 'admin'
})

// Use composables
const { listMenus, updateMenu, deleteMenu } = useMenus()

// State
const menus = ref<Menu[]>([])
const loading = ref(false)
const error = ref<Error | null>(null)

// Fetch menus on mount
const fetchMenus = async () => {
  try {
    loading.value = true
    error.value = null
    menus.value = await listMenus()
  } catch (err) {
    error.value = err as Error
    consola.error('Error fetching menus:', err)
    toast.error('Failed to load menus')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await fetchMenus()
})

// Handle edit action
const handleEdit = (menuId: string) => {
  navigateTo(`/admin/menus/${menuId}/edit`)
}

// Handle manage items action
const handleManageItems = (menuId: string) => {
  navigateTo(`/admin/menus/${menuId}/items`)
}

// Handle delete action
const showDeleteDialog = ref(false)
const menuToDelete = ref<string | null>(null)

const handleDelete = (menuId: string) => {
  menuToDelete.value = menuId
  showDeleteDialog.value = true
}

const confirmDelete = async () => {
  if (!menuToDelete.value) return

  const success = await deleteMenu(menuToDelete.value)

  if (success) {
    toast.success('Menu deleted successfully')
    await fetchMenus() // Refresh list
  } else {
    toast.error('Failed to delete menu')
  }

  showDeleteDialog.value = false
  menuToDelete.value = null
}

const cancelDelete = () => {
  showDeleteDialog.value = false
  menuToDelete.value = null
}

// Handle toggle enabled action
const handleToggleEnabled = async (menuId: string, value: boolean) => {
  // Optimistically update the local state
  const menuIndex = menus.value.findIndex(m => m.id === menuId)
  if (menuIndex !== -1) {
    menus.value[menuIndex].is_enabled = value
  }

  try {
    const result = await updateMenu(menuId, { is_enabled: value })

    if (result?.disabledMenu) {
      // Optimistically update the disabled menu's state
      const disabledMenuIndex = menus.value.findIndex(m => m.id === result.disabledMenu!.id)
      if (disabledMenuIndex !== -1) {
        menus.value[disabledMenuIndex].is_enabled = false
      }

      // Show enhanced toast when another menu was auto-disabled
      toast.success(`Menu ${value ? 'enabled' : 'disabled'}. '${result.disabledMenu.name}' was automatically disabled.`)
    } else {
      toast.success(`Menu ${value ? 'enabled' : 'disabled'}`)
    }
  } catch (err) {
    // Revert the optimistic update on error
    if (menuIndex !== -1) {
      menus.value[menuIndex].is_enabled = !value
    }
    consola.error('Error toggling enabled:', err)
    toast.error('Failed to update menu')
  }
}
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">
            Menus
          </h1>
          <p class="mt-1 text-sm text-muted-foreground">
            Manage navigation menus for your site
          </p>
        </div>

        <UiButton as="a" href="/admin/menus/new">
          <Icon name="heroicons:plus" class="size-4" />
          Create Menu
        </UiButton>
      </div>
    </div>

    <!-- Menu List -->
    <AdminMenuList
      :menus="menus"
      :loading="loading"
      @edit="handleEdit"
      @delete="handleDelete"
      @toggle-enabled="handleToggleEnabled"
      @manage-items="handleManageItems"
    />

    <!-- Delete Confirmation Dialog -->
    <UiAlertDialog :open="showDeleteDialog" @update:open="(val) => !val && cancelDelete()">
      <UiAlertDialogContent>
        <UiAlertDialogHeader>
          <UiAlertDialogTitle>Delete Menu</UiAlertDialogTitle>
          <UiAlertDialogDescription>
            Are you sure you want to delete this menu? This action cannot be undone.
          </UiAlertDialogDescription>
        </UiAlertDialogHeader>
        <UiAlertDialogFooter>
          <UiAlertDialogCancel @click="cancelDelete">Cancel</UiAlertDialogCancel>
          <UiAlertDialogAction variant="destructive" @click="confirmDelete">Delete</UiAlertDialogAction>
        </UiAlertDialogFooter>
      </UiAlertDialogContent>
    </UiAlertDialog>
  </div>
</template>

