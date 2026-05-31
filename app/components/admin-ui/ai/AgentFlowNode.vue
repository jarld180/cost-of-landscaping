<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'

interface Props {
  agentType: string
  agentInfo: { label: string; icon: string; color: string; description?: string }
  steps: Array<{
    id: string
    status: string
    tokensUsed: number
    durationMs?: number
    errorMessage?: string
  }>
  isActive: boolean
  isCompleted: boolean
  isSkipped: boolean
}

const props = defineProps<Props>()

// Computed aggregates
const totalTokens = computed(() => 
  props.steps.reduce((sum, s) => sum + (s.tokensUsed || 0), 0)
)

const modelName = computed(() =>
  props.steps.find(s => s.model)?.model || null
)

const hasError = computed(() => 
  props.steps.some(s => s.status === 'failed')
)

const isRunning = computed(() => 
  props.steps.some(s => s.status === 'running')
)

const agentDescription = computed(() =>
  props.agentInfo.description || getDefaultDescription(props.agentType)
)

const errorMessage = computed(() => 
  props.steps.find(s => s.errorMessage)?.errorMessage || null
)

// Format token count with K suffix for large numbers
function formatTokens(tokens: number): string {
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}k`
  }
  return tokens.toLocaleString()
}

function getDefaultDescription(agentType: string): string {
  switch (agentType) {
    case 'research':
      return 'Collects sources, facts, and key points to inform the draft.'
    case 'outline':
      return 'Structures the article into sections and a logical flow.'
    case 'writer':
      return 'Drafts the article content based on the outline and research.'
    case 'seo':
      return 'Optimizes content for search intent, keywords, and metadata.'
    case 'qa':
      return 'Reviews for accuracy, clarity, and compliance with guidelines.'
    case 'project_manager':
      return 'Coordinates revisions and ensures all steps complete cleanly.'
    case 'image_generator':
      return 'Generates supporting images for key headings.'
    default:
      return 'Supports the article generation workflow.'
  }
}
</script>

<template>
  <div 
    :data-agent="agentType"
    :class="[
      'agent-flow-node',
      { 'agent-node-active': isActive },
      { 'agent-node-completed': isCompleted },
      { 'agent-node-skipped': isSkipped },
      { 'agent-node-error': hasError },
    ]"
    class="relative bg-card border-2 rounded-[36px] px-4 py-3 w-[260px] transition-all duration-300"
    :style="{ borderColor: isActive ? agentInfo.color : hasError ? 'hsl(var(--destructive))' : undefined }"
  >
    <!-- Handles (8 total: 2 per position) -->
    <Handle id="handle-left-source" type="source" :position="Position.Left" :style="{ backgroundColor: agentInfo.color }" />
    <Handle id="handle-left-target" type="target" :position="Position.Left" :style="{ backgroundColor: agentInfo.color }" />
    
    <Handle id="handle-right-source" type="source" :position="Position.Right" :style="{ backgroundColor: agentInfo.color }" />
    <Handle id="handle-right-target" type="target" :position="Position.Right" :style="{ backgroundColor: agentInfo.color }" />
    
    <Handle id="handle-top-source" type="source" :position="Position.Top" :style="{ backgroundColor: agentInfo.color }" />
    <Handle id="handle-top-target" type="target" :position="Position.Top" :style="{ backgroundColor: agentInfo.color }" />
    
    <Handle id="handle-bottom-source" type="source" :position="Position.Bottom" :style="{ backgroundColor: agentInfo.color }" />
    <Handle id="handle-bottom-target" type="target" :position="Position.Bottom" :style="{ backgroundColor: agentInfo.color }" />

    <!-- Node content -->
    <div class="flex items-start gap-2">
      <!-- Agent icon -->
      <div 
        class="relative flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-300"
        :style="{ backgroundColor: agentInfo.color + '20' }"
      >
        <Icon name="i-lucide-bot" class="size-5" :style="{ color: agentInfo.color }" />
        <span
          v-if="isRunning"
          class="absolute -bottom-1 -left-1 inline-flex items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow-sm"
          style="width: 16px; height: 16px;"
        >
          <Icon name="i-lucide-loader-2" class="size-3 animate-spin" />
        </span>
        <span
          v-if="hasError"
          class="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-destructive text-white shadow-sm"
          style="width: 16px; height: 16px;"
        >
          <Icon name="i-lucide-alert-triangle" class="size-3" />
        </span>
      </div>

      <!-- Agent info -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5 mb-0.5">
          <h3 class="font-semibold text-sm leading-tight line-clamp-2">{{ agentInfo.label }} Agent</h3>
          <UiTooltip>
            <UiTooltipTrigger as-child>
              <button
                type="button"
                class="ml-auto inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Agent info"
              >
                <Icon name="i-lucide-info" class="size-4" />
              </button>
            </UiTooltipTrigger>
            <UiTooltipContent side="top" align="start" class="max-w-[220px]">
              {{ agentDescription }}
            </UiTooltipContent>
          </UiTooltip>
          <!-- Status indicator -->
          <div v-if="isCompleted && !hasError" class="agent-checkmark flex-shrink-0">
            <div class="i-lucide-check-circle text-green-500 text-sm" />
          </div>
          <div v-else-if="hasError" class="flex-shrink-0">
            <div class="i-lucide-alert-circle text-destructive text-sm" />
          </div>
        </div>

        <!-- Compact stats -->
        <div v-if="isSkipped" class="text-xs text-muted-foreground italic">Skipped</div>
        <div v-else-if="steps.length === 0" class="text-xs text-muted-foreground italic">Waiting...</div>
        <div v-else class="space-y-0.5">
          <!-- Turn count and time -->
          <div class="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
            <span class="font-medium">{{ steps.length }} {{ steps.length === 1 ? 'pass' : 'passes' }}</span>
            <span v-if="totalTokens > 0" class="text-[10px] text-muted-foreground font-mono">
              · {{ formatTokens(totalTokens) }} tokens
            </span>
            <span
              v-if="modelName"
              class="text-[10px] text-muted-foreground font-mono inline-block truncate max-w-[120px]"
              :title="modelName"
            >
              · {{ modelName }}
            </span>
          </div>
          <!-- Error indicator (icon chip on avatar only) -->
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.agent-flow-node {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.agent-node-active {
  box-shadow: 0 0 0 2px v-bind('agentInfo.color + "40"');
  animation: pulse-border 2s infinite;
}

.agent-node-skipped {
  opacity: 0.6;
  filter: grayscale(0.8);
}

.agent-checkmark {
  opacity: 0;
  animation: fadeIn 300ms ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes pulse-border {
  0% { box-shadow: 0 0 0 0px v-bind('agentInfo.color + "40"'); }
  50% { box-shadow: 0 0 0 4px v-bind('agentInfo.color + "00"'); }
  100% { box-shadow: 0 0 0 0px v-bind('agentInfo.color + "00"'); }
}
</style>
