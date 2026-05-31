<script setup lang="ts">
/**
 * TipTap WYSIWYG Editor
 *
 * Rich text editor with image upload support.
 *
 * Issue: BAM-304 / BAM-307
 *
 * FUTURE ENHANCEMENTS:
 * - Link editing dialog
 * - Table support
 * - Media library browser
 */

import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import ImageResize from 'tiptap-extension-resize-image'
import { watch } from 'vue'

interface Props {
  /**
   * The content of the editor (HTML or Markdown)
   */
  modelValue: string

  /**
   * Placeholder text when editor is empty
   * @default 'Start writing...'
   */
  placeholder?: string

  /**
   * Whether the editor is disabled
   * @default false
   */
  disabled?: boolean

  /**
   * Whether to show the toolbar
   * @default true
   */
  showToolbar?: boolean

  /**
   * Whether the toolbar should be sticky at the top of the viewport
   * @default false
   */
  stickyToolbar?: boolean

  /**
   * Top offset for sticky toolbar (e.g., to account for fixed headers)
   * Can be a number (px) or CSS value (e.g., '72px', '4.5rem')
   * @default '0'
   */
  stickyOffset?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Start writing...',
  disabled: false,
  showToolbar: true,
  stickyToolbar: false,
  stickyOffset: '0'
})

const stickyTopStyle = computed(() => {
  if (!props.stickyToolbar) return {}
  const offset = typeof props.stickyOffset === 'number' ? `${props.stickyOffset}px` : props.stickyOffset
  return { top: offset }
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

// =====================================================
// IMAGE UPLOAD
// =====================================================

const { getImageFromDataTransfer } = useTipTapImageUpload()

// Image dialog state
const showImageDialog = ref(false)
const preselectedFile = ref<File | null>(null)

// Edit image dialog state
const showEditImageDialog = ref(false)
const editingImageData = ref<{ src: string; alt: string; title: string } | null>(null)

// =====================================================
// EDITOR SETUP
// =====================================================

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3, 4, 5, 6]
      }
    }),
    // ImageResize provides drag handles for resizing + alignment support
    ImageResize.extend({
      addAttributes() {
        return {
          ...this.parent?.(),
          'data-align': {
            default: 'center',
            parseHTML: element => element.getAttribute('data-align') || 'center',
            renderHTML: attributes => {
              if (!attributes['data-align']) return {}
              return { 'data-align': attributes['data-align'] }
            },
          },
        }
      },
    }).configure({
      inline: false,
      allowBase64: false,
      HTMLAttributes: {
        class: 'tiptap-image',
      },
    }),
  ],
  editable: !props.disabled,
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML())
  },
  editorProps: {
    handleDrop: (_view, event, _slice, moved) => {
      if (moved || !event.dataTransfer) return false

      const file = getImageFromDataTransfer(event.dataTransfer)
      if (!file) return false

      // Prevent default drop behavior
      event.preventDefault()

      // Open dialog with preselected file
      preselectedFile.value = file
      showImageDialog.value = true
      return true
    },
    handlePaste: (_view, event) => {
      if (!event.clipboardData) return false

      const file = getImageFromDataTransfer(event.clipboardData)
      if (!file) return false

      // Prevent default paste behavior
      event.preventDefault()

      // Open dialog with preselected file
      preselectedFile.value = file
      showImageDialog.value = true
      return true
    },
  },
})

// =====================================================
// WATCH FOR EXTERNAL CHANGES
// =====================================================

watch(() => props.modelValue, (newValue) => {
  if (!editor.value) return

  const isSame = editor.value.getHTML() === newValue
  if (isSame) return

  editor.value.commands.setContent(newValue, { emitUpdate: false })
})

watch(() => props.disabled, (newDisabled) => {
  if (!editor.value) return
  editor.value.setEditable(!newDisabled)
})

// =====================================================
// TOOLBAR ACTIONS
// =====================================================

function toggleBold() {
  editor.value?.chain().focus().toggleBold().run()
}

function toggleItalic() {
  editor.value?.chain().focus().toggleItalic().run()
}

function toggleStrike() {
  editor.value?.chain().focus().toggleStrike().run()
}

function toggleCode() {
  editor.value?.chain().focus().toggleCode().run()
}

function toggleHeading(level: 1 | 2 | 3 | 4 | 5 | 6) {
  editor.value?.chain().focus().toggleHeading({ level }).run()
}

function setParagraph() {
  editor.value?.chain().focus().setParagraph().run()
}

