<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { ContractorAccount, AccountStatus } from '~/types/accounts'

definePageMeta({
  layout: 'admin',
})

const route = useRoute()
const accountId = route.params.id as string

const { getAccount, updateAccountStatus } = useAdminContractorAccounts()

// State
const account = ref<ContractorAccount | null>(null)
const loading = ref(true)
const showSuspendDialog = ref(false)

// Fetch account on mount
onMounted(async () => {
  loading.value = true
  account.value = await getAccount(accountId)
  loading.value = false

  if (!account.value) {
    toast.error('Account not found')
    navigateTo('/admin/accounts/contractors')
  }
})

// Actions
const handleSuspendToggle = () => {
  showSuspendDialog.value = true
}

const confirmSuspend = async () => {
  if (!account.value) return
  const newStatus = account.value.status === 'active' ? 'suspended' : 'active'
  const result = await updateAccountStatus(accountId, newStatus)

  if (result.success) {
    toast.success(result.message)
    account.value = await getAccount(accountId)
  } else {
    toast.error(result.message)
  }
  showSuspendDialog.value = false
}

// Format date
const formatDate = (date: string | null) => {
  if (!date) return 'Never'
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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
    <!-- Back Button -->
    <div class="mb-6">
      <UiButton variant="ghost" size="sm" @click="navigateTo('/admin/accounts/contractors')">
        <Icon name="heroicons:arrow-left" class="mr-2 size-4" />
        Back to Contractor Accounts
      </UiButton>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <Icon name="heroicons:arrow-path" class="size-8 animate-spin text-muted-foreground" />
    </div>

    <!-- Account Details -->
    <div v-else-if="account" class="space-y-6">
      <!-- Header -->
      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-2xl font-bold">{{ account.displayName || account.email }}</h1>
          <p class="mt-1 text-muted-foreground">{{ account.email }}</p>
        </div>
        <UiBadge :variant="getStatusVariant(account.status)" class="text-sm">
          {{ account.status }}
        </UiBadge>
      </div>

      <!-- Info Card -->
      <UiCard>
        <UiCardHeader>
          <UiCardTitle>Account Information</UiCardTitle>
        </UiCardHeader>
        <UiCardContent class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <p class="text-sm font-medium text-muted-foreground">Email</p>
              <p class="mt-1">{{ account.email }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-muted-foreground">Account Type</p>
              <p class="mt-1">Contractor Account (Business)</p>
            </div>
            <div>
              <p class="text-sm font-medium text-muted-foreground">Status</p>
              <p class="mt-1">
                <UiBadge :variant="getStatusVariant(account.status)">{{ account.status }}</UiBadge>
              </p>
            </div>
            <div>
              <p class="text-sm font-medium text-muted-foreground">Claimed Profiles</p>
              <p class="mt-1">{{ account.claimedProfileCount }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-muted-foreground">Last Sign In</p>
              <p class="mt-1">{{ formatDate(account.lastSignInAt || null) }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-muted-foreground">Created</p>
              <p class="mt-1">{{ formatDate(account.created_at) }}</p>
            </div>
          </div>
        </UiCardContent>
      </UiCard>

      <!-- Claimed Profiles Card -->
      <UiCard v-if="account.claimedProfiles.length > 0">
        <UiCardHeader>
          <UiCardTitle>Claimed Contractor Profiles</UiCardTitle>
          <UiCardDescription>
            Contractor profiles managed by this account
          </UiCardDescription>
        </UiCardHeader>
        <UiCardContent>
          <div class="space-y-2">
            <NuxtLink
              v-for="profile in account.claimedProfiles"
              :key="profile.id"
              :to="`/admin/contractors/${profile.id}`"
              class="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent"
            >
              <span class="font-medium">{{ profile.company_name }}</span>
              <Icon name="heroicons:arrow-right" class="size-4 text-muted-foreground" />
            </NuxtLink>
          </div>
        </UiCardContent>
      </UiCard>

      <!-- Actions Card -->
      <UiCard>
        <UiCardHeader>
          <UiCardTitle>Actions</UiCardTitle>
        </UiCardHeader>
        <UiCardContent class="flex flex-wrap gap-3">
          <UiButton
            :variant="account.status === 'suspended' ? 'default' : 'secondary'"
            @click="handleSuspendToggle"
          >
            <Icon :name="account.status === 'suspended' ? 'heroicons:play' : 'heroicons:pause'" class="mr-2 size-4" />
            {{ account.status === 'suspended' ? 'Reactivate Account' : 'Suspend Account' }}
          </UiButton>
        </UiCardContent>
      </UiCard>
    </div>

    <!-- Suspend/Reactivate Dialog -->
    <UiAlertDialog :open="showSuspendDialog" @update:open="showSuspendDialog = $event">
      <UiAlertDialogContent>
        <UiAlertDialogHeader>
          <UiAlertDialogTitle>
            {{ account?.status === 'active' ? 'Suspend Account' : 'Reactivate Account' }}
          </UiAlertDialogTitle>
          <UiAlertDialogDescription>
            {{ account?.status === 'active'
              ? `Are you sure you want to suspend ${account?.email}? They will not be able to access their contractor profiles.`
              : `Are you sure you want to reactivate ${account?.email}? They will regain access to their contractor profiles.`
            }}
          </UiAlertDialogDescription>
        </UiAlertDialogHeader>
        <UiAlertDialogFooter>
          <UiAlertDialogCancel>Cancel</UiAlertDialogCancel>
          <UiAlertDialogAction @click="confirmSuspend">
            {{ account?.status === 'active' ? 'Suspend' : 'Reactivate' }}
          </UiAlertDialogAction>
        </UiAlertDialogFooter>
      </UiAlertDialogContent>
    </UiAlertDialog>
  </div>
</template>

