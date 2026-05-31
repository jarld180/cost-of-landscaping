<script setup lang="ts">
/**
 * AI Personas Management
 *
 * List, create, edit, and delete AI agent personas.
 */
import { toast } from 'vue-sonner'
import PersonaFormSheet from '~/components/admin-ui/ai/PersonaFormSheet.vue'
import { useAgentMetadata } from '~/composables/useAgentMetadata'

definePageMeta({
  layout: 'admin'
})

// =====================================================
// AGENT METADATA
// =====================================================

const { fetchMetadata, AGENT_ORDER, AGENT_INFO } = useAgentMetadata()

onMounted(async () => {
  await fetchMetadata()
})

// =====================================================
// TYPES
// =====================================================

interface Persona {
  id: string
  agentType: string
  name: string
  description: string | null
  systemPrompt: string
  provider: string
  model: string
  temperature: number
  maxTokens: number
  isDefault: boolean
  isEnabled: boolean
  createdAt: string
  updatedAt: string
}

// =====================================================
// DATA FETCHING
// =====================================================

const agentTypeFilter = ref<string>('all')
const enabledFilter = ref<string>('all')

const { data: personasData, pending, error, refresh } = await useFetch('/api/ai/personas', {
  query: computed(() => ({
    agentType: agentTypeFilter.value === 'all' ? undefined : agentTypeFilter.value,
    isEnabled: enabledFilter.value === 'all' ? undefined : enabledFilter.value === 'true',
  })),
  watch: [agentTypeFilter, enabledFilter],
  lazy: true,
})

const personas = computed<Persona[]>(() => personasData.value?.personas ?? [])

// Group personas by agent type
const groupedPersonas = computed(() => {
  const groups: Record<string, Persona[]> = {}
  for (const persona of personas.value) {
    if (!groups[persona.agentType]) {
      groups[persona.agentType] = []
    }
    groups[persona.agentType].push(persona)
  }
  return groups
})

// =====================================================
// SHEET STATE
// =====================================================

const sheetOpen = ref(false)
const editingPersona = ref<Persona | null>(null)

function openCreateSheet() {
  editingPersona.value = null
  sheetOpen.value = true
}

function openEditSheet(persona: Persona) {
  editingPersona.value = persona
  sheetOpen.value = true
}

function onSaved() {
  refresh()
}

// =====================================================
// DELETE
// =====================================================

const deletingId = ref<string | null>(null)
const deleteDialogOpen = ref(false)
const personaToDelete = ref<Persona | null>(null)

function confirmDelete(persona: Persona) {
  personaToDelete.value = persona
  deleteDialogOpen.value = true
}

async function deletePersona() {
  if (!personaToDelete.value) return

  try {
    deletingId.value = personaToDelete.value.id
    await $fetch(`/api/ai/personas/${personaToDelete.value.id}`, { method: 'DELETE' })
    toast.success('Persona deleted')
    deleteDialogOpen.value = false
    personaToDelete.value = null
    refresh()
  } catch (err: any) {
    toast.error('Failed to delete persona', { description: err?.data?.message || err?.message })
  } finally {
    deletingId.value = null
  }
}

// =====================================================
// HELPERS
// =====================================================

function getAgentLabel(type: string) {
  return AGENT_INFO.value[type]?.label || type
}

