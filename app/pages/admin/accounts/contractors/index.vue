<script setup lang="ts">
import { vAutoAnimate } from '@formkit/auto-animate/vue'
import { toast } from 'vue-sonner'
import type { ContractorAccountsFilters, AccountStatus } from '~/types/accounts'

definePageMeta({
  layout: 'admin',
})

const {
  accounts,
  pagination,
  pending,
  fetchAccounts,
  updateAccountStatus,
} = useAdminContractorAccounts()

// Filter state
const filters = ref<ContractorAccountsFilters>({
  status: 'all',
  search: null,
  page: 1,
  limit: 10,
  orderBy: 'created_at',
  orderDirection: 'desc',
})

// Rows per page options
const rowsPerPageOptions = [10, 25, 50, 100]
const rowsPerPage = ref<string>('10')

// Selected filter values
const selectedStatus = ref<string>('all')
const searchQuery = ref<string>('')

// Status options
const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
]

// Fetch on mount
onMounted(async () => {
  await fetchAccounts(filters.value)
})

// Watch for filter changes
watch([selectedStatus, searchQuery], async () => {
  filters.value.status = selectedStatus.value as AccountStatus | 'all'
  filters.value.search = searchQuery.value.trim() || null
  filters.value.page = 1
  await fetchAccounts(filters.value)
})

