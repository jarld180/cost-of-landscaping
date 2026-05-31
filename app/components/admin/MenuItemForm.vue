<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { consola } from 'consola'
import {
  ComboboxAnchor,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxPortal,
  ComboboxRoot,
  ComboboxViewport
} from 'reka-ui'
import { menuItemFormSchema, menuItemFormDefaultValues, type MenuItemFormData } from '~/schemas/admin/menu-item-form.schema'
import type { Database } from '~/types/supabase'

type Menu = Database['public']['Tables']['menus']['Row']
type MenuItem = Database['public']['Tables']['menu_items']['Row']
type Page = Database['public']['Tables']['pages']['Row']

interface Props {
  /**
   * Menu ID (required for creating items)
   */
  menuId: string

  /**
   * Menu object (for conditional rendering based on menu location)
   */
  menu?: Menu | null

  /**
   * Initial form data (for edit mode)
   */
  initialData?: Partial<MenuItemFormData>

  /**
   * Whether the form is in edit mode
   * @default false
   */
  isEditMode?: boolean

  /**
   * Whether the form is submitting
   * @default false
   */
  isSubmitting?: boolean

  /**
   * Available parent items (for parent dropdown)
   */
  parentItems?: MenuItem[]

  /**
   * Available pages (for page link dropdown)
   */
  pages?: Page[]
}

const props = withDefaults(defineProps<Props>(), {
  menu: null,
  initialData: undefined,
  isEditMode: false,
  isSubmitting: false,
  parentItems: () => [],
  pages: () => []
})

const emit = defineEmits<{
  'submit': [data: MenuItemFormData]
  'cancel': []
}>()

// =====================================================
// FORM SETUP
// =====================================================

const { values, errors, defineField, handleSubmit, setFieldValue } = useForm({
  validationSchema: toTypedSchema(menuItemFormSchema),
  initialValues: props.initialData || menuItemFormDefaultValues
})

// Define form fields with VeeValidate
const [label, labelAttrs] = defineField('label')
const [linkType, linkTypeAttrs] = defineField('link_type')
const [pageId, pageIdAttrs] = defineField('page_id')
const [customUrl, customUrlAttrs] = defineField('custom_url')
const [internalPath, internalPathAttrs] = defineField('internal_path')
const [description, descriptionAttrs] = defineField('description')
const [parentId, parentIdAttrs] = defineField('parent_id')
const [openInNewTab, openInNewTabAttrs] = defineField('open_in_new_tab')
const [isEnabled, isEnabledAttrs] = defineField('is_enabled')

// =====================================================
// CONDITIONAL FIELD LOGIC
// =====================================================

// Clear fields when switching link type
watch(linkType, (newType) => {
  if (newType === 'dropdown') {
    setFieldValue('page_id', null)
    setFieldValue('custom_url', null)
    setFieldValue('internal_path', null)
    setFieldValue('parent_id', null)
  } else if (newType === 'custom') {
    setFieldValue('page_id', null)
    setFieldValue('internal_path', null)
  } else if (newType === 'page') {
    setFieldValue('custom_url', null)
    setFieldValue('internal_path', null)
  } else if (newType === 'internal') {
    setFieldValue('page_id', null)
    setFieldValue('custom_url', null)
  }
})

// Computed flags for conditional rendering
const isDropdown = computed(() => linkType.value === 'dropdown')
const isLink = computed(() => linkType.value === 'page' || linkType.value === 'custom' || linkType.value === 'internal')
const isFooterMenu = computed(() => props.menu?.show_in_footer === true)

// Get available internal routes from the router
const router = useRouter()
const internalRoutes = computed(() => {
  return router.getRoutes()
    .filter(route => {
      // Exclude dynamic routes with parameters like [id], [slug], etc.
      if (route.path.includes(':') || route.path.includes('[')) return false
      // Exclude admin routes
      if (route.path.startsWith('/admin')) return false
      // Exclude dev routes
      if (route.path.startsWith('/dev')) return false
      // Exclude owner routes
      if (route.path.startsWith('/owner')) return false
      // Exclude claim routes
      if (route.path.startsWith('/claim')) return false
      // Exclude API-like routes
      if (route.path.startsWith('/api')) return false
      // Must have a path
      if (!route.path || route.path === '') return false
      return true
    })
    .map(route => route.path)
    .sort()
})

// Combobox search/filter state
const internalRouteSearch = ref('')
const filteredInternalRoutes = computed(() => {
  const search = internalRouteSearch.value.toLowerCase()
  if (!search) return internalRoutes.value
  return internalRoutes.value.filter(path => path.toLowerCase().includes(search))
})

