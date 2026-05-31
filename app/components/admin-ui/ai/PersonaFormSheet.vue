<script setup lang="ts">
/**
 * Persona Form Sheet
 *
 * Slide-out sheet for creating/editing AI personas.
 * Uses TipTap for system prompt editing.
 */
import { z } from 'zod'
import { toast } from 'vue-sonner'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { useAgentMetadata } from '~/composables/useAgentMetadata'

// =====================================================
// CONSTANTS
// =====================================================

const LLM_PROVIDERS = ['anthropic', 'openai'] as const

// =====================================================
// AGENT METADATA (must be before schema for AGENT_ORDER reference)
// =====================================================

const { fetchMetadata, AGENT_ORDER, AGENT_INFO, isLoading: isMetadataLoading } = useAgentMetadata()

const isFormReady = computed(() => !isMetadataLoading.value)

// =====================================================
// FORM SCHEMA
// =====================================================

// Note: Avoid using .default() as it causes issues with @vee-validate/zod and Zod 4
// Use initialValues in useForm instead
const personaFormSchema = z.object({
  agentType: z.string().refine(
    (val) => AGENT_ORDER.value.length === 0 || AGENT_ORDER.value.includes(val),
    { message: 'Invalid agent type' }
  ),
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  systemPrompt: z.string().min(10, 'System prompt must be at least 10 characters').max(50000),
  provider: z.enum(LLM_PROVIDERS),
  model: z.string().min(1).max(100),
  temperature: z.coerce.number().min(0).max(2),
   maxTokens: z.coerce.number().int().min(100).max(20000),
  isDefault: z.boolean(),
  isEnabled: z.boolean(),
})

type PersonaFormData = z.infer<typeof personaFormSchema>

interface PersonaData {
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
}

// =====================================================
// PROPS & EMITS
// =====================================================

interface Props {
  open: boolean
  persona?: PersonaData | null
}

