<script setup lang="ts">
import type { TabsRootProps, TabsRootEmits } from 'reka-ui'
import { TabsRoot, useForwardPropsEmits } from 'reka-ui'
import { cn } from '~/lib/utils'

const props = defineProps<TabsRootProps & { class?: string }>()
const emits = defineEmits<TabsRootEmits>()

const delegatedProps = computed(() => {
  const { class: _, ...rest } = props
  return rest
})

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <TabsRoot
    v-bind="forwarded"
    :class="cn('w-full', props.class)"
  >
    <slot />
  </TabsRoot>
</template>

