<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import AgentFlowNode from './AgentFlowNode.vue'
import { useAgentMetadata } from '~/composables/useAgentMetadata'

interface Props {
  job?: any
  steps?: any[]
  currentAgent?: string
}

const props = withDefaults(defineProps<Props>(), {
  steps: () => [],
  currentAgent: ''
})

const {
  fetchMetadata,
  agentMetadata,
  isLoading,
  AGENT_ORDER,
  AGENT_INFO,
  AGENT_COLORS
} = useAgentMetadata()

const NODE_SPACING_X = 290
const NODE_SPACING_Y = 200
const NODE_START_X = 50
const NODE_START_Y = 40
const NODE_MIDDLE_OFFSET = 16

const GRID_COLUMNS = computed(() => {
  const count = agentMetadata.value?.length || 0
  if (count <= 1) return 1
  return Math.min(4, Math.max(2, Math.ceil(Math.sqrt(count))))
})

// Calculate positions based on agent count (serpentine layout)
const NODE_POSITIONS = computed(() => {
  const metadata = agentMetadata.value || []
  const positions: Record<string, { x: number; y: number }> = {}
  const columns = GRID_COLUMNS.value

  metadata.forEach((agent, index) => {
    const row = Math.floor(index / columns)
    const col = index % columns
    const isRowReversed = row % 2 === 1
    const xIndex = isRowReversed ? (columns - 1 - col) : col
    const isMiddleColumn = col > 0 && col < columns - 1
    const waveOffset = isMiddleColumn
      ? (col % 2 === 0 ? -NODE_MIDDLE_OFFSET : NODE_MIDDLE_OFFSET)
      : 0
    const rightShiftAgents = new Set(['seo', 'image_generator'])
    const xShift = rightShiftAgents.has(agent.agentType) ? 18 : 0
    const x = NODE_START_X + (xIndex * NODE_SPACING_X) + xShift
    const rowTighten = row >= 1 ? -80 : 0
    const extraBottomTighten = row >= 2 ? -80 : 0
    const y = NODE_START_Y + (row * NODE_SPACING_Y) + waveOffset + rowTighten + extraBottomTighten
    positions[agent.agentType] = { x, y }
  })

  return positions
})

const nodes = computed(() => {
  const metadata = agentMetadata.value || []
  const positions = NODE_POSITIONS.value

  return metadata.map((agent) => {
    const agentSteps = props.steps.filter((s: any) => s.agentType === agent.agentType)

    // Determine status
    const currentIndex = AGENT_ORDER.value.indexOf(props.currentAgent)
    const agentIndex = AGENT_ORDER.value.indexOf(agent.agentType)

    const isBeforeCurrent = currentIndex !== -1 && agentIndex < currentIndex
    const isCurrent = agent.agentType === props.currentAgent

    // If job is completed, all are completed
    const isJobCompleted = props.job?.status === 'completed'
    const isCompleted = isJobCompleted || isBeforeCurrent

    const isActive = isCurrent && !isJobCompleted

    // Check if skipped (if optional and no steps, or explicit status)
    // For now, we'll assume if it's optional and we are past it and it has no steps, it was skipped
    const isSkipped = agent.isOptional && isBeforeCurrent && agentSteps.length === 0

    return {
      id: agent.agentType,
      type: 'agent',
      position: positions[agent.agentType] || { x: 0, y: 0 },
      data: {
        agentType: agent.agentType,
        agentInfo: AGENT_INFO.value[agent.agentType],
        steps: agentSteps,
        isActive,
        isCompleted,
        isSkipped
      }
    }
  })
})

