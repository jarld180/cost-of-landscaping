<script setup lang="ts">
import type { Database } from '~/types/supabase'
import { useSortable } from '@vueuse/integrations/useSortable'
import { ref, watch } from 'vue'

type MenuItem = Database['public']['Tables']['menu_items']['Row']

interface Props {
  /**
   * Array of menu items to display
   */
  menuItems: MenuItem[]

  /**
   * Loading state
   */
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

// Emits
const emit = defineEmits<{
  addChildLink: [parentId: string]
  edit: [itemId: string]
  delete: [itemId: string]
  reorder: [updates: Array<{ id: string; display_order: number }>]
  toggleEnabled: [itemId: string, value: boolean]
}>()

// Get link type display based on link_type column
const getLinkTypeDisplay = (item: MenuItem) => {
  if (item.link_type === 'dropdown') return 'Dropdown Menu'
  if (item.link_type === 'page') return 'Page Link'
  if (item.link_type === 'custom') return 'Custom URL'
  return 'Unknown'
}

// Get link type color
const getLinkTypeColor = (item: MenuItem) => {
  if (item.link_type === 'dropdown') return 'text-green-600 dark:text-green-400 border-green-600 dark:border-green-400'
  if (item.link_type === 'page') return 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
  if (item.link_type === 'custom') return 'text-purple-600 dark:text-purple-400 border-purple-600 dark:border-purple-400'
  return 'text-gray-600 dark:text-gray-400 border-gray-600 dark:border-gray-400'
}

// Calculate indentation based on parent_id
const getIndentation = (item: MenuItem) => {
  return item.parent_id ? 20 : 0 // 20px for children
}

// Handle action clicks
const handleAddChild = (parentId: string) => {
  emit('addChildLink', parentId)
}

const handleEdit = (itemId: string) => {
  emit('edit', itemId)
}

const handleDelete = (itemId: string) => {
  emit('delete', itemId)
}

const handleToggleEnabled = (itemId: string, value: boolean) => {
  emit('toggleEnabled', itemId, value)
}

// Drag and Drop Implementation
const el = ref<HTMLElement | null>(null)
const localItems = ref<MenuItem[]>([...props.menuItems])
const isReordering = ref(false)

// Watch for prop changes to update local state
watch(() => props.menuItems, (newItems) => {
  localItems.value = [...newItems]
}, { deep: true })

useSortable(el, localItems, {
  handle: '.drag-handle',
  animation: 150,
  ghostClass: 'bg-blue-50',
  dragClass: 'opacity-50',
  onMove: (evt: { dragged: HTMLElement; related: HTMLElement }) => {
    // Only allow dragging within same parent
    const draggedParentId = evt.dragged.dataset.parentId || ''
    const targetParentId = evt.related.dataset.parentId || ''
    return draggedParentId === targetParentId
  },
  onEnd: async (evt: { oldIndex: number; newIndex: number }) => {
    const { oldIndex, newIndex } = evt
    console.log('[AdminMenuItemList] Drag ended:', { oldIndex, newIndex })

    if (oldIndex === newIndex) {
      console.log('[AdminMenuItemList] No change in position, skipping reorder')
      return
    }

    isReordering.value = true
    try {
      // IMPORTANT: useSortable does NOT automatically update the Vue ref!
      // We need to manually reorder the localItems array
      const items = [...localItems.value]
      const [movedItem] = items.splice(oldIndex, 1)
      if (!movedItem) {
        console.error('[AdminMenuItemList] No item at oldIndex:', oldIndex)
        return
      }
      items.splice(newIndex, 0, movedItem)
      localItems.value = items

      console.log('[AdminMenuItemList] Manually reordered localItems:', items.map((item, idx) => ({
        index: idx,
        id: item.id,
        label: item.label,
        parent_id: item.parent_id
      })))

      // Get the parent ID from the moved item
      const parentId = movedItem.parent_id

      console.log('[AdminMenuItemList] Moved item:', {
        id: movedItem.id,
        label: movedItem.label,
        parentId,
        oldIndex,
        newIndex
      })

      // Filter items that belong to this parent from the REORDERED localItems
      // This gives us the new order we want to save
      const siblings = localItems.value.filter(item => item.parent_id === parentId)

      console.log('[AdminMenuItemList] Siblings in NEW order:', siblings.map((s, idx) => ({
        id: s.id,
        label: s.label,
        old_display_order: s.display_order,
        new_display_order: idx
      })))

      // Create updates array based on the NEW positions in the reordered array
      const updates = siblings.map((item, index) => ({
        id: item.id,
        display_order: index
      }))

      console.log('[AdminMenuItemList] Emitting reorder with updates:', updates)

      emit('reorder', updates)
    } catch (error) {
      console.error('[AdminMenuItemList] Failed to reorder menu items:', error)
      // Revert changes if failed
      localItems.value = [...props.menuItems]
    } finally {
      isReordering.value = false
    }
  }
})
</script>

<template>
  <div class="w-full">
    <!-- Loading State -->
    <div
      v-if="loading"
      class="flex items-center justify-center py-12"
    >
      <div class="flex flex-col items-center gap-3">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-blue-600 dark:border-neutral-700 dark:border-t-blue-400" />
        <p class="text-sm text-neutral-600 dark:text-neutral-400">Loading menu items...</p>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="menuItems.length === 0"
      class="flex flex-col items-center justify-center py-12 px-4"
    >
      <Icon
        name="heroicons:list-bullet"
        class="h-16 w-16 text-neutral-300 dark:text-neutral-600 mb-4"
      />
      <h3 class="text-lg font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
        No menu items found
      </h3>
      <p class="text-sm text-neutral-500 dark:text-neutral-400 mb-6 text-center max-w-md">
        Get started by adding dropdown menus and links to build your navigation.
      </p>
    </div>

