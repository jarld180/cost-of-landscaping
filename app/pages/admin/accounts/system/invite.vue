<script setup lang="ts">
import { toast } from 'vue-sonner'
import { z } from 'zod'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'

definePageMeta({
  layout: 'admin',
})

const { inviteUser } = useAdminSystemAccounts()

// Form schema
const formSchema = toTypedSchema(
  z.object({
    email: z.string().email('Please enter a valid email address'),
    displayName: z.string().min(1, 'Display name is required').max(100).optional(),
  })
)

const { handleSubmit, isSubmitting, resetForm, defineField, errors } = useForm({
  validationSchema: formSchema,
  initialValues: {
    email: '',
    displayName: '',
  },
})

const [email, emailAttrs] = defineField('email')
const [displayName, displayNameAttrs] = defineField('displayName')

// Handle form submission
const onSubmit = handleSubmit(async (values) => {
  const result = await inviteUser(values.email, values.displayName || undefined)

  if (result.success) {
    toast.success(result.message)
    navigateTo('/admin/accounts/system')
  } else {
    toast.error(result.message)
  }
})

const handleCancel = () => {
  navigateTo('/admin/accounts/system')
}
</script>

<template>
  <div>
    <!-- Back Button -->
    <div class="mb-6">
      <UiButton variant="ghost" size="sm" @click="navigateTo('/admin/accounts/system')">
        <Icon name="heroicons:arrow-left" class="mr-2 size-4" />
        Back to System Accounts
      </UiButton>
    </div>

    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold">Invite System User</h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Send an invitation email to a new CoC staff member
      </p>
    </div>

    <!-- Form Card -->
    <UiCard class="max-w-xl">
      <UiCardHeader>
        <UiCardTitle>User Details</UiCardTitle>
        <UiCardDescription>
          The invited user will receive an email with a link to set up their account.
        </UiCardDescription>
      </UiCardHeader>
      <UiCardContent>
        <form class="space-y-4" @submit="onSubmit">
          <!-- Email -->
          <div class="space-y-2">
            <UiLabel for="email">Email Address *</UiLabel>
            <UiInput
              id="email"
              v-model="email"
              v-bind="emailAttrs"
              type="email"
              placeholder="user@example.com"
              :class="{ 'border-destructive': errors.email }"
            />
            <p v-if="errors.email" class="text-sm text-destructive">
              {{ errors.email }}
            </p>
          </div>

          <!-- Display Name -->
          <div class="space-y-2">
            <UiLabel for="displayName">Display Name</UiLabel>
            <UiInput
              id="displayName"
              v-model="displayName"
              v-bind="displayNameAttrs"
              type="text"
              placeholder="John Doe"
              :class="{ 'border-destructive': errors.displayName }"
            />
            <p v-if="errors.displayName" class="text-sm text-destructive">
              {{ errors.displayName }}
            </p>
            <p class="text-sm text-muted-foreground">
              Optional. If not provided, the email prefix will be used.
            </p>
          </div>

          <!-- Actions -->
          <div class="flex gap-3 pt-4">
            <UiButton type="submit" :disabled="isSubmitting">
              <Icon v-if="isSubmitting" name="heroicons:arrow-path" class="mr-2 size-4 animate-spin" />
              <Icon v-else name="heroicons:paper-airplane" class="mr-2 size-4" />
              Send Invitation
            </UiButton>
            <UiButton type="button" variant="outline" @click="handleCancel">
              Cancel
            </UiButton>
          </div>
        </form>
      </UiCardContent>
    </UiCard>
  </div>
</template>

