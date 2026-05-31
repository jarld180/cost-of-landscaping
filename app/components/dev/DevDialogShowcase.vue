<script setup lang="ts">
// Dialog Component Showcase
</script>

<template>
  <ComponentSection
    title="Dialog Component"
    component-name="Dialog"
    description="Modal dialog with customizable content, sizes, and behavior"
  >
    <div class="space-y-8">
      <!-- Basic Dialog -->
      <div>
        <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
          Basic Dialog
        </h3>
        <div class="flex flex-wrap gap-4">
          <Dialog
            trigger-text="Open Dialog"
            title="Welcome"
            description="This is a basic dialog with title and description."
          >
            <div class="space-y-3">
              <p class="text-sm text-neutral-600 dark:text-neutral-400">
                This is the main content area of the dialog. You can put any content here including forms, images, or other components.
              </p>
              <p class="text-sm text-neutral-600 dark:text-neutral-400">
                The dialog will close when you click the X button, press Escape, or click outside the dialog.
              </p>
            </div>
          </Dialog>
        </div>
      </div>

      <!-- Different Sizes -->
      <div>
        <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
          Different Sizes
        </h3>
        <div class="flex flex-wrap gap-4">
          <Dialog
            trigger-text="Small"
            size="sm"
            title="Small Dialog"
            description="This is a small dialog (max-w-sm)"
          >
            <p class="text-sm text-neutral-600 dark:text-neutral-400">
              Small dialog content
            </p>
          </Dialog>

          <Dialog
            trigger-text="Medium (Default)"
            size="md"
            title="Medium Dialog"
            description="This is a medium dialog (max-w-md)"
          >
            <p class="text-sm text-neutral-600 dark:text-neutral-400">
              Medium dialog content
            </p>
          </Dialog>

          <Dialog
            trigger-text="Large"
            size="lg"
            title="Large Dialog"
            description="This is a large dialog (max-w-lg)"
          >
            <p class="text-sm text-neutral-600 dark:text-neutral-400">
              Large dialog content
            </p>
          </Dialog>

          <Dialog
            trigger-text="Extra Large"
            size="xl"
            title="Extra Large Dialog"
            description="This is an extra large dialog (max-w-xl)"
          >
            <p class="text-sm text-neutral-600 dark:text-neutral-400">
              Extra large dialog content
            </p>
          </Dialog>

          <Dialog
            trigger-text="Full Width"
            size="full"
            title="Full Width Dialog"
            description="This dialog takes up the full width with margins"
          >
            <p class="text-sm text-neutral-600 dark:text-neutral-400">
              Full width dialog content
            </p>
          </Dialog>
        </div>
      </div>

      <!-- Custom Trigger -->
      <div>
        <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
          Custom Trigger
        </h3>
        <div class="flex flex-wrap gap-4">
          <Dialog
            title="Settings"
            description="Manage your account settings and preferences."
          >
            <template #trigger>
              <Button text="Open Settings" variant="secondary" />
            </template>
            <div class="space-y-4">
              <div>
                <label class="mb-1 block text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  class="w-full rounded-lg border-2 border-neutral-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
                >
              </div>
              <div>
                <label class="mb-1 block text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  Username
                </label>
                <input
                  type="text"
                  placeholder="username"
                  class="w-full rounded-lg border-2 border-neutral-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
                >
              </div>
            </div>
          </Dialog>
        </div>
      </div>

      <!-- With Footer Actions -->
      <div>
        <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
          With Footer Actions
        </h3>
        <div class="flex flex-wrap gap-4">
          <Dialog
            trigger-text="Confirm Action"
            title="Delete Account"
            description="Are you sure you want to delete your account? This action cannot be undone."
          >
            <template #default>
              <div class="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                <p class="text-sm font-semibold text-red-700 dark:text-red-400">
                  Warning: This is a destructive action!
                </p>
                <p class="mt-2 text-sm text-red-600 dark:text-red-300">
                  All your data will be permanently deleted and cannot be recovered.
                </p>
              </div>
            </template>
            <template #footer>
              <Button text="Cancel" variant="secondary-outline" size="sm" />
              <Button text="Delete Account" variant="primary" size="sm" />
            </template>
          </Dialog>
        </div>
      </div>

      <!-- Custom Slots -->
      <div>
        <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
          Custom Title & Description Slots
        </h3>
        <div class="flex flex-wrap gap-4">
          <Dialog trigger-text="Custom Slots">
            <template #title>
              <div class="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="text-blue-500"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span>Important Information</span>
              </div>
            </template>
            <template #description>
              <div class="flex items-start gap-2">
                <span class="text-sm italic">
                  This dialog uses custom slots for title and description with icons and styling.
                </span>
              </div>
            </template>
            <p class="text-sm text-neutral-600 dark:text-neutral-400">
              You can customize the title and description using slots to add icons, badges, or any other content.
            </p>
          </Dialog>
        </div>
      </div>

      <!-- Without Overlay Click to Close -->
      <div>
        <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
          Prevent Close on Overlay Click
        </h3>
        <div class="flex flex-wrap gap-4">
          <Dialog
            trigger-text="Modal Dialog"
            title="Important Form"
            description="This dialog won't close when clicking outside."
            :close-on-overlay-click="false"
          >
            <p class="text-sm text-neutral-600 dark:text-neutral-400">
              You must use the close button or press Escape to close this dialog.
              Clicking outside won't work.
            </p>
          </Dialog>
        </div>
      </div>

      <!-- Without Close Button -->
      <div>
        <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
          Without Close Button
        </h3>
        <div class="flex flex-wrap gap-4">
          <Dialog
            trigger-text="No Close Button"
            title="Custom Close"
            description="This dialog has no X button."
            :show-close-button="false"
          >
            <template #default>
              <p class="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
                You can provide your own close mechanism in the content or footer.
              </p>
            </template>
            <template #footer>
              <Button text="Close Dialog" variant="primary" size="sm" />
            </template>
          </Dialog>
        </div>
      </div>
    </div>
  </ComponentSection>
</template>

<style scoped>
</style>