const edges = computed(() => {
  const metadata = agentMetadata.value || []
  if (metadata.length === 0) return []

  const edgeList = []

  const columns = GRID_COLUMNS.value
  const getRow = (index: number) => Math.floor(index / columns)
  const isRowReversed = (row: number) => row % 2 === 1

  for (let i = 0; i < metadata.length - 1; i++) {
    const sourceRow = getRow(i)
    const targetRow = getRow(i + 1)
    const sameRow = sourceRow === targetRow
    const sourceDirectionReversed = isRowReversed(sourceRow)

    edgeList.push({
      id: `e-${metadata[i].agentType}-${metadata[i + 1].agentType}`,
      source: metadata[i].agentType,
      target: metadata[i + 1].agentType,
      sourceHandle: sameRow
        ? (sourceDirectionReversed ? 'handle-left-source' : 'handle-right-source')
        : 'handle-bottom-source',
      targetHandle: sameRow
        ? (sourceDirectionReversed ? 'handle-right-target' : 'handle-left-target')
        : 'handle-top-target',
    })
  }

  // Apply styling
  return edgeList.map(edge => {
    const isTargetActiveOrPast = AGENT_ORDER.value.indexOf(edge.target) <= AGENT_ORDER.value.indexOf(props.currentAgent)
    const isTargetCurrent = edge.target === props.currentAgent

      return {
        ...edge,
        type: 'default',
        style: {
        stroke: isTargetCurrent || isTargetActiveOrPast
          ? AGENT_COLORS.value[edge.target]
          : 'hsl(var(--muted-foreground))',
        strokeWidth: 2,
        transition: 'stroke 300ms ease-in-out',
      },
      class: isTargetCurrent ? 'edge-animated' : '',
      animated: isTargetCurrent
    }
  })
})

onMounted(async () => {
  await fetchMetadata()
})
</script>

<template>
  <div class="agent-flow-graph relative border rounded-xl bg-background overflow-hidden h-[436px] w-full shadow-sm">
    <div v-if="isLoading" class="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div class="flex flex-col items-center gap-2">
        <div class="i-lucide-loader-2 animate-spin text-primary text-2xl" />
        <span class="text-sm text-muted-foreground">Loading pipeline...</span>
      </div>
    </div>

    <VueFlow
      :nodes="nodes"
      :edges="edges"
      :nodes-draggable="true"
      :nodes-connectable="false"
      :edges-updatable="false"
      :elements-selectable="false"
      :connect-on-click="false"
      :auto-pan-on-node-drag="false"
      :pan-on-scroll="false"
      :pan-on-drag="false"
      :zoom-on-scroll="true"
      :zoom-on-pinch="true"
      :default-zoom="0.88"
      fit-view-on-init
      class="h-full w-full"
    >
      <template #node-agent="nodeProps">
        <AgentFlowNode
          :agent-type="nodeProps.data.agentType"
          :agent-info="nodeProps.data.agentInfo"
          :steps="nodeProps.data.steps"
          :is-active="nodeProps.data.isActive"
          :is-completed="nodeProps.data.isCompleted"
          :is-skipped="nodeProps.data.isSkipped"
        />
      </template>
    </VueFlow>
  </div>
</template>

<style>
/* Global styles for VueFlow edges that need to be unscoped or deep */
.agent-flow-graph .vue-flow__viewport {
  background-color: hsl(var(--muted) / 0.35);
  background-image: radial-gradient(hsl(var(--muted-foreground) / 0.18) 1px, transparent 0);
  background-size: 16px 16px;
  background-position: 0 0;
}

.agent-flow-graph .vue-flow__pane {
  background-color: transparent;
}

.agent-flow-graph .vue-flow__edges {
  z-index: 2;
}

.agent-flow-graph .vue-flow__nodes {
  z-index: 3;
}

.agent-flow-graph .vue-flow__edge-path {
  stroke-width: 2px;
}

.agent-flow-graph .edge-animated .vue-flow__edge-path {
  stroke-dasharray: 5;
  animation: dashdraw 1s linear infinite;
}

@keyframes dashdraw {
  from {
    stroke-dashoffset: 10;
  }
  to {
    stroke-dashoffset: 0;
  }
}
</style>
