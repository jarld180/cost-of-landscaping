<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from 'reka-ui'

const colorMode = useColorMode()

// Computed property for v-model binding
const isDark = computed({
  get: () => colorMode.value === 'dark',
  set: (value: boolean) => {
    colorMode.preference = value ? 'dark' : 'light'
  },
})
</script>

<template>
  <div class="flex items-center justify-between gap-3">
    <!-- Label -->
    <span class="text-sm font-medium text-neutral-700 dark:text-neutral-300">
      Dark Mode
    </span>

    <!-- Switch -->
    <SwitchRoot
      v-model="isDark"
      class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-800"
      :class="isDark ? 'bg-neutral-800 dark:bg-neutral-600' : 'bg-neutral-200 dark:bg-neutral-600'"
    >
      <SwitchThumb
        class="pointer-events-none relative inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
        :class="isDark ? 'translate-x-5' : 'translate-x-0'"
      >
        <!-- Icon inside thumb -->
        <Icon
          :name="isDark ? 'heroicons:moon-20-solid' : 'heroicons:sun-20-solid'"
          class="h-3 w-3 text-neutral-600"
        />
      </SwitchThumb>
    </SwitchRoot>
  </div>
</template>

