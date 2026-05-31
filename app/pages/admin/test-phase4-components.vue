<script setup lang="ts">
import {
  FlexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useVueTable,
  createColumnHelper,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/vue-table'
import { valueUpdater } from '~/components/admin-ui/table/utils'

/**
 * Test page for Phase 4 Data Display Components (BAM-187)
 * Tests: Table with TanStack (sorting, filtering), Pagination, Spinner, Empty, Skeleton, ScrollArea
 */
definePageMeta({
  layout: 'admin'
})

// Define data type
interface User {
  id: number
  name: string
  email: string
  status: 'Active' | 'Inactive' | 'Pending'
  visits: number
}

// Sample data for table
const data = ref<User[]>([
  { id: 1, name: 'John Doe', email: 'john@example.com', status: 'Active', visits: 120 },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'Inactive', visits: 45 },
  { id: 3, name: 'Bob Wilson', email: 'bob@example.com', status: 'Active', visits: 89 },
  { id: 4, name: 'Alice Brown', email: 'alice@example.com', status: 'Pending', visits: 12 },
  { id: 5, name: 'Charlie Davis', email: 'charlie@example.com', status: 'Active', visits: 234 },
  { id: 6, name: 'Diana Evans', email: 'diana@example.com', status: 'Inactive', visits: 67 },
  { id: 7, name: 'Frank Garcia', email: 'frank@example.com', status: 'Active', visits: 156 },
  { id: 8, name: 'Grace Harris', email: 'grace@example.com', status: 'Pending', visits: 23 },
])

// TanStack Table setup
const columnHelper = createColumnHelper<User>()

