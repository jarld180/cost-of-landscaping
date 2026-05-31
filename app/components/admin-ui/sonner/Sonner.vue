<script lang="ts" setup>
import type { ToasterProps } from 'vue-sonner'
import { Toaster as Sonner } from 'vue-sonner'
import 'vue-sonner/style.css'

const props = withDefaults(defineProps<ToasterProps>(), {
  position: 'top-right',
  richColors: true,
})
</script>

<template>
  <Sonner
    class="toaster group"
    :position="props.position"
    :rich-colors="props.richColors"
    v-bind="props"
    :toast-options="{
      style: {
        '--normal-bg': 'hsl(var(--popover))',
        '--normal-text': 'hsl(var(--popover-foreground))',
        '--normal-border': 'hsl(var(--border))',
      },
    }"
  />
</template>