    <!-- Menu Item Table -->
    <div
      v-else
      class="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700"
    >
      <table class="w-full">
        <!-- Table Header -->
        <thead class="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
          <tr>
            <th class="w-10 px-3 py-3" />
            <!-- Drag handle column -->
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
              Label
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
              Link Type
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-700 dark:text-neutral-300 hidden md:table-cell">
              Link
            </th>
            <th class="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
              Enabled
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
              Actions
            </th>
          </tr>
        </thead>

        <!-- Table Body -->
        <tbody
          ref="el"
          class="divide-y divide-neutral-200 dark:divide-neutral-700 bg-white dark:bg-neutral-900"
        >
          <tr
            v-for="item in localItems"
            :key="item.id"
            :data-parent-id="item.parent_id || ''"
            class="hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors group"
          >
            <!-- Drag Handle -->
            <td class="px-3 py-4 whitespace-nowrap text-center">
              <button
                type="button"
                class="drag-handle cursor-grab active:cursor-grabbing text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 p-1 rounded touch-none"
                title="Drag to reorder"
              >
                <Icon
                  name="heroicons:bars-3"
                  class="h-5 w-5"
                />
              </button>
            </td>

            <!-- Label (with indentation) -->
            <td class="px-6 py-4">
              <div
                class="flex items-center gap-2"
                :style="{ paddingLeft: `${getIndentation(item)}px` }"
              >
                <!-- Hierarchy indicator -->
                <Icon
                  v-if="item.parent_id"
                  name="heroicons:chevron-right"
                  class="h-4 w-4 text-neutral-400 dark:text-neutral-500 flex-shrink-0"
                />

                <div class="flex flex-col">
                  <span class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {{ item.label }}
                  </span>
                  <span
                    v-if="item.description"
                    class="text-xs text-neutral-500 dark:text-neutral-400 mt-1"
                  >
                    {{ item.description }}
                  </span>
                </div>
              </div>
            </td>

            <!-- Link Type -->
            <td class="px-6 py-4">
              <span
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border"
                :class="getLinkTypeColor(item)"
              >
                {{ getLinkTypeDisplay(item) }}
              </span>
            </td>

            <!-- Link -->
            <td class="px-6 py-4 hidden md:table-cell">
              <span class="text-sm text-neutral-600 dark:text-neutral-400 truncate max-w-xs block">
                <template v-if="item.link_type === 'dropdown'">
                  —
                </template>
                <template v-else-if="item.link_type === 'custom'">
                  {{ item.custom_url }}
                </template>
                <template v-else>
                  Page Link
                </template>
              </span>
            </td>

            <!-- Enabled Toggle -->
            <td class="px-6 py-4 text-center">
              <div class="flex justify-center">
                <Switch
                  :model-value="item.is_enabled"
                  size="sm"
                  @update:model-value="handleToggleEnabled(item.id, $event)"
                />
              </div>
            </td>

            <!-- Actions -->
            <td class="px-6 py-4">
              <TableActionsMenu
                :actions="[
                  {
                    label: 'Add Link',
                    icon: 'heroicons:plus',
                    onClick: () => handleAddChild(item.id),
                    show: item.link_type === 'dropdown'
                  },
                  {
                    label: 'Edit',
                    icon: 'heroicons:pencil',
                    onClick: () => handleEdit(item.id)
                  },
                  {
                    label: 'Delete',
                    icon: 'heroicons:trash',
                    onClick: () => handleDelete(item.id),
                    variant: 'danger'
                  }
                ]"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

