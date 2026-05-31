<script setup lang="ts">
/**
 * TipTap Image Upload Dialog
 *
 * Modal dialog for uploading images to the TipTap editor.
 * Supports file selection, preview, and alt/title metadata.
 *
 * Issue: BAM-304 / BAM-307
 */

import { toast } from 'vue-sonner'

interface ImageUploadData {
  url: string
  storagePath: string
  filename: string
  size: number
  mimeType: string
  alt?: string
  title?: string
}

const props = defineProps<{
  /** Whether the dialog is open */
  open: boolean
  /** Pre-selected file (from drag-drop or paste) */
  preselectedFile?: File | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'uploaded': [data: ImageUploadData]
}>()

const { uploadImage, validateFile, getAcceptAttribute, state: uploadState, MAX_FILE_SIZE_LABEL } = useTipTapImageUpload()

// Form state
const selectedFile = ref<File | null>(null)
const previewUrl = ref<string | null>(null)
const altText = ref('')
const titleText = ref('')
const validationError = ref<string | null>(null)

// File input ref
const fileInputRef = ref<HTMLInputElement | null>(null)

// Watch for preselected file (from drag-drop or paste)
watch(() => props.preselectedFile, (file) => {
  if (file) {
    handleFileSelect(file)
  }
}, { immediate: true })

// Cleanup preview URL on unmount
onUnmounted(() => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
})

function handleFileSelect(file: File) {
  // Revoke old preview URL
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }

  // Validate file
  const validation = validateFile(file)
  if (!validation.valid) {
    validationError.value = validation.error || 'Invalid file'
    selectedFile.value = null
    previewUrl.value = null
    return
  }

  validationError.value = null
  selectedFile.value = file
  previewUrl.value = URL.createObjectURL(file)
}

function onFileInputChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    handleFileSelect(file)
  }
}

function openFilePicker() {
  fileInputRef.value?.click()
}

async function handleUpload() {
  if (!selectedFile.value) return

  const result = await uploadImage(selectedFile.value, {
    alt: altText.value || undefined,
    title: titleText.value || undefined,
  })

  if (result.success && result.data) {
    toast.success('Image uploaded')
    emit('uploaded', result.data)
    closeDialog()
  } else {
    toast.error('Upload failed', {
      description: result.error || 'Please try again',
    })
  }
}

function closeDialog() {
  // Reset form
  selectedFile.value = null
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = null
  }
  altText.value = ''
  titleText.value = ''
  validationError.value = null

  emit('update:open', false)
}
</script>

<template>
  <UiDialog :open="open" @update:open="closeDialog">
    <UiDialogContent class="sm:max-w-md">
      <UiDialogHeader>
        <UiDialogTitle>Upload Image</UiDialogTitle>
        <UiDialogDescription>
          Upload an image to insert into the editor.
        </UiDialogDescription>
      </UiDialogHeader>

      <div class="space-y-4 py-4">
        <!-- Hidden file input -->
        <input
          ref="fileInputRef"
          type="file"
          :accept="getAcceptAttribute()"
          class="hidden"
          @change="onFileInputChange"
        />

        <!-- File selection / Preview area -->
        <div
          v-if="!previewUrl"
          class="border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
          @click="openFilePicker"
        >
          <Icon name="heroicons:photo" class="h-12 w-12 mx-auto text-neutral-400 dark:text-neutral-500 mb-3" />
          <p class="text-neutral-600 dark:text-neutral-400 mb-1">
            Click to select an image
          </p>
          <p class="text-xs text-neutral-500 dark:text-neutral-500">
            JPEG, PNG, WebP, GIF (max {{ MAX_FILE_SIZE_LABEL }})
          </p>
        </div>

        <!-- Image preview -->
        <div v-else class="relative">
          <img
            :src="previewUrl"
            :alt="altText || 'Preview'"
            class="max-h-48 mx-auto rounded-lg object-contain"
          />
          <button
            type="button"
            class="absolute top-2 right-2 p-1 bg-neutral-900/70 hover:bg-neutral-900 rounded-full text-white"
            @click="openFilePicker"
            title="Change image"
          >
            <Icon name="heroicons:arrow-path" class="h-4 w-4" />
          </button>
        </div>

        <!-- Validation error -->
        <p v-if="validationError" class="text-sm text-red-600 dark:text-red-400">
          {{ validationError }}
        </p>

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
            Used for accessibility & SEO-friendly filename
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
        <UiButton
          :disabled="!selectedFile || uploadState.isUploading"
          @click="handleUpload"
        >
          <UiSpinner v-if="uploadState.isUploading" class="mr-2 h-4 w-4" />
          {{ uploadState.isUploading ? 'Uploading...' : 'Insert Image' }}
        </UiButton>
      </UiDialogFooter>
    </UiDialogContent>
  </UiDialog>
</template>