// =====================================================
// FORM SUBMISSION
// =====================================================

const onSubmit = handleSubmit((formData) => {
  if (import.meta.client && import.meta.dev) {
    consola.info('[MenuItemForm] Form submitted:', formData)
  }
  emit('submit', formData)
})

const onCancel = () => {
  emit('cancel')
}
</script>

<template>
  <form
    @submit.prevent="onSubmit"
    class="space-y-6"
  >
    <!-- Label Field -->
    <div>
      <label
        for="label"
        class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
      >
        Label <span class="text-red-500">*</span>
      </label>
      <input
        id="label"
        v-model="label"
        v-bind="labelAttrs"
        type="text"
        placeholder="Home"
        class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-100"
        :class="{ 'border-red-500': errors.label }"
      />
      <p
        v-if="errors.label"
        class="mt-1 text-sm text-red-600 dark:text-red-400"
      >
        {{ errors.label }}
      </p>
    </div>

    <!-- Link Type Info (for dropdowns) -->
    <div v-if="isDropdown" class="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
      <div class="flex items-start gap-3">
        <Icon name="heroicons:information-circle" class="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
        <div>
          <h4 class="text-sm font-medium text-green-900 dark:text-green-100 mb-1">
            Dropdown Menu
          </h4>
          <p class="text-sm text-green-700 dark:text-green-300">
            This is a label-only dropdown menu. It will not link to any page. You can add links under this dropdown using the "Add Link" action.
          </p>
        </div>
      </div>
    </div>

    <!-- Link Type Radio Buttons (for links only) -->
    <div v-if="isLink" class="space-y-3">
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
        Link Type <span class="text-red-500">*</span>
      </label>

      <div class="flex items-center gap-2">
        <input
          id="link_type_page"
          v-model="linkType"
          v-bind="linkTypeAttrs"
          type="radio"
          value="page"
          class="h-4 w-4 border-neutral-300 text-blue-600 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800"
        />
        <label
          for="link_type_page"
          class="text-sm text-neutral-700 dark:text-neutral-300"
        >
          Page Link
        </label>
      </div>

      <div class="flex items-center gap-2">
        <input
          id="link_type_internal"
          v-model="linkType"
          v-bind="linkTypeAttrs"
          type="radio"
          value="internal"
          class="h-4 w-4 border-neutral-300 text-blue-600 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800"
        />
        <label
          for="link_type_internal"
          class="text-sm text-neutral-700 dark:text-neutral-300"
        >
          Internal Route
        </label>
      </div>

      <div class="flex items-center gap-2">
        <input
          id="link_type_custom"
          v-model="linkType"
          v-bind="linkTypeAttrs"
          type="radio"
          value="custom"
          class="h-4 w-4 border-neutral-300 text-blue-600 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800"
        />
        <label
          for="link_type_custom"
          class="text-sm text-neutral-700 dark:text-neutral-300"
        >
          Custom URL
        </label>
      </div>

      <p
        v-if="errors.link_type"
        class="mt-1 text-sm text-red-600 dark:text-red-400"
      >
        {{ errors.link_type }}
      </p>
    </div>

    <!-- Page Link Dropdown (conditional) -->
    <div v-if="linkType === 'page'">
      <label
        for="page_id"
        class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
      >
        Select Page <span class="text-red-500">*</span>
      </label>
      <select
        id="page_id"
        v-model="pageId"
        v-bind="pageIdAttrs"
        class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-100"
        :class="{ 'border-red-500': errors.page_id }"
      >
        <option :value="null">
          Select a page...
        </option>
        <option
          v-for="page in pages"
          :key="page.id"
          :value="page.id"
        >
          {{ page.title }} ({{ page.full_path }})
        </option>
      </select>
      <p
        v-if="errors.page_id"
        class="mt-1 text-sm text-red-600 dark:text-red-400"
      >
        {{ errors.page_id }}
      </p>
    </div>

    <!-- Internal Route Combobox (conditional) -->
    <div v-if="linkType === 'internal'">
      <label
        class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
      >
        Select Internal Route <span class="text-red-500">*</span>
      </label>
      <ComboboxRoot
        v-model="internalPath"
        v-model:search-term="internalRouteSearch"
        class="relative"
      >
        <ComboboxAnchor
          class="w-full px-4 py-2 border rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 dark:bg-neutral-800 dark:border-neutral-600 flex items-center gap-2"
          :class="{ 'border-red-500': errors.internal_path }"
        >
          <Icon name="heroicons:link" class="h-4 w-4 text-neutral-400" />
          <ComboboxInput
            v-bind="internalPathAttrs"
            class="flex-1 bg-transparent outline-none dark:text-neutral-100 placeholder:text-neutral-400"
            placeholder="Search routes (e.g., /find, /login)..."
            :display-value="(val) => val as string ?? ''"
          />
        </ComboboxAnchor>

        <ComboboxPortal>
          <ComboboxContent
            class="z-50 max-h-60 w-[var(--reka-combobox-trigger-width)] overflow-hidden rounded-lg border bg-white shadow-lg dark:bg-neutral-800 dark:border-neutral-600"
            position="popper"
            side="bottom"
            align="start"
            :side-offset="4"
          >
            <ComboboxViewport class="p-1">
              <ComboboxEmpty class="px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400">
                No routes found
              </ComboboxEmpty>
              <ComboboxItem
                v-for="route in filteredInternalRoutes"
                :key="route"
                :value="route"
                class="relative flex cursor-pointer select-none items-center rounded-md px-3 py-2 text-sm outline-none data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-900 dark:data-[highlighted]:bg-blue-900/20 dark:data-[highlighted]:text-blue-100 dark:text-neutral-100"
              >
                <Icon name="heroicons:document" class="mr-2 h-4 w-4 text-neutral-400" />
                {{ route }}
              </ComboboxItem>
            </ComboboxViewport>
          </ComboboxContent>
        </ComboboxPortal>
      </ComboboxRoot>
      <p
        v-if="errors.internal_path"
        class="mt-1 text-sm text-red-600 dark:text-red-400"
      >
        {{ errors.internal_path }}
      </p>
      <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        Select a route from your application (e.g., /find, /login, /concrete-contractors)
      </p>
    </div>

    <!-- Custom URL Field (conditional) -->
    <div v-if="linkType === 'custom'">
      <label
        for="custom_url"
        class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
      >
        Custom URL <span class="text-red-500">*</span>
      </label>
      <input
        id="custom_url"
        v-model="customUrl"
        v-bind="customUrlAttrs"
        type="url"
        placeholder="https://example.com"
        class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-100"
        :class="{ 'border-red-500': errors.custom_url }"
      />
      <p
        v-if="errors.custom_url"
        class="mt-1 text-sm text-red-600 dark:text-red-400"
      >
        {{ errors.custom_url }}
      </p>

      <!-- Open in New Tab (only for custom URLs) -->
      <Checkbox
        id="open_in_new_tab"
        v-model="openInNewTab"
        v-bind="openInNewTabAttrs"
        label="Open in new tab"
        name="open_in_new_tab"
        class="mt-3"
      />
    </div>

    <!-- Parent Dropdown (only for links, not dropdowns, and not for footer menus) -->
    <div v-if="isLink && !isFooterMenu">
      <label
        for="parent_id"
        class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
      >
        Parent Dropdown Menu (Optional)
      </label>
      <select
        id="parent_id"
        v-model="parentId"
        v-bind="parentIdAttrs"
        class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-100"
        :class="{ 'border-red-500': errors.parent_id }"
      >
        <option :value="null">
          None (Top-level link)
        </option>
        <option
          v-for="item in parentItems"
          :key="item.id"
          :value="item.id"
        >
          {{ item.label }}
        </option>
      </select>
      <p
        v-if="errors.parent_id"
        class="mt-1 text-sm text-red-600 dark:text-red-400"
      >
        {{ errors.parent_id }}
      </p>
      <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        Select a dropdown menu to nest this link under it
      </p>
    </div>

    <!-- Description Field -->
    <div>
      <label
        for="description"
        class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
      >
        Description
      </label>
      <textarea
        id="description"
        v-model="description"
        v-bind="descriptionAttrs"
        rows="3"
        placeholder="Optional description for this menu item"
        class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-100"
        :class="{ 'border-red-500': errors.description }"
      />
      <p
        v-if="errors.description"
        class="mt-1 text-sm text-red-600 dark:text-red-400"
      >
        {{ errors.description }}
      </p>
    </div>

    <!-- Enabled Checkbox -->
    <Checkbox
      id="is_enabled"
      v-model="isEnabled"
      v-bind="isEnabledAttrs"
      label="Enable this menu item"
      name="is_enabled"
    />

    <!-- Form Actions -->
    <div class="flex items-center justify-end gap-3 pt-6 border-t border-neutral-200 dark:border-neutral-700">
      <Button
        text="Cancel"
        variant="ghost"
        type="button"
        @click="onCancel"
        :disabled="isSubmitting"
      />
      <Button
        :text="isEditMode ? 'Update Item' : 'Create Item'"
        variant="primary"
        type="submit"
        :disabled="isSubmitting"
      />
    </div>
  </form>
</template>