function toggleBulletList() {
  editor.value?.chain().focus().toggleBulletList().run()
}

function toggleOrderedList() {
  editor.value?.chain().focus().toggleOrderedList().run()
}

function toggleCodeBlock() {
  editor.value?.chain().focus().toggleCodeBlock().run()
}

function toggleBlockquote() {
  editor.value?.chain().focus().toggleBlockquote().run()
}

function setHorizontalRule() {
  editor.value?.chain().focus().setHorizontalRule().run()
}

function undo() {
  editor.value?.chain().focus().undo().run()
}

function redo() {
  editor.value?.chain().focus().redo().run()
}

// =====================================================
// IMAGE FUNCTIONS
// =====================================================

function openImageDialog() {
  preselectedFile.value = null
  showImageDialog.value = true
}

function onImageUploaded(data: { url: string; alt?: string; title?: string }) {
  if (!editor.value) return

  editor.value.chain().focus().setImage({
    src: data.url,
    alt: data.alt || '',
    title: data.title || '',
  }).run()
}

function setImageAlignment(alignment: 'left' | 'center' | 'right') {
  if (!editor.value) return

  // Get current selection and check if it's an image
  const { state } = editor.value
  const { selection } = state
  const node = state.doc.nodeAt(selection.from)

  if (node?.type.name === 'imageResize') {
    // Update the image's data-align attribute
    editor.value.chain().focus().updateAttributes('imageResize', {
      'data-align': alignment,
    }).run()
  }
}

function getCurrentImageNode() {
  if (!editor.value) return null

  const { state } = editor.value
  const { selection } = state
  const node = state.doc.nodeAt(selection.from)

  if (node?.type.name === 'imageResize') {
    return node
  }
  return null
}

function openEditImageDialog() {
  const node = getCurrentImageNode()
  if (!node) return

  editingImageData.value = {
    src: node.attrs.src || '',
    alt: node.attrs.alt || '',
    title: node.attrs.title || '',
  }
  showEditImageDialog.value = true
}

function onEditImageSave(data: { alt: string; title: string }) {
  if (!editor.value) return

  editor.value.chain().focus().updateAttributes('imageResize', {
    alt: data.alt,
    title: data.title,
  }).run()

  showEditImageDialog.value = false
  editingImageData.value = null
}

function deleteImage() {
  if (!editor.value) return
  editor.value.chain().focus().deleteSelection().run()
}
</script>