// Pagination
const handlePageChange = async (page: number) => {
  filters.value.page = page
  await fetchAccounts(filters.value)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const handleRowsPerPageChange = async (value: string) => {
  rowsPerPage.value = value
  filters.value.limit = parseInt(value, 10)
  filters.value.page = 1
  await fetchAccounts(filters.value)
}

// Dialog state
const showSuspendDialog = ref(false)
const selectedAccountId = ref<string | null>(null)
const selectedAccountEmail = ref<string>('')
const selectedAccountStatus = ref<AccountStatus>('active')

// Actions
const handleSuspend = (id: string, email: string, currentStatus: AccountStatus) => {
  selectedAccountId.value = id
  selectedAccountEmail.value = email
  selectedAccountStatus.value = currentStatus
  showSuspendDialog.value = true
}

const confirmSuspend = async () => {
  if (!selectedAccountId.value) return
  const newStatus = selectedAccountStatus.value === 'active' ? 'suspended' : 'active'
  const result = await updateAccountStatus(selectedAccountId.value, newStatus)

  if (result.success) {
    toast.success(result.message)
    await fetchAccounts(filters.value)
  } else {
    toast.error(result.message)
  }
  showSuspendDialog.value = false
  selectedAccountId.value = null
}

const handleView = (id: string) => {
  navigateTo(`/admin/accounts/contractors/${id}`)
}

// Format date
const formatDate = (date: string | null) => {
  if (!date) return 'Never'
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Status badge variant
const getStatusVariant = (status: string) => {
  switch (status) {
    case 'active': return 'default'
    case 'suspended': return 'secondary'
    default: return 'outline'
  }
}
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">Contractor Accounts</h1>
          <p class="mt-1 text-sm text-muted-foreground">
            Manage business user accounts who claimed contractor profiles
          </p>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="mb-6 flex flex-wrap items-center gap-3">
      <!-- Search -->
      <div class="relative w-64">
        <Icon name="heroicons:magnifying-glass" class="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <UiInput v-model="searchQuery" placeholder="Search by email..." class="pl-9" />
      </div>

      <!-- Status Filter -->
      <UiPopover>
        <UiPopoverTrigger as-child>
          <UiButton variant="outline" size="sm" class="h-9 gap-1.5 border-dashed">
            <Icon name="heroicons:funnel" class="size-4" />
            Status
            <UiBadge v-if="selectedStatus !== 'all'" variant="secondary" class="ml-1 h-5 px-1.5">
              {{ statusOptions.find(o => o.value === selectedStatus)?.label }}
            </UiBadge>
          </UiButton>
        </UiPopoverTrigger>
        <UiPopoverContent class="w-48 p-1" align="start">
          <button
            v-for="option in statusOptions"
            :key="option.value"
            class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            :class="{ 'bg-accent': selectedStatus === option.value }"
            @click="selectedStatus = option.value"
          >
            <Icon v-if="selectedStatus === option.value" name="heroicons:check" class="size-4" />
            <span :class="{ 'ml-6': selectedStatus !== option.value }">{{ option.label }}</span>
          </button>
        </UiPopoverContent>
      </UiPopover>
    </div>

    <!-- Table -->
    <div class="no-scrollbar overflow-x-auto rounded-md border">
      <table class="w-full text-sm">
        <thead class="border-b bg-muted/50">
          <tr>
            <th class="px-4 py-3 text-left font-medium">Email</th>
            <th class="hidden px-4 py-3 text-left font-medium md:table-cell">Claimed Profiles</th>
            <th class="px-4 py-3 text-left font-medium">Status</th>
            <th class="hidden px-4 py-3 text-left font-medium lg:table-cell">Last Sign In</th>
            <th class="hidden px-4 py-3 text-left font-medium xl:table-cell">Created</th>
            <th class="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody v-auto-animate>
          <!-- Loading State -->
          <tr v-if="pending && accounts.length === 0">
            <td colspan="6" class="px-4 py-8 text-center">
              <UiSpinner />
            </td>
          </tr>
          <!-- Empty State -->
          <tr v-else-if="accounts.length === 0">
            <td colspan="6" class="px-4 py-8 text-center text-muted-foreground">
              No contractor accounts found.
            </td>
          </tr>
          <!-- Data Rows -->
          <tr v-for="account in accounts" :key="account.id" class="border-b last:border-0 hover:bg-muted/50">
            <td class="px-4 py-3 font-medium">{{ account.email }}</td>
            <td class="hidden px-4 py-3 md:table-cell">
              <UiBadge variant="outline">
                {{ account.claimedProfileCount }} profile{{ account.claimedProfileCount !== 1 ? 's' : '' }}
              </UiBadge>
            </td>
            <td class="px-4 py-3">
              <UiBadge :variant="getStatusVariant(account.status)">
                {{ account.status }}
              </UiBadge>
            </td>
            <td class="hidden px-4 py-3 lg:table-cell">
              <span class="text-muted-foreground">{{ formatDate(account.lastSignInAt || null) }}</span>
            </td>
            <td class="hidden px-4 py-3 xl:table-cell">
              <span class="text-muted-foreground">{{ formatDate(account.created_at) }}</span>
            </td>
            <td class="px-4 py-3 text-right">
              <UiDropdownMenu>
                <UiDropdownMenuTrigger as-child>
                  <UiButton variant="ghost" size="icon" class="size-8">
                    <Icon name="heroicons:ellipsis-horizontal" class="size-4" />
                  </UiButton>
                </UiDropdownMenuTrigger>
                <UiDropdownMenuContent align="end">
                  <UiDropdownMenuItem @click="handleView(account.id)">
                    <Icon name="heroicons:eye" class="size-4 mr-2" />
                    View Details
                  </UiDropdownMenuItem>
                  <UiDropdownMenuSeparator />
                  <UiDropdownMenuItem
                    @click="handleSuspend(account.id, account.email, account.status as AccountStatus)"
                  >
                    <Icon :name="account.status === 'suspended' ? 'heroicons:play' : 'heroicons:pause'" class="size-4 mr-2" />
                    {{ account.status === 'suspended' ? 'Reactivate' : 'Suspend' }}
                  </UiDropdownMenuItem>
                </UiDropdownMenuContent>
              </UiDropdownMenu>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination Footer -->
    <div v-if="!pending && accounts.length > 0" class="mt-4 flex flex-wrap items-center justify-between gap-4">
      <!-- Results Summary -->
      <div class="text-sm text-muted-foreground">
        Showing {{ pagination.offset + 1 }} to
        {{ Math.min(pagination.offset + pagination.limit, pagination.total) }} of
        {{ pagination.total }} accounts
      </div>

      <!-- Rows per page + Pagination -->
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <span class="text-sm text-muted-foreground">Rows per page</span>
          <UiSelect v-model="rowsPerPage" @update:model-value="handleRowsPerPageChange">
            <UiSelectTrigger class="h-8 w-16">
              <UiSelectValue />
            </UiSelectTrigger>
            <UiSelectContent>
              <UiSelectItem v-for="opt in rowsPerPageOptions" :key="opt" :value="opt.toString()">
                {{ opt }}
              </UiSelectItem>
            </UiSelectContent>
          </UiSelect>
        </div>

        <div class="flex items-center gap-1">
          <span class="text-sm text-muted-foreground">
            Page {{ pagination.page }} of {{ pagination.totalPages }}
          </span>
        </div>

        <div class="flex items-center gap-1">
          <UiButton
            variant="outline"
            size="icon"
            class="size-8"
            :disabled="pagination.page <= 1"
            @click="handlePageChange(1)"
          >
            <Icon name="heroicons:chevron-double-left" class="size-4" />
          </UiButton>
          <UiButton
            variant="outline"
            size="icon"
            class="size-8"
            :disabled="pagination.page <= 1"
            @click="handlePageChange(pagination.page - 1)"
          >
            <Icon name="heroicons:chevron-left" class="size-4" />
          </UiButton>
          <UiButton
            variant="outline"
            size="icon"
            class="size-8"
            :disabled="pagination.page >= pagination.totalPages"
            @click="handlePageChange(pagination.page + 1)"
          >
            <Icon name="heroicons:chevron-right" class="size-4" />
          </UiButton>
          <UiButton
            variant="outline"
            size="icon"
            class="size-8"
            :disabled="pagination.page >= pagination.totalPages"
            @click="handlePageChange(pagination.totalPages)"
          >
            <Icon name="heroicons:chevron-double-right" class="size-4" />
          </UiButton>
        </div>
      </div>
    </div>

    <!-- Suspend/Reactivate Dialog -->
    <UiAlertDialog :open="showSuspendDialog" @update:open="showSuspendDialog = $event">
      <UiAlertDialogContent>
        <UiAlertDialogHeader>
          <UiAlertDialogTitle>
            {{ selectedAccountStatus === 'active' ? 'Suspend Account' : 'Reactivate Account' }}
          </UiAlertDialogTitle>
          <UiAlertDialogDescription>
            {{ selectedAccountStatus === 'active'
              ? `Are you sure you want to suspend ${selectedAccountEmail}? They will not be able to access their contractor profiles.`
              : `Are you sure you want to reactivate ${selectedAccountEmail}? They will regain access to their contractor profiles.`
            }}
          </UiAlertDialogDescription>
        </UiAlertDialogHeader>
        <UiAlertDialogFooter>
          <UiAlertDialogCancel>Cancel</UiAlertDialogCancel>
          <UiAlertDialogAction @click="confirmSuspend">
            {{ selectedAccountStatus === 'active' ? 'Suspend' : 'Reactivate' }}
          </UiAlertDialogAction>
        </UiAlertDialogFooter>
      </UiAlertDialogContent>
    </UiAlertDialog>
  </div>
</template>

