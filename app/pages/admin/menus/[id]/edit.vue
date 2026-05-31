<script setup lang="ts">
import { ref, computed } from 'vue'
import { consola } from 'consola'
import { toast } from 'vue-sonner'
import type { MenuFormData } from '~/schemas/admin/menu-form.schema'
import type { Database } from '~/types/supabase'

type Menu = Database['public']['Tables']['menus']['Row']

// =====================================================
// PAGE METADATA
// =====================================================

definePageMeta({
  layout: 'admin'
})

useHead({
  title: 'Edit Menu - Admin'
})

// =====================================================
// STATE
// =====================================================

const route = useRoute()
const router = useRouter()
const { listMenus, updateMenu } = useMenus()

const menuId = computed(() => route.params.id as string)
const menu = ref<Menu | null>(null)
const loading = ref(true)
const isSubmitting = ref(false)

// Conflict dialog state
const showConflictDialog = ref(false)
const conflictingMenu = ref<{ id: string; name: string } | null>(null)
const pendingFormData = ref<MenuFormData | null>(null)

// =====================================================
// FETCH MENU DATA
// =====================================================

async function fetchMenu() {
  try {
    loading.value = true
    const menus = await listMenus()
    menu.value = menus.find(m => m.id === menuId.value) || null

    if (!menu.value) {
      toast.error('Menu not found')
      router.push('/admin/menus')
    }
  } catch (error) {
    consola.error('[EditMenu] Error fetching menu:', error)
    toast.error('Failed to load menu')
    router.push('/admin/menus')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await fetchMenu()
})

// =====================================================
// FORM DATA
// =====================================================

const initialFormData = computed<Partial<MenuFormData> | undefined>(() => {
  if (!menu.value) return undefined

  return {
    name: menu.value.name,
    slug: menu.value.slug,
    description: menu.value.description,
    show_in_header: menu.value.show_in_header,
    show_in_footer: menu.value.show_in_footer,
    is_enabled: menu.value.is_enabled,
    metadata: menu.value.metadata
  }
})

// =====================================================
// FORM SUBMISSION
// =====================================================

/**
 * Map MenuFormData to UpdateMenuInput for API
 */
function mapFormDataToApiInput(formData: MenuFormData) {
  return {
    name: formData.name,
    slug: formData.slug,
    description: formData.description || undefined,
    show_in_header: formData.show_in_header,
    show_in_footer: formData.show_in_footer,
    is_enabled: formData.is_enabled,
    metadata: formData.metadata || undefined
  }
}

/**
 * Handle form submission
 */
async function handleSubmit(formData: MenuFormData) {
  if (import.meta.client && import.meta.dev) {
    consola.info('[EditMenu] Form submitted:', formData)
  }

  isSubmitting.value = true

  try {
    const input = mapFormDataToApiInput(formData)

    if (import.meta.client && import.meta.dev) {
      consola.info('[EditMenu] API input:', input)
    }

    const result = await updateMenu(menuId.value, input)

    if (result) {
      toast.success('Menu updated successfully')

      // Redirect to menu list
      router.push('/admin/menus')
    } else {
      toast.error('Failed to update menu')
    }
  } catch (error: any) {
    consola.error('[EditMenu] Error:', error)

    // Get status code (can be statusCode or status depending on error type)
    const statusCode = error?.statusCode || error?.status

    // Handle location conflict (409)
    // Note: error.data.data.conflictingMenu because H3 error wraps data in another data property
    if (statusCode === 409 && error?.data?.data?.conflictingMenu) {
      if (import.meta.client && import.meta.dev) {
        consola.info('[EditMenu] Location conflict detected:', error.data.data.conflictingMenu)
      }
      conflictingMenu.value = error.data.data.conflictingMenu
      pendingFormData.value = formData
      showConflictDialog.value = true
      isSubmitting.value = false
      return
    }

    // Handle footer dropdown validation error
    if (error?.data?.message?.includes('dropdown items') || error?.message?.includes('dropdown items')) {
      toast.error(error?.data?.message || error.message)
      isSubmitting.value = false
      return
    }

    // Show user-friendly error message
    const errorMessage = error?.data?.message || error?.message
    if (errorMessage?.includes('duplicate') || errorMessage?.includes('slug')) {
      toast.error('A menu with this slug already exists')
    } else {
      toast.error(errorMessage || 'Failed to update menu')
    }
  } finally {
    if (!showConflictDialog.value) {
      isSubmitting.value = false
    }
  }
}

/**
 * Handle form cancellation
 */
function handleCancel() {
  router.push('/admin/menus')
}

// =====================================================
// CONFLICT DIALOG HANDLERS
// =====================================================

/**
 * Handle force update when user confirms location conflict
 */
async function handleForceUpdate() {
  if (!pendingFormData.value) return

  try {
    const input = mapFormDataToApiInput(pendingFormData.value)

    if (import.meta.client && import.meta.dev) {
      consola.info('[EditMenu] Force updating with input:', input)
    }

    // Call API with force=true
    const result = await updateMenu(menuId.value, input, true)

    if (result) {
      toast.success('Menu updated successfully')
      router.push('/admin/menus')
    } else {
      toast.error('Failed to update menu')
    }
  } catch (error: any) {
    consola.error('[EditMenu] Force update error:', error)
    toast.error(error?.message || 'Failed to update menu')
  } finally {
    showConflictDialog.value = false
    conflictingMenu.value = null
    pendingFormData.value = null
    isSubmitting.value = false
  }
}

/**
 * Handle conflict dialog cancellation
 */
function handleCancelConflict() {
  showConflictDialog.value = false
  conflictingMenu.value = null
  pendingFormData.value = null
  isSubmitting.value = false
}
</script>

<template>
  <div class="p-6">
    <div class="mx-auto max-w-4xl">
      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="flex flex-col items-center gap-3">
          <UiSpinner class="size-8" />
          <p class="text-sm text-muted-foreground">Loading menu...</p>
        </div>
      </div>

      <!-- Form -->
      <template v-else-if="menu">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-foreground">
            Edit Menu
          </h1>
          <p class="mt-2 text-sm text-muted-foreground">
            Update menu settings and configuration
          </p>
        </div>

        <!-- Form Card -->
        <UiCard>
          <UiCardContent class="pt-6">
            <MenuForm
              :initial-data="initialFormData"
              :is-edit-mode="true"
              :is-submitting="isSubmitting"
              @submit="handleSubmit"
              @cancel="handleCancel"
            />
          </UiCardContent>
        </UiCard>

        <!-- Location Conflict Dialog -->
        <UiAlertDialog :open="showConflictDialog" @update:open="(val) => !val && handleCancelConflict()">
          <UiAlertDialogContent>
            <UiAlertDialogHeader>
              <UiAlertDialogTitle>Location Conflict</UiAlertDialogTitle>
              <UiAlertDialogDescription>
                Menu '{{ conflictingMenu?.name }}' is currently assigned to this location. Assigning this menu will disable '{{ conflictingMenu?.name }}'. Continue?
              </UiAlertDialogDescription>
            </UiAlertDialogHeader>
            <UiAlertDialogFooter>
              <UiAlertDialogCancel @click="handleCancelConflict">Cancel</UiAlertDialogCancel>
              <UiAlertDialogAction @click="handleForceUpdate">Continue</UiAlertDialogAction>
            </UiAlertDialogFooter>
          </UiAlertDialogContent>
        </UiAlertDialog>
      </template>
    </div>
  </div>
</template>