function getAgentIcon(type: string) {
  return AGENT_INFO.value[type]?.icon || 'i-lucide-bot'
}
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">AI Personas</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Manage AI agent personalities and system prompts
        </p>
      </div>
      <UiButton @click="openCreateSheet">
        <Icon name="i-lucide-plus" class="mr-1.5 size-4" />
        Add Persona
      </UiButton>
    </div>
    <!-- Filters -->
    <div class="mb-4 flex items-center gap-3">
       <UiSelect v-model="agentTypeFilter" class="w-40">
         <UiSelectTrigger>
           <UiSelectValue placeholder="Agent Type" />
         </UiSelectTrigger>
         <UiSelectContent>
           <UiSelectItem value="all">All Types</UiSelectItem>
           <UiSelectItem v-for="type in AGENT_ORDER" :key="type" :value="type">
             {{ AGENT_INFO[type]?.label || type }}
           </UiSelectItem>
         </UiSelectContent>
       </UiSelect>

      <UiSelect v-model="enabledFilter" class="w-32">
        <UiSelectTrigger>
          <UiSelectValue placeholder="Status" />
        </UiSelectTrigger>
        <UiSelectContent>
          <UiSelectItem value="all">All</UiSelectItem>
          <UiSelectItem value="true">Enabled</UiSelectItem>
          <UiSelectItem value="false">Disabled</UiSelectItem>
        </UiSelectContent>
      </UiSelect>

      <UiButton variant="outline" size="icon" :disabled="pending" @click="refresh()">
        <Icon name="i-lucide-refresh-cw" :class="['size-4', { 'animate-spin': pending }]" />
      </UiButton>
    </div>

    <!-- Error State -->
    <UiCard v-if="error" class="p-6 text-center">
      <Icon name="i-lucide-alert-triangle" class="mx-auto mb-2 size-8 text-destructive" />
      <p class="text-sm text-destructive">{{ error.message }}</p>
    </UiCard>

    <!-- Empty State -->
    <UiCard v-else-if="!pending && personas.length === 0" class="p-6 text-center">
      <Icon name="i-lucide-bot" class="mx-auto mb-2 size-8 text-muted-foreground/50" />
      <p class="text-sm text-muted-foreground">No personas found</p>
      <UiButton variant="outline" class="mt-4" @click="openCreateSheet">
        Create your first persona
      </UiButton>
    </UiCard>

    <!-- Personas Grouped by Agent Type -->
    <div v-else class="space-y-6">
      <UiCard v-for="(typePersonas, agentType) in groupedPersonas" :key="agentType">
        <UiCardHeader class="pb-3">
          <UiCardTitle class="flex items-center gap-2 text-base">
            <Icon :name="getAgentIcon(agentType as string)" class="size-5" />
            {{ getAgentLabel(agentType as string) }} Agent
            <UiBadge variant="secondary" class="ml-2">{{ typePersonas.length }}</UiBadge>
          </UiCardTitle>
        </UiCardHeader>
        <UiCardContent class="p-0">
          <table class="w-full text-sm">
            <thead class="border-b bg-muted/50 text-left">
              <tr>
                <th class="px-4 py-2 font-medium">Name</th>
                <th class="px-4 py-2 font-medium">Model</th>
                <th class="px-4 py-2 font-medium">Temperature</th>
                <th class="px-4 py-2 font-medium">Max Tokens</th>
                <th class="px-4 py-2 font-medium">Status</th>
                <th class="px-4 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="persona in typePersonas" :key="persona.id" class="border-b last:border-0">
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <span class="font-medium">{{ persona.name }}</span>
                    <UiBadge v-if="persona.isDefault" variant="default" class="text-xs">Default</UiBadge>
                  </div>
                  <p v-if="persona.description" class="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                    {{ persona.description }}
                  </p>
                </td>
                <td class="px-4 py-3 text-muted-foreground">
                  <code class="rounded bg-muted px-1.5 py-0.5 text-xs">{{ persona.model }}</code>
                </td>
                <td class="px-4 py-3 text-muted-foreground">{{ persona.temperature }}</td>
                <td class="px-4 py-3 text-muted-foreground">{{ persona.maxTokens.toLocaleString() }}</td>
                <td class="px-4 py-3">
                  <UiBadge :variant="persona.isEnabled ? 'success' : 'secondary'">
                    {{ persona.isEnabled ? 'Enabled' : 'Disabled' }}
                  </UiBadge>
                </td>
                <td class="px-4 py-3 text-right">
                  <div class="flex items-center justify-end gap-1">
                    <UiButton variant="ghost" size="icon" class="size-8" @click="openEditSheet(persona)">
                      <Icon name="i-lucide-pencil" class="size-4" />
                    </UiButton>
                    <UiButton
                      variant="ghost"
                      size="icon"
                      class="size-8 text-destructive hover:text-destructive"
                      :disabled="persona.isDefault || deletingId === persona.id"
                      @click="confirmDelete(persona)"
                    >
                      <Icon
                        :name="deletingId === persona.id ? 'i-lucide-loader-2' : 'i-lucide-trash-2'"
                        :class="['size-4', { 'animate-spin': deletingId === persona.id }]"
                      />
                    </UiButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </UiCardContent>
      </UiCard>
    </div>

    <!-- Create/Edit Sheet -->
    <PersonaFormSheet
      v-model:open="sheetOpen"
      :persona="editingPersona"
      @saved="onSaved"
    />

    <!-- Delete Confirmation Dialog -->
    <UiAlertDialog v-model:open="deleteDialogOpen">
      <UiAlertDialogContent>
        <UiAlertDialogHeader>
          <UiAlertDialogTitle>Delete Persona</UiAlertDialogTitle>
          <UiAlertDialogDescription>
            Are you sure you want to delete "{{ personaToDelete?.name }}"? This action cannot be undone.
          </UiAlertDialogDescription>
        </UiAlertDialogHeader>
        <UiAlertDialogFooter>
          <UiAlertDialogCancel>Cancel</UiAlertDialogCancel>
          <UiAlertDialogAction variant="destructive" @click="deletePersona">
            Delete
          </UiAlertDialogAction>
        </UiAlertDialogFooter>
      </UiAlertDialogContent>
    </UiAlertDialog>
  </div>
</template>