<template>
  <div v-if="editor" class="tiptap-editor border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800">
    <!-- Toolbar -->
    <div
      v-if="showToolbar"
      :class="[
        'toolbar flex flex-wrap items-center gap-1 p-2 border-b border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900 rounded-t-lg',
        stickyToolbar && 'sticky z-[15] shadow-sm'
      ]"
      :style="stickyTopStyle"
    >
      <!-- Undo/Redo -->
      <button
        type="button"
        @click="undo"
        :disabled="!editor.can().undo()"
        class="toolbar-btn"
        title="Undo"
      >
        <Icon name="heroicons:arrow-uturn-left" class="h-4 w-4" />
      </button>
      <button
        type="button"
        @click="redo"
        :disabled="!editor.can().redo()"
        class="toolbar-btn"
        title="Redo"
      >
        <Icon name="heroicons:arrow-uturn-right" class="h-4 w-4" />
      </button>

      <div class="w-px h-6 bg-neutral-300 dark:bg-neutral-600 mx-1" />

      <!-- Text Formatting -->
      <button
        type="button"
        @click="toggleBold"
        :class="{ 'is-active': editor.isActive('bold') }"
        class="toolbar-btn"
        title="Bold"
      >
        <Icon name="heroicons:bold" class="h-4 w-4" />
      </button>
      <button
        type="button"
        @click="toggleItalic"
        :class="{ 'is-active': editor.isActive('italic') }"
        class="toolbar-btn"
        title="Italic"
      >
        <Icon name="heroicons:italic" class="h-4 w-4" />
      </button>
      <button
        type="button"
        @click="toggleStrike"
        :class="{ 'is-active': editor.isActive('strike') }"
        class="toolbar-btn"
        title="Strikethrough"
      >
        <Icon name="heroicons:strikethrough" class="h-4 w-4" />
      </button>
      <button
        type="button"
        @click="toggleCode"
        :class="{ 'is-active': editor.isActive('code') }"
        class="toolbar-btn"
        title="Inline Code"
      >
        <Icon name="heroicons:code-bracket" class="h-4 w-4" />
      </button>

      <div class="w-px h-6 bg-neutral-300 dark:bg-neutral-600 mx-1" />

      <!-- Headings -->
      <button
        type="button"
        @click="setParagraph"
        :class="{ 'is-active': editor.isActive('paragraph') }"
        class="toolbar-btn"
        title="Paragraph"
      >
        <span class="text-xs font-medium">P</span>
      </button>
      <button
        type="button"
        @click="toggleHeading(1)"
        :class="{ 'is-active': editor.isActive('heading', { level: 1 }) }"
        class="toolbar-btn"
        title="Heading 1"
      >
        <span class="text-xs font-bold">H1</span>
      </button>
      <button
        type="button"
        @click="toggleHeading(2)"
        :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }"
        class="toolbar-btn"
        title="Heading 2"
      >
        <span class="text-xs font-bold">H2</span>
      </button>
      <button
        type="button"
        @click="toggleHeading(3)"
        :class="{ 'is-active': editor.isActive('heading', { level: 3 }) }"
        class="toolbar-btn"
        title="Heading 3"
      >
        <span class="text-xs font-bold">H3</span>
      </button>

      <div class="w-px h-6 bg-neutral-300 dark:bg-neutral-600 mx-1" />

      <!-- Lists -->
      <button
        type="button"
        @click="toggleBulletList"
        :class="{ 'is-active': editor.isActive('bulletList') }"
        class="toolbar-btn"
        title="Bullet List"
      >
        <Icon name="heroicons:list-bullet" class="h-4 w-4" />
      </button>
      <button
        type="button"
        @click="toggleOrderedList"
        :class="{ 'is-active': editor.isActive('orderedList') }"
        class="toolbar-btn"
        title="Numbered List"
      >
        <Icon name="heroicons:numbered-list" class="h-4 w-4" />
      </button>

      <div class="w-px h-6 bg-neutral-300 dark:bg-neutral-600 mx-1" />

      <!-- Blocks -->
      <button
        type="button"
        @click="toggleCodeBlock"
        :class="{ 'is-active': editor.isActive('codeBlock') }"
        class="toolbar-btn"
        title="Code Block"
      >
        <Icon name="heroicons:code-bracket-square" class="h-4 w-4" />
      </button>
      <button
        type="button"
        @click="toggleBlockquote"
        :class="{ 'is-active': editor.isActive('blockquote') }"
        class="toolbar-btn"
        title="Blockquote"
      >
        <Icon name="heroicons:chat-bubble-left-right" class="h-4 w-4" />
      </button>
      <button
        type="button"
        @click="setHorizontalRule"
        class="toolbar-btn"
        title="Horizontal Rule"
      >
        <Icon name="heroicons:minus" class="h-4 w-4" />
      </button>

      <div class="w-px h-6 bg-neutral-300 dark:bg-neutral-600 mx-1" />

      <!-- Image -->
      <button
        type="button"
        @click="openImageDialog"
        class="toolbar-btn"
        title="Insert Image"
      >
        <Icon name="heroicons:photo" class="h-4 w-4" />
      </button>

      <!-- Image Controls (shown when image is selected) -->
      <template v-if="editor.isActive('imageResize')">
        <div class="w-px h-6 bg-neutral-300 dark:bg-neutral-600 mx-1" />
        <button
          type="button"
          @click="setImageAlignment('left')"
          class="toolbar-btn"
          title="Align Left"
        >
          <Icon name="heroicons:bars-3-bottom-left" class="h-4 w-4" />
        </button>
        <button
          type="button"
          @click="setImageAlignment('center')"
          class="toolbar-btn"
          title="Align Center"
        >
          <Icon name="heroicons:bars-3" class="h-4 w-4" />
        </button>
        <button
          type="button"
          @click="setImageAlignment('right')"
          class="toolbar-btn"
          title="Align Right"
        >
          <Icon name="heroicons:bars-3-bottom-right" class="h-4 w-4" />
        </button>

        <div class="w-px h-6 bg-neutral-300 dark:bg-neutral-600 mx-1" />

        <!-- Edit Image Properties -->
        <button
          type="button"
          @click="openEditImageDialog"
          class="toolbar-btn"
          title="Edit Image Properties"
        >
          <Icon name="heroicons:pencil-square" class="h-4 w-4" />
        </button>

        <!-- Delete Image -->
        <button
          type="button"
          @click="deleteImage"
          class="toolbar-btn text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30"
          title="Delete Image"
        >
          <Icon name="heroicons:trash" class="h-4 w-4" />
        </button>
      </template>
    </div>

    <!-- Editor Content -->
    <EditorContent :editor="editor" class="prose prose-sm dark:prose-invert max-w-none p-4 min-h-[300px] focus:outline-none" />

    <!-- Image Upload Dialog -->
    <TipTapImageDialog
      v-model:open="showImageDialog"
      :preselected-file="preselectedFile"
      @uploaded="onImageUploaded"
    />

    <!-- Edit Image Dialog -->
    <TipTapImageEditDialog
      v-model:open="showEditImageDialog"
      :image-data="editingImageData"
      @save="onEditImageSave"
    />
  </div>
