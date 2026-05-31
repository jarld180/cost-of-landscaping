<script setup lang="ts">
defineProps<{
  isConnected: boolean
}>()
</script>

<template>
  <div class="flex items-center gap-2 text-sm">
    <span 
      class="relative flex h-2 w-2"
    >
      <span 
        v-if="isConnected"
        class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"
      />
      <span 
        class="relative inline-flex rounded-full h-2 w-2"
        :class="isConnected ? 'bg-green-500' : 'bg-red-500'"
      />
    </span>
    <span :class="isConnected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
      {{ isConnected ? 'Connected' : 'Disconnected' }}
    </span>
  </div>
</template>
