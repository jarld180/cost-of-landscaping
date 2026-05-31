<script setup lang="ts">
/**
 * TipTap Image Edit Dialog
 *
 * Dialog for editing existing image properties (alt text, title).
 *
 * Issue: BAM-304
 */

const props = defineProps<{
  /** Whether the dialog is open */
  open: boolean
  /** Current image data */
  imageData: { src: string; alt: string; title: string } | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'save': [data: { alt: string; title: string }]
}>()

// Form state (local copies)
const altText = ref('')
const titleText = ref('')

// Sync form state when dialog opens with new data
watch(() => props.imageData, (data) => {
  if (data) {
    altText.value = data.alt || ''
    titleText.value = data.title || ''
  }
}, { immediate: true })

function handleSave() {
  emit('save', {
    alt: altText.value,
    title: titleText.value,
  })
}

function closeDialog() {
  emit('update:open', false)
}
</script>

<template>
  <UiDialog :open="open" @update:open="closeDialog">
    <UiDialogContent class="sm:max-w-md">
      <UiDialogHeader>
        <UiDialogTitle>Edit Image</UiDialogTitle>
        <UiDialogDescription>
          Update the image properties.
        </UiDialogDescription>
      </UiDialogHeader>

      <div class="space-y-4 py-4">
        <!-- Image preview -->
        <div v-if="imageData?.src" class="relative">
          <img
            :src="imageData.src"
            :alt="altText || 'Preview'"
            class="max-h-32 mx-auto rounded-lg object-contain"
          />
        </div>

        <!-- Alt text input -->
        <div>
          <UiLabel class="mb-1.5">
            Alt Text
            <span class="text-neutral-500 font-normal">(recommended)</span>
          </UiLabel>
          <UiInput
            v-model="altText"
            placeholder="Describe the image for accessibility"
          />
          <p class="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
            Used for accessibility and SEO
          </p>
        </div>

        <!-- Title input -->
        <div>
          <UiLabel class="mb-1.5">
            Title
            <span class="text-neutral-500 font-normal">(optional)</span>
          </UiLabel>
          <UiInput
            v-model="titleText"
            placeholder="Shows on hover"
          />
        </div>
      </div>

      <UiDialogFooter>
        <UiButton
          variant="outline"
          @click="closeDialog"
        >
          Cancel
        </UiButton>
        <UiButton @click="handleSave">
          Save Changes
        </UiButton>
      </UiDialogFooter>
    </UiDialogContent>
  </UiDialog>
</template>