</template>

<style scoped>
.toolbar-btn {
  @apply p-2 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors;
}

.toolbar-btn.is-active {
  @apply bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300;
}

/* TipTap Editor Styles */
:deep(.tiptap) {
  @apply focus:outline-none;
}

:deep(.tiptap p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  @apply text-neutral-400 dark:text-neutral-500 float-left h-0 pointer-events-none;
}

:deep(.tiptap h1) {
  @apply text-3xl font-bold mt-6 mb-4;
}

:deep(.tiptap h2) {
  @apply text-2xl font-bold mt-5 mb-3;
}

:deep(.tiptap h3) {
  @apply text-xl font-bold mt-4 mb-2;
}

:deep(.tiptap h4) {
  @apply text-lg font-semibold mt-3 mb-2;
}

:deep(.tiptap h5) {
  @apply text-base font-semibold mt-2 mb-1;
}

:deep(.tiptap h6) {
  @apply text-sm font-semibold mt-2 mb-1;
}

:deep(.tiptap ul) {
  @apply list-disc pl-6 my-4;
}

:deep(.tiptap ol) {
  @apply list-decimal pl-6 my-4;
}

:deep(.tiptap li) {
  @apply my-1;
}

:deep(.tiptap li p) {
  @apply inline;
}

:deep(.tiptap code) {
  @apply bg-neutral-100 dark:bg-neutral-700 text-red-600 dark:text-red-400 px-1 py-0.5 rounded text-sm;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

:deep(.tiptap pre) {
  @apply bg-neutral-900 dark:bg-neutral-950 text-neutral-100 p-4 rounded-lg my-4 overflow-x-auto;
}

:deep(.tiptap pre code) {
  @apply bg-transparent text-neutral-100 p-0;
}

:deep(.tiptap blockquote) {
  @apply border-l-4 border-neutral-300 dark:border-neutral-600 pl-4 italic my-4 text-neutral-600 dark:text-neutral-400;
}

:deep(.tiptap hr) {
  @apply border-t border-neutral-300 dark:border-neutral-600 my-6;
}

:deep(.tiptap a) {
  @apply text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300;
}

:deep(.tiptap strong) {
  @apply font-bold;
}

:deep(.tiptap em) {
  @apply italic;
}

:deep(.tiptap s) {
  @apply line-through;
}

/* Image Styles */
:deep(.tiptap img) {
  @apply max-w-full h-auto rounded-lg my-4;
}

:deep(.tiptap img.tiptap-image) {
  @apply cursor-pointer;
}

:deep(.tiptap img[data-align="left"]) {
  @apply float-left mr-4 mb-2;
}

:deep(.tiptap img[data-align="center"]) {
  @apply mx-auto block;
}

:deep(.tiptap img[data-align="right"]) {
  @apply float-right ml-4 mb-2;
}

/* Selected image styling */
:deep(.tiptap .ProseMirror-selectednode img) {
  @apply ring-2 ring-blue-500 ring-offset-2;
}

/* Image resize handles from tiptap-extension-resize-image */
:deep(.tiptap .image-resizer) {
  @apply relative inline-block;
}

:deep(.tiptap .image-resizer .resize-trigger) {
  @apply absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-sm shadow-md cursor-nwse-resize;
}

:deep(.tiptap .image-resizer .resize-trigger.top-left) {
  @apply top-0 left-0 -translate-x-1/2 -translate-y-1/2;
}

:deep(.tiptap .image-resizer .resize-trigger.top-right) {
  @apply top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize;
}

:deep(.tiptap .image-resizer .resize-trigger.bottom-left) {
  @apply bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize;
}

:deep(.tiptap .image-resizer .resize-trigger.bottom-right) {
  @apply bottom-0 right-0 translate-x-1/2 translate-y-1/2;
}
</style>
