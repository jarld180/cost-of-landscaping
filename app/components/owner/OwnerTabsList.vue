<script setup lang="ts">
import type { TabsListProps } from 'reka-ui'
import { TabsList, useForwardProps } from 'reka-ui'
import { cn } from '~/lib/utils'

const props = defineProps<TabsListProps & { class?: string }>()

const delegatedProps = computed(() => {
  const { class: _, ...rest } = props
  return rest
})

const forwarded = useForwardProps(delegatedProps)
</script>

<template>
  <TabsList
    v-bind="forwarded"
    :class="cn(
      'inline-flex h-10 items-center justify-start gap-1 rounded-lg bg-muted p-1 text-muted-foreground',
      props.class
    )"
  >
    <slot />
  </TabsList>
</template>