const props = withDefaults(defineProps<Props>(), {
  persona: null,
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  'saved': []
}>()

// =====================================================
// COMPUTED
// =====================================================

const isEditMode = computed(() => !!props.persona)
const sheetTitle = computed(() => isEditMode.value ? 'Edit Persona' : 'Create Persona')

// =====================================================
// FORM SETUP
// =====================================================

const defaultValues: PersonaFormData = {
  agentType: 'writer',
  name: '',
  description: '',
  systemPrompt: '',
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  temperature: 0.7,
  maxTokens: 4000,
  isDefault: false,
  isEnabled: true,
}

const { handleSubmit, errors, defineField, resetForm, isSubmitting, setValues } = useForm({
  validationSchema: toTypedSchema(personaFormSchema),
  initialValues: defaultValues,
})

const [agentType] = defineField('agentType')
const [name] = defineField('name')
const [description] = defineField('description')
const [systemPrompt] = defineField('systemPrompt')
const [provider] = defineField('provider')
const [model] = defineField('model')
const [temperature] = defineField('temperature')
const [maxTokens] = defineField('maxTokens')
const [isDefault] = defineField('isDefault')
const [isEnabled] = defineField('isEnabled')

onMounted(async () => {
  await fetchMetadata()
})

// Helper function to populate form with persona data
function populateForm(persona: PersonaData) {
  setValues({
    agentType: persona.agentType,
    name: persona.name,
    description: persona.description || '',
    systemPrompt: persona.systemPrompt,
    provider: persona.provider as typeof LLM_PROVIDERS[number],
    model: persona.model,
    temperature: persona.temperature,
    maxTokens: persona.maxTokens,
    isDefault: persona.isDefault,
    isEnabled: persona.isEnabled,
  })
}

// Watch for persona changes (handles switching between different personas)
watch(() => props.persona, (newPersona) => {
  if (newPersona) {
    populateForm(newPersona)
  } else {
    resetForm()
  }
}, { immediate: true })

// Handle sheet open/close
watch(() => props.open, (open) => {
  if (open && props.persona) {
    // Reopen with same persona - repopulate form
    populateForm(props.persona)
  } else if (!open) {
    resetForm()
  }
})

// Auto-switch to OpenAI when image_generator is selected
watch(agentType, (newType) => {
  if (newType === 'image_generator' && provider.value !== 'openai') {
    provider.value = 'openai'
    // Also update model to a valid OpenAI model if current model is Anthropic
    if (!['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'].includes(model.value)) {
      model.value = 'gpt-4o-mini'
    }
  }
})


// =====================================================
// MODEL SUGGESTIONS
// =====================================================

const modelSuggestions = computed(() => {
  // image_generator always uses OpenAI
  if (agentType.value === 'image_generator') {
    return [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
    ]
  }
  
  if (provider.value === 'anthropic') {
    return [
      'claude-opus-4-5',
      'claude-sonnet-4-20250514',
      'claude-3-5-haiku-20241022',
    ]
  }
  return [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
  ]
})

// =====================================================
// FORM SUBMISSION
// =====================================================

const onSubmit = handleSubmit(async (values: PersonaFormData) => {
  try {
    if (isEditMode.value && props.persona) {
      // Update existing persona
      await $fetch(`/api/ai/personas/${props.persona.id}`, {
        method: 'PATCH',
        body: values,
      })
      toast.success('Persona updated successfully')
    } else {
      // Create new persona
      await $fetch('/api/ai/personas', {
        method: 'POST',
        body: values,
      })
      toast.success('Persona created successfully')
    }
    emit('saved')
    emit('update:open', false)
  } catch (err: any) {
    toast.error('Failed to save persona', { description: err?.data?.message || err?.message })
  }
})
</script>

<template>
  <UiSheet :open="open" @update:open="emit('update:open', $event)">
    <UiSheetContent side="right" class="w-full sm:max-w-xl overflow-hidden flex flex-col p-6">
      <UiSheetHeader class="flex-shrink-0 pb-4">
        <UiSheetTitle>{{ sheetTitle }}</UiSheetTitle>
        <UiSheetDescription>
          Configure the AI agent's personality, system prompt, and model settings.
        </UiSheetDescription>
      </UiSheetHeader>

      <form class="flex flex-1 flex-col overflow-hidden" @submit="onSubmit">
        <!-- Scrollable Content -->
        <div class="flex-1 overflow-y-auto min-h-0">
          <div class="space-y-5 py-4">
             <!-- Agent Type -->
             <div>
               <label class="mb-1.5 block text-sm font-medium">Agent Type</label>
               <UiSelect v-model="agentType" :disabled="!isFormReady || isEditMode">
                <UiSelectTrigger class="w-full">
                  <UiSelectValue placeholder="Select agent type" />
                </UiSelectTrigger>
                <UiSelectContent>
                  <UiSelectItem v-for="type in AGENT_ORDER" :key="type" :value="type">
                    {{ AGENT_INFO[type]?.label || type }}
                  </UiSelectItem>
                </UiSelectContent>
              </UiSelect>
              <p v-if="errors.agentType" class="mt-1 text-xs text-destructive">{{ errors.agentType }}</p>
            </div>

             <!-- Name -->
             <div>
               <label class="mb-1.5 block text-sm font-medium">Name</label>
               <UiInput v-model="name" placeholder="e.g., Creative Writer" :disabled="!isFormReady" :class="{ 'border-destructive': errors.name }" />
              <p v-if="errors.name" class="mt-1 text-xs text-destructive">{{ errors.name }}</p>
            </div>

             <!-- Description -->
             <div>
               <label class="mb-1.5 block text-sm font-medium">Description</label>
               <UiTextarea v-model="description" placeholder="Optional description..." rows="2" :disabled="!isFormReady" />
              <p v-if="errors.description" class="mt-1 text-xs text-destructive">{{ errors.description }}</p>
            </div>

             <!-- System Prompt -->
             <div>
               <label class="mb-1.5 block text-sm font-medium">System Prompt</label>
               <TipTapEditor
                 v-model="systemPrompt"
                 placeholder="Enter the system prompt for this persona..."
                 :show-toolbar="true"
                 :disabled="!isFormReady"
                 class="min-h-[200px]"
               />
              <p v-if="errors.systemPrompt" class="mt-1 text-xs text-destructive">{{ errors.systemPrompt }}</p>
            </div>

             <!-- Provider & Model -->
             <div class="grid grid-cols-2 gap-4">
             <div>
                 <label class="mb-1.5 block text-sm font-medium">Provider</label>
                 <UiSelect v-model="provider" :disabled="!isFormReady || agentType === 'image_generator'">
                  <UiSelectTrigger class="w-full">
                    <UiSelectValue />
                  </UiSelectTrigger>
                  <UiSelectContent>
                    <UiSelectItem v-if="agentType !== 'image_generator'" value="anthropic">Anthropic</UiSelectItem>
                    <UiSelectItem value="openai">OpenAI</UiSelectItem>
                  </UiSelectContent>
                </UiSelect>
                <p v-if="agentType === 'image_generator'" class="mt-1 text-xs text-muted-foreground">
                  Image generation requires OpenAI models
                </p>
              </div>
               <div>
                 <label class="mb-1.5 block text-sm font-medium">Model</label>
                 <UiSelect v-model="model" :disabled="!isFormReady">
                  <UiSelectTrigger class="w-full">
                    <UiSelectValue placeholder="Select model" />
                  </UiSelectTrigger>
                  <UiSelectContent>
                    <UiSelectItem v-for="m in modelSuggestions" :key="m" :value="m">
                      {{ m }}
                    </UiSelectItem>
                  </UiSelectContent>
                </UiSelect>
              </div>
            </div>

             <!-- Temperature & Max Tokens -->
             <div class="grid grid-cols-2 gap-4">
               <div>
                 <label class="mb-1.5 block text-sm font-medium">Temperature</label>
                 <UiInput v-model="temperature" type="number" min="0" max="2" step="0.1" :disabled="!isFormReady" />
                <p class="mt-1 text-xs text-muted-foreground">0 = deterministic, 2 = creative</p>
              </div>
               <div>
                 <label class="mb-1.5 block text-sm font-medium">Max Tokens</label>
                  <UiInput v-model="maxTokens" type="number" min="100" max="20000" :disabled="!isFormReady" />
              </div>
            </div>

              <!-- Toggles (hidden for default personas in edit mode) -->
              <div v-if="!isEditMode || !props.persona?.isDefault" class="flex items-center gap-6">
                <label class="flex cursor-pointer items-center gap-2">
                  <UiSwitch v-model:checked="isDefault" :disabled="!isFormReady" />
                  <span class="text-sm">Default for agent type</span>
                </label>
                <label class="flex cursor-pointer items-center gap-2">
                  <UiSwitch v-model:checked="isEnabled" :disabled="!isFormReady" />
                  <span class="text-sm">Enabled</span>
                </label>
              </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex-shrink-0 pt-4 border-t border-border">
          <div class="flex items-center justify-end gap-2">
            <UiButton type="button" variant="outline" @click="emit('update:open', false)">
              Cancel
            </UiButton>
             <UiButton type="submit" :disabled="isSubmitting || !isFormReady">
               <Icon v-if="isSubmitting" name="i-lucide-loader-2" class="mr-1.5 size-4 animate-spin" />
               {{ isEditMode ? 'Save Changes' : 'Create Persona' }}
             </UiButton>
          </div>
        </div>
      </form>
    </UiSheetContent>
  </UiSheet>
</template>
