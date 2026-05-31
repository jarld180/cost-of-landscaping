<script setup lang="ts">
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from 'reka-ui'

/**
 * TableActionsMenu Component
 *
 * A reusable dropdown menu component for table row actions.
 * Uses Reka UI's DropdownMenu with a 3-dot icon trigger.
 *
 * Features:
 * - Clean icon-based actions (no emojis)
 * - Supports conditional actions (show/hide based on context)
 * - Danger variant for destructive actions (red text)
 * - Centered alignment in table cells
 * - Light/dark mode support
 * - Full keyboard navigation and accessibility
 */

interface Action {
  /**
   * The label text for the action
   */
  label: string

  /**
   * The icon name (heroicons format)
   * Example: 'heroicons:pencil', 'heroicons:trash'
   */
  icon: string

  /**
   * Function to call when the action is clicked
   */
  onClick: () => void

  /**
   * Visual variant of the action
   * 'danger' renders in red for destructive actions
   * @default 'default'
   */
  variant?: 'default' | 'danger'

  /**
   * Whether to show this action
   * Useful for conditional actions
   * @default true
   */
  show?: boolean
}

interface Props {
  /**
   * Array of actions to display in the dropdown menu
   */
  actions: Action[]
}

const props = defineProps<Props>()

// Filter actions to only show those with show !== false
const visibleActions = computed(() => {
  return props.actions.filter(action => action.show !== false)
})

// Handle action click
const handleActionClick = (action: Action) => {
  action.onClick()
}

// Get action item classes based on variant
const getActionClasses = (variant?: 'default' | 'danger') => {
  const baseClasses = 'flex items-center gap-3 px-3 py-2 text-sm cursor-pointer outline-none transition-colors'

  if (variant === 'danger') {
    return `${baseClasses} text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 focus:bg-red-50 dark:focus:bg-red-950/30`
  }

  return `${baseClasses} text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 focus:bg-neutral-100 dark:focus:bg-neutral-800`
}
</script>

<template>
  <div class="flex items-center justify-center">
    <DropdownMenuRoot>
      <!-- Trigger Button (3-dot icon) -->
      <DropdownMenuTrigger
        class="flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 dark:focus:ring-offset-neutral-900 transition-colors"
        aria-label="Actions"
      >
        <Icon
          name="heroicons:ellipsis-horizontal"
          class="h-6 w-6"
        />
      </DropdownMenuTrigger>

      <!-- Dropdown Content -->
      <DropdownMenuPortal>
        <DropdownMenuContent
          class="min-w-[180px] rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900 z-50 data-[side=top]:animate-slideUpAndFade data-[side=right]:animate-slideRightAndFade data-[side=bottom]:animate-slideDownAndFade data-[side=left]:animate-slideLeftAndFade"
          :side-offset="5"
          align="end"
        >
          <!-- Action Items -->
          <DropdownMenuItem
            v-for="(action, index) in visibleActions"
            :key="index"
            :class="getActionClasses(action.variant)"
            @select="handleActionClick(action)"
          >
            <Icon
              :name="action.icon"
              class="h-4 w-4 flex-shrink-0"
            />
            <span>{{ action.label }}</span>
          </DropdownMenuItem>

          <!-- Empty State (if no visible actions) -->
          <div
            v-if="visibleActions.length === 0"
            class="px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400"
          >
            No actions available
          </div>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenuRoot>
  </div>
</template>