const columns = [
  columnHelper.accessor('id', {
    header: 'ID',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('name', {
    header: 'Name',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('email', {
    header: 'Email',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('visits', {
    header: 'Visits',
    cell: info => info.getValue(),
  }),
]

// Sorting state
const sorting = ref<SortingState>([])

// Filtering state
const columnFilters = ref<ColumnFiltersState>([])
const globalFilter = ref('')

// Column visibility state
const columnVisibility = ref({})

// Create table instance
const table = useVueTable({
  get data() { return data.value },
  columns,
  state: {
    get sorting() { return sorting.value },
    get columnFilters() { return columnFilters.value },
    get globalFilter() { return globalFilter.value },
    get columnVisibility() { return columnVisibility.value },
  },
  onSortingChange: updaterOrValue => valueUpdater(updaterOrValue, sorting),
  onColumnFiltersChange: updaterOrValue => valueUpdater(updaterOrValue, columnFilters),
  onGlobalFilterChange: updaterOrValue => valueUpdater(updaterOrValue, globalFilter),
  onColumnVisibilityChange: updaterOrValue => valueUpdater(updaterOrValue, columnVisibility),
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
})

// Pagination state (separate from TanStack for demo)
const currentPage = ref(1)
const itemsPerPage = 2

// Show states
const showEmpty = ref(false)
</script>

<template>
  <div class="p-6 space-y-12">
    <h1 class="text-3xl font-bold">Phase 4: Data Display Components Test</h1>
    <p class="text-muted-foreground">Testing all components from BAM-187 with TanStack Table</p>

    <!-- Section 1: TanStack Table with Sorting, Filtering, Column Visibility -->
    <section class="space-y-4">
      <h2 class="text-xl font-semibold">1. TanStack Table (Sorting, Filtering, Column Visibility)</h2>

      <!-- Table Controls -->
      <div class="flex flex-wrap items-center gap-4">
        <!-- Global Filter -->
        <div class="flex items-center gap-2">
          <label class="text-sm font-medium">Search:</label>
          <UiInput
            v-model="globalFilter"
            placeholder="Filter all columns..."
            class="max-w-sm"
          />
        </div>

        <!-- Column Visibility Toggle -->
        <UiDropdownMenu>
          <UiDropdownMenuTrigger as-child>
            <UiButton variant="outline">
              <Icon name="lucide:columns" class="mr-2 size-4" />
              Columns
            </UiButton>
          </UiDropdownMenuTrigger>
          <UiDropdownMenuContent align="end">
            <UiDropdownMenuCheckboxItem
              v-for="column in table.getAllLeafColumns()"
              :key="column.id"
              :checked="column.getIsVisible()"
              @update:checked="column.toggleVisibility()"
            >
              {{ column.id }}
            </UiDropdownMenuCheckboxItem>
          </UiDropdownMenuContent>
        </UiDropdownMenu>

        <UiButton variant="outline" @click="showEmpty = !showEmpty">
          Toggle Empty State
        </UiButton>
      </div>

      <!-- Table -->
      <div class="border rounded-lg">
        <UiTable>
          <UiTableHeader>
            <UiTableRow
              v-for="headerGroup in table.getHeaderGroups()"
              :key="headerGroup.id"
            >
              <UiTableHead
                v-for="header in headerGroup.headers"
                :key="header.id"
                :class="header.column.getCanSort() ? 'cursor-pointer select-none' : ''"
                @click="header.column.getToggleSortingHandler()?.($event)"
              >
                <div class="flex items-center gap-1">
                  <FlexRender
                    v-if="!header.isPlaceholder"
                    :render="header.column.columnDef.header"
                    :props="header.getContext()"
                  />
                  <template v-if="header.column.getIsSorted() === 'asc'">
                    <Icon name="lucide:arrow-up" class="size-4" />
                  </template>
                  <template v-else-if="header.column.getIsSorted() === 'desc'">
                    <Icon name="lucide:arrow-down" class="size-4" />
                  </template>
                </div>
              </UiTableHead>
            </UiTableRow>
          </UiTableHeader>
          <UiTableBody>
            <template v-if="showEmpty || table.getRowModel().rows.length === 0">
              <UiTableEmpty :colspan="columns.length">
                No data available
              </UiTableEmpty>
            </template>
            <template v-else>
              <UiTableRow
                v-for="row in table.getRowModel().rows"
                :key="row.id"
              >
                <UiTableCell
                  v-for="cell in row.getVisibleCells()"
                  :key="cell.id"
                >
                  <FlexRender
                    :render="cell.column.columnDef.cell"
                    :props="cell.getContext()"
                  />
                </UiTableCell>
              </UiTableRow>
            </template>
          </UiTableBody>
          <UiTableFooter>
            <UiTableRow>
              <UiTableCell :colspan="columns.length" class="text-right">
                Total: {{ table.getRowModel().rows.length }} records
              </UiTableCell>
            </UiTableRow>
          </UiTableFooter>
          <UiTableCaption>
            Click column headers to sort. Use search to filter.
          </UiTableCaption>
        </UiTable>
      </div>

      <!-- Debug Info -->
      <div class="text-sm text-muted-foreground">
        <p>Sorting: {{ sorting.length > 0 ? sorting.map(s => `${s.id} ${s.desc ? 'desc' : 'asc'}`).join(', ') : 'None' }}</p>
        <p>Global Filter: {{ globalFilter || 'None' }}</p>
      </div>
    </section>

    <!-- Section 2: Pagination -->
    <section class="space-y-4">
      <h2 class="text-xl font-semibold">2. Pagination Component</h2>
      <UiPagination
        v-model:page="currentPage"
        :total="50"
        :items-per-page="itemsPerPage"
        :sibling-count="1"
        show-edges
      >
        <UiPaginationContent>
          <UiPaginationFirst />
          <UiPaginationPrevious />
          <UiPaginationItem :value="1" :is-active="currentPage === 1">1</UiPaginationItem>
          <UiPaginationItem :value="2" :is-active="currentPage === 2">2</UiPaginationItem>
          <UiPaginationEllipsis />
          <UiPaginationItem :value="5" :is-active="currentPage === 5">5</UiPaginationItem>
          <UiPaginationNext />
          <UiPaginationLast />
        </UiPaginationContent>
      </UiPagination>
      <p class="text-sm text-muted-foreground">Current page: {{ currentPage }}</p>
    </section>

    <!-- Section 3: Loading States -->
    <section class="space-y-4">
      <h2 class="text-xl font-semibold">3. Loading States</h2>

      <div class="grid grid-cols-2 gap-6">
        <!-- Spinner -->
        <div class="space-y-2">
          <h3 class="font-medium">Spinner</h3>
          <div class="flex items-center gap-4">
            <UiSpinner />
            <UiSpinner class="size-6" />
            <UiSpinner class="size-8" />
          </div>
        </div>

        <!-- Skeleton -->
        <div class="space-y-2">
          <h3 class="font-medium">Skeleton</h3>
          <div class="space-y-2">
            <UiSkeleton class="h-4 w-3/4" />
            <UiSkeleton class="h-4 w-1/2" />
            <UiSkeleton class="h-10 w-full" />
          </div>
        </div>
      </div>
    </section>

    <!-- Section 4: Empty State -->
    <section class="space-y-4">
      <h2 class="text-xl font-semibold">4. Empty State</h2>
      <UiEmpty class="border">
        <UiEmptyMedia variant="icon">
          <Icon name="lucide:inbox" class="size-6" />
        </UiEmptyMedia>
        <UiEmptyContent>
          <UiEmptyHeader>
            <UiEmptyTitle variant="default">No items found</UiEmptyTitle>
          </UiEmptyHeader>
          <UiEmptyDescription>
            There are no items to display. Try adjusting your filters or add a new item.
          </UiEmptyDescription>
        </UiEmptyContent>
        <UiButton>Add Item</UiButton>
      </UiEmpty>
    </section>

    <!-- Section 5: Scroll Area -->
    <section class="space-y-4">
      <h2 class="text-xl font-semibold">5. Scroll Area</h2>
      <UiScrollArea class="h-48 w-full rounded-md border p-4">
        <div class="space-y-4">
          <p v-for="i in 20" :key="i" class="text-sm">
            Scroll item {{ i }}: Lorem ipsum dolor sit amet, consectetur adipiscing elit.
          </p>
        </div>
      </UiScrollArea>
    </section>
  </div>
</template>

