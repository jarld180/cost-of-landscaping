<script setup lang="ts">
import { consola } from 'consola'
import { toast } from 'vue-sonner'
import type { AdminClaimsFilters, ClaimWithContractor } from '~/composables/useAdminClaims'
import type { ClaimStatus } from '~/types/claims'

// Page metadata
definePageMeta({
  layout: 'admin',
})

// Use admin claims composable
const { claims, pagination, pending, error, fetchClaims, updateClaimStatus, resendActivationEmail } = useAdminClaims()

// Get route for reading query params
const route = useRoute()
const router = useRouter()

// Valid claim statuses
const VALID_STATUSES: ClaimStatus[] = ['unverified', 'pending', 'approved', 'rejected', 'completed']

// Status filter options - all 5 statuses plus 'all'
const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'unverified', label: 'Unverified' },
  { value: 'pending', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'completed', label: 'Completed' },
]

// Initialize from URL query params
const getInitialStatus = (): string => {
  const urlStatus = route.query.status as string | undefined
  if (urlStatus && VALID_STATUSES.includes(urlStatus as ClaimStatus)) {
    return urlStatus
  }
  return 'pending' // Default to pending (verified claims awaiting review)
}

const getInitialSearch = (): string => {
  return (route.query.search as string) || ''
}

// Selected filter values - initialized from URL
const selectedStatus = ref<string>(getInitialStatus())
const searchQuery = ref<string>(getInitialSearch())

// Filter state - initialized from URL
const initialSearch = searchQuery.value ?? ''
const filters = ref<AdminClaimsFilters>({
  status: selectedStatus.value === 'all' ? 'all' : selectedStatus.value as ClaimStatus,
  search: initialSearch.trim().length > 0 ? initialSearch : null,
  page: 1,
  limit: 20,
  orderBy: 'created_at',
  orderDirection: 'desc',
})

// Fetch claims on mount
onMounted(async () => {
  await fetchClaims(filters.value)
})

// Watch for filter changes and sync URL
watch([selectedStatus, searchQuery], async () => {
  const searchValue = searchQuery.value ?? ''
  filters.value.status = selectedStatus.value === 'all' ? 'all' : selectedStatus.value as ClaimStatus
  filters.value.search = searchValue.trim().length > 0 ? searchValue : null
  filters.value.page = 1

  // Update URL query params
  const query: Record<string, string> = {}
  if (selectedStatus.value !== 'pending') {
    query.status = selectedStatus.value
  }
  if (searchValue.trim()) {
    query.search = searchValue.trim()
  }
  router.replace({ query })

  await fetchClaims(filters.value)
})

