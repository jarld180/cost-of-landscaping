<script setup lang="ts">
import { toast } from 'vue-sonner'

definePageMeta({ layout: 'admin' })
useHead({ title: 'COI Verifications - Admin' })

type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'all'

interface Verification {
  id: string
  status: string
  type: string
  additional_insured_name: string | null
  coverage_amount: number | null
  policy_expires_at: string | null
  document_url: string | null
  submitted_at: string
  reviewed_at: string | null
  rejection_reason: string | null
  contractors: {
    id: string
    company_name: string
    slug: string
    cities: { name: string; state_code: string } | null
  } | null
}

const selectedStatus = ref<VerificationStatus>('pending')
const verifications = ref<Verification[]>([])
const total = ref(0)
const loading = ref(false)

const statusOptions = [
  { value: 'pending', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired', label: 'Expired' },
  { value: 'all', label: 'All' },
]

async function fetchVerifications() {
  loading.value = true
  try {
    const res = await $fetch<{ success: boolean; data: Verification[]; total: number }>(
      `/api/admin/verifications?status=${selectedStatus.value}`
    )
    verifications.value = res.data
    total.value = res.total
  } catch {
    toast.error('Failed to load verifications')
  } finally {
    loading.value = false
  }
}

onMounted(fetchVerifications)
watch(selectedStatus, fetchVerifications)

// Reject dialog state
const rejectDialog = ref(false)
const rejectingId = ref<string | null>(null)
const rejectReason = ref('')

function openRejectDialog(id: string) {
  rejectingId.value = id
  rejectReason.value = ''
  rejectDialog.value = true
}

const actionLoading = ref<string | null>(null)

async function approve(id: string) {
  actionLoading.value = id
  try {
    await $fetch(`/api/admin/verifications/${id}/approve`, { method: 'POST' })
    toast.success('Approved — contractor is now Fully Verified')
    await fetchVerifications()
  } catch (e: any) {
    toast.error(e?.data?.message || 'Failed to approve')
  } finally {
    actionLoading.value = null
  }
}

async function confirmReject() {
  if (!rejectingId.value || !rejectReason.value.trim()) return
  actionLoading.value = rejectingId.value
  try {
    await $fetch(`/api/admin/verifications/${rejectingId.value}/reject`, {
      method: 'POST',
      body: { reason: rejectReason.value.trim() },
    })
    toast.success('Verification rejected')
    rejectDialog.value = false
    await fetchVerifications()
  } catch (e: any) {
    toast.error(e?.data?.message || 'Failed to reject')
  } finally {
    actionLoading.value = null
    rejectingId.value = null
  }
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function statusBadgeClass(status: string) {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-800'
    case 'approved': return 'bg-emerald-100 text-emerald-800'
    case 'rejected': return 'bg-red-100 text-red-800'
    case 'expired': return 'bg-neutral-100 text-neutral-600'
    default: return 'bg-neutral-100 text-neutral-600'
  }
}
</script>

<template>
  <div class="space-y-6 p-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-neutral-900 dark:text-neutral-50">COI Verifications</h1>
        <p class="mt-1 text-sm text-neutral-500">Review insurance certificates naming Cost of Concrete as Additional Insured.</p>
      </div>
      <span class="rounded-full bg-neutral-100 px-3 py-1 text-sm font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
        {{ total }} total
      </span>
    </div>

    <!-- Status filter -->
    <div class="flex gap-2">
      <button
        v-for="opt in statusOptions"
        :key="opt.value"
        :class="[
          'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
          selectedStatus === opt.value
            ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400'
        ]"
        @click="selectedStatus = opt.value as VerificationStatus"
      >
        {{ opt.label }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="py-12 text-center text-neutral-500">Loading...</div>

    <!-- Empty state -->
    <div v-else-if="verifications.length === 0" class="rounded-xl border border-dashed border-neutral-300 py-16 text-center dark:border-neutral-700">
      <p class="text-neutral-500">No {{ selectedStatus === 'all' ? '' : selectedStatus }} verifications</p>
    </div>

    <!-- Table -->
    <div v-else class="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700">
      <table class="w-full text-sm">
        <thead class="bg-neutral-50 dark:bg-neutral-800">
          <tr>
            <th class="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">Contractor</th>
            <th class="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">Additional Insured Name</th>
            <th class="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">Policy Expires</th>
            <th class="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">Submitted</th>
            <th class="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">Status</th>
            <th class="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">Document</th>
            <th class="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
          <tr v-for="v in verifications" :key="v.id" class="bg-white dark:bg-neutral-900">
            <td class="px-4 py-3">
              <div class="font-medium text-neutral-900 dark:text-neutral-100">
                {{ v.contractors?.company_name || '—' }}
              </div>
              <div v-if="v.contractors?.cities" class="text-xs text-neutral-500">
                {{ v.contractors.cities.name }}, {{ v.contractors.cities.state_code }}
              </div>
            </td>
            <td class="px-4 py-3">
              <span
                :class="[
                  'font-medium',
                  v.additional_insured_name?.toLowerCase().includes('cost of concrete')
                    ? 'text-emerald-600'
                    : 'text-red-600'
                ]"
              >
                {{ v.additional_insured_name || '—' }}
              </span>
            </td>
            <td class="px-4 py-3 text-neutral-600 dark:text-neutral-400">{{ formatDate(v.policy_expires_at) }}</td>
            <td class="px-4 py-3 text-neutral-600 dark:text-neutral-400">{{ formatDate(v.submitted_at) }}</td>
            <td class="px-4 py-3">
              <span :class="['rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize', statusBadgeClass(v.status)]">
                {{ v.status }}
              </span>
            </td>
            <td class="px-4 py-3">
              <a
                v-if="v.document_url"
                :href="v.document_url"
                target="_blank"
                class="text-blue-600 underline hover:text-blue-800 dark:text-blue-400"
              >
                View COI
              </a>
              <span v-else class="text-neutral-400">No file</span>
            </td>
            <td class="px-4 py-3">
              <div v-if="v.status === 'pending'" class="flex gap-2">
                <button
                  :disabled="actionLoading === v.id"
                  class="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  @click="approve(v.id)"
                >
                  Approve
                </button>
                <button
                  :disabled="actionLoading === v.id"
                  class="rounded-lg bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-200 disabled:opacity-50"
                  @click="openRejectDialog(v.id)"
                >
                  Reject
                </button>
              </div>
              <div v-else-if="v.rejection_reason" class="text-xs text-neutral-500 italic">
                "{{ v.rejection_reason }}"
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Reject dialog -->
    <div v-if="rejectDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-neutral-900">
        <h2 class="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">Reject Verification</h2>
        <label class="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Reason for rejection</label>
        <textarea
          v-model="rejectReason"
          rows="3"
          placeholder="e.g. Additional insured name doesn't match 'Cost of Concrete', policy is expired..."
          class="w-full rounded-lg border px-4 py-2 text-sm focus:border-red-400 focus:ring-2 focus:ring-red-400 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
        />
        <div class="mt-4 flex justify-end gap-3">
          <button
            class="rounded-lg px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400"
            @click="rejectDialog = false"
          >
            Cancel
          </button>
          <button
            :disabled="!rejectReason.trim() || !!actionLoading"
            class="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            @click="confirmReject"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