// Handle pagination change
const handlePageChange = async (page: number) => {
  filters.value.page = page
  await fetchClaims(filters.value)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// Approve/Reject dialogs
const showApproveDialog = ref(false)
const showRejectDialog = ref(false)
const claimToProcess = ref<ClaimWithContractor | null>(null)
const rejectNotes = ref('')
const processing = ref(false)

const handleApprove = (claim: ClaimWithContractor) => {
  claimToProcess.value = claim
  showApproveDialog.value = true
}

const handleReject = (claim: ClaimWithContractor) => {
  claimToProcess.value = claim
  rejectNotes.value = ''
  showRejectDialog.value = true
}

const confirmApprove = async () => {
  if (!claimToProcess.value) return
  processing.value = true

  const success = await updateClaimStatus(claimToProcess.value.id, 'approved')

  if (success) {
    toast.success('Claim approved successfully')
    if (import.meta.dev) {
      consola.success('Claim approved:', claimToProcess.value.id)
    }
    await fetchClaims(filters.value)
  } else {
    toast.error('Failed to approve claim')
  }

  processing.value = false
  showApproveDialog.value = false
  claimToProcess.value = null
}

const confirmReject = async () => {
  if (!claimToProcess.value) return
  processing.value = true

  const success = await updateClaimStatus(claimToProcess.value.id, 'rejected', rejectNotes.value || undefined)

  if (success) {
    toast.success('Claim rejected')
    if (import.meta.dev) {
      consola.success('Claim rejected:', claimToProcess.value.id)
    }
    await fetchClaims(filters.value)
  } else {
    toast.error('Failed to reject claim')
  }

  processing.value = false
  showRejectDialog.value = false
  claimToProcess.value = null
  rejectNotes.value = ''
}

const cancelDialog = () => {
  showApproveDialog.value = false
  showRejectDialog.value = false
  claimToProcess.value = null
  rejectNotes.value = ''
}

// Resend activation email handler
const resendingActivation = ref<string | null>(null)

const handleResendActivation = async (claim: ClaimWithContractor) => {
  resendingActivation.value = claim.id
  const success = await resendActivationEmail(claim.id)

  if (success) {
    toast.success('Activation email resent successfully')
    if (import.meta.dev) {
      consola.success('Activation email resent for claim:', claim.id)
    }
  } else {
    toast.error('Failed to resend activation email')
  }

  resendingActivation.value = null
}

// Check if claim can have activation resent (approved but not activated)
const canResendActivation = (claim: ClaimWithContractor): boolean => {
  return claim.status === 'approved' && !claim.account_activated_at
}

// Format date helper
const formatDate = (date: string | null) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Status badge styling with all 5 statuses
const getStatusClasses = (status: string) => {
  switch (status) {
    case 'unverified':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    case 'approved':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    case 'rejected':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    case 'completed':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    default:
      return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300'
  }
}

// Get human-readable status label
const getStatusLabel = (status: string) => {
  switch (status) {
    case 'unverified':
      return 'Awaiting Verification'
    case 'pending':
      return 'Pending Review'
    case 'approved':
      return 'Approved'
    case 'rejected':
      return 'Rejected'
    case 'completed':
      return 'Completed'
    default:
      return status
  }
}
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">Profile Claims</h1>
          <p class="mt-1 text-sm text-muted-foreground">Review and manage contractor profile claiming requests</p>
        </div>
      </div>
    </div>

    <!-- Filters Section -->
    <div class="mb-6 flex flex-wrap items-center gap-3">
      <!-- Search Input -->
      <div class="relative w-72">
        <Icon name="heroicons:magnifying-glass" class="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <UiInput
          v-model="searchQuery"
          placeholder="Search by name or email..."
          class="pl-9"
        />
      </div>

      <!-- Status Filter Dropdown -->
      <UiPopover>
        <UiPopoverTrigger as-child>
          <UiButton variant="outline" size="sm" class="h-9 gap-1.5 border-dashed">
            <Icon name="heroicons:funnel" class="size-4" />
            Status
            <UiBadge v-if="selectedStatus !== 'all'" variant="secondary" class="ml-1 h-5 px-1.5">
              {{ statusOptions.find(o => o.value === selectedStatus)?.label }}
            </UiBadge>
            <Icon name="heroicons:chevron-down" class="size-3.5 opacity-50" />
          </UiButton>
        </UiPopoverTrigger>
        <UiPopoverContent class="w-48 p-1" align="start">
          <div class="flex flex-col">
            <button
              v-for="option in statusOptions"
              :key="option.value"
              class="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
              :class="{ 'bg-accent': selectedStatus === option.value }"
              @click="selectedStatus = option.value"
            >
              <Icon v-if="selectedStatus === option.value" name="heroicons:check" class="size-4" />
              <span :class="{ 'ml-6': selectedStatus !== option.value }">{{ option.label }}</span>
            </button>
          </div>
        </UiPopoverContent>
      </UiPopover>
    </div>

    <!-- Error State -->
    <div v-if="error" class="mb-6 rounded-lg border border-destructive bg-destructive/10 p-4">
      <div class="flex items-start gap-3">
        <Icon name="heroicons:exclamation-triangle" class="size-5 mt-0.5 flex-shrink-0 text-destructive" />
        <div>
          <h3 class="text-sm font-medium text-destructive">Error loading claims</h3>
          <p class="mt-1 text-sm text-destructive/80">{{ error.message }}</p>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="pending" class="flex items-center justify-center py-12">
      <UiSpinner class="size-8" />
    </div>

    <!-- Empty State -->
    <UiCard v-else-if="claims.length === 0" class="p-12 text-center">
      <Icon name="heroicons:inbox" class="size-12 mx-auto text-muted-foreground" />
      <h3 class="mt-4 text-lg font-medium text-foreground">No claims found</h3>
      <p class="mt-2 text-sm text-muted-foreground">
        {{ selectedStatus === 'pending' ? 'No pending claims to review.' : 'No claims match your filters.' }}
      </p>
    </UiCard>

    <!-- Claims List -->
    <div v-else class="space-y-4">
      <UiCard v-for="claim in claims" :key="claim.id">
        <UiCardContent class="pt-6">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <!-- Claim Info -->
            <div class="flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-lg font-semibold text-foreground">
                  {{ claim.contractor?.company_name || 'Unknown Business' }}
                </h3>
                <!-- Status Badge -->
                <span :class="['inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', getStatusClasses(claim.status)]">
                  {{ getStatusLabel(claim.status) }}
                </span>
                <!-- Email Verified Indicator -->
                <UiBadge v-if="claim.email_verified_at" variant="outline" class="text-xs">
                  <Icon name="heroicons:envelope-open" class="size-3 mr-1" />
                  Email Verified
                </UiBadge>
                <!-- Activation Status for approved claims -->
                <UiBadge v-if="claim.status === 'approved' && !claim.account_activated_at" variant="secondary" class="text-xs">
                  <Icon name="heroicons:clock" class="size-3 mr-1" />
                  Awaiting Activation
                </UiBadge>
                <UiBadge v-else-if="claim.status === 'completed' || claim.account_activated_at" variant="default" class="text-xs">
                  <Icon name="heroicons:check-badge" class="size-3 mr-1" />
                  Account Active
                </UiBadge>
              </div>

              <div class="mt-3 space-y-1 text-sm text-muted-foreground">
                <p><span class="font-medium">Claimant:</span> {{ claim.claimant_name || 'Not provided' }}</p>
                <p><span class="font-medium">Email:</span> {{ claim.claimant_email }}</p>
                <p v-if="claim.claimant_phone"><span class="font-medium">Phone:</span> {{ claim.claimant_phone }}</p>
                <p><span class="font-medium">Submitted:</span> {{ formatDate(claim.created_at) }}</p>
                <p v-if="claim.contractor?.email">
                  <span class="font-medium">Business Email:</span> {{ claim.contractor.email }}
                  <UiBadge v-if="claim.claimant_email === claim.contractor.email" variant="default" class="ml-2">
                    <Icon name="heroicons:check-circle" class="size-3 mr-0.5" /> Match
                  </UiBadge>
                </p>
                <!-- Show verification/activation timeline -->
                <p v-if="claim.email_verified_at">
                  <span class="font-medium">Verified:</span> {{ formatDate(claim.email_verified_at) }}
                </p>
                <p v-if="claim.reviewed_at">
                  <span class="font-medium">Reviewed:</span> {{ formatDate(claim.reviewed_at) }}
                </p>
                <p v-if="claim.account_activated_at">
                  <span class="font-medium">Activated:</span> {{ formatDate(claim.account_activated_at) }}
                </p>
                <p v-if="claim.admin_notes" class="mt-2 rounded bg-muted p-2">
                  <span class="font-medium">Admin Notes:</span> {{ claim.admin_notes }}
                </p>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex gap-2 sm:flex-col">
              <!-- Pending claims: Approve/Reject -->
              <template v-if="claim.status === 'pending'">
                <UiButton size="sm" @click="handleApprove(claim)">
                  <Icon name="heroicons:check" class="size-4 mr-1" />
                  Approve
                </UiButton>
                <UiButton variant="outline" size="sm" @click="handleReject(claim)">
                  <Icon name="heroicons:x-mark" class="size-4 mr-1" />
                  Reject
                </UiButton>
              </template>
              <!-- Approved but not activated: Resend Activation -->
              <template v-else-if="canResendActivation(claim)">
                <UiButton
                  variant="outline"
                  size="sm"
                  :disabled="resendingActivation === claim.id"
                  @click="handleResendActivation(claim)"
                >
                  <UiSpinner v-if="resendingActivation === claim.id" class="size-4 mr-1" />
                  <Icon v-else name="heroicons:paper-airplane" class="size-4 mr-1" />
                  Resend Activation
                </UiButton>
              </template>
              <!-- Other statuses: Show info -->
              <template v-else>
                <div class="text-right text-sm text-muted-foreground">
                  <p v-if="claim.status === 'rejected'">Rejected</p>
                  <p v-else-if="claim.status === 'completed'">Account activated</p>
                  <p v-else-if="claim.status === 'unverified'">Awaiting email verification</p>
                </div>
              </template>
            </div>
          </div>
        </UiCardContent>
      </UiCard>
    </div>

    <!-- Pagination -->
    <div v-if="!pending && claims.length > 0" class="mt-6 flex justify-center">
      <UiPagination
        :page="pagination.page"
        :total="pagination.total"
        :items-per-page="pagination.limit"
        :sibling-count="1"
        show-edges
        @update:page="handlePageChange"
      />
    </div>

    <!-- Results Summary -->
    <div v-if="!pending && claims.length > 0" class="mt-4 text-center text-sm text-muted-foreground">
      Showing {{ ((pagination.page - 1) * pagination.limit) + 1 }} to
      {{ Math.min(pagination.page * pagination.limit, pagination.total) }} of
      {{ pagination.total }} claims
    </div>

    <!-- Approve Confirmation Dialog -->
    <UiAlertDialog :open="showApproveDialog" @update:open="showApproveDialog = $event">
      <UiAlertDialogContent>
        <UiAlertDialogHeader>
          <UiAlertDialogTitle>Approve Claim</UiAlertDialogTitle>
          <UiAlertDialogDescription>
            Approve this claim for {{ claimToProcess?.contractor?.company_name || 'this business' }}? The business will be marked as claimed.
          </UiAlertDialogDescription>
        </UiAlertDialogHeader>
        <UiAlertDialogFooter>
          <UiAlertDialogCancel @click="cancelDialog">Cancel</UiAlertDialogCancel>
          <UiAlertDialogAction @click="confirmApprove">Approve</UiAlertDialogAction>
        </UiAlertDialogFooter>
      </UiAlertDialogContent>
    </UiAlertDialog>

    <!-- Reject Confirmation Dialog -->
    <UiAlertDialog :open="showRejectDialog" @update:open="showRejectDialog = $event">
      <UiAlertDialogContent>
        <UiAlertDialogHeader>
          <UiAlertDialogTitle>Reject Claim</UiAlertDialogTitle>
          <UiAlertDialogDescription>
            Reject this claim for {{ claimToProcess?.contractor?.company_name || 'this business' }}?
          </UiAlertDialogDescription>
        </UiAlertDialogHeader>
        <div class="py-4">
          <label class="mb-2 block text-sm font-medium text-foreground">
            Rejection Notes (optional)
          </label>
          <UiTextarea
            v-model="rejectNotes"
            :rows="3"
            placeholder="Reason for rejection..."
          />
        </div>
        <UiAlertDialogFooter>
          <UiAlertDialogCancel @click="cancelDialog">Cancel</UiAlertDialogCancel>
          <UiAlertDialogAction variant="destructive" @click="confirmReject">Reject</UiAlertDialogAction>
        </UiAlertDialogFooter>
      </UiAlertDialogContent>
    </UiAlertDialog>
  </div>
</template>

