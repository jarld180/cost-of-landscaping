<script setup lang="ts">
interface Props {
  componentName: string
}

const props = defineProps<Props>()
const { docs } = useComponentDocs()

const componentDoc = computed(() => docs[props.componentName])
const hasProps = computed(() => componentDoc.value?.props && componentDoc.value.props.length > 0)
const hasSlots = computed(() => componentDoc.value?.slots && componentDoc.value.slots.length > 0)
const hasEvents = computed(() => componentDoc.value?.events && componentDoc.value.events.length > 0)
const hasExamples = computed(() => componentDoc.value?.examples && componentDoc.value.examples.length > 0)
</script>

<template>
  <Popover side="left" :width="'1000px'">
    <template #trigger>
      <button
        class="rounded-lg bg-blue-500 p-2 text-white transition-colors hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
        aria-label="View component documentation"
      >
        <!-- Info icon -->
        <svg
          class="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
    </template>

    <div class="max-h-[600px] space-y-4 overflow-y-auto">
      <h3 class="text-lg font-bold text-neutral-800 dark:text-neutral-100">
        {{ componentName }} API
      </h3>

      <!-- Props Table -->
      <div v-if="hasProps">
        <h4 class="mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          Props
        </h4>
        <div class="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-600">
          <table class="w-full text-sm">
            <thead class="bg-neutral-100 dark:bg-neutral-700">
              <tr>
                <th class="px-3 py-2 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                  Name
                </th>
                <th class="px-3 py-2 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                  Type
                </th>
                <th class="px-3 py-2 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                  Default
                </th>
                <th class="px-3 py-2 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                  Description
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-neutral-200 dark:divide-neutral-600">
              <tr
                v-for="prop in componentDoc.props"
                :key="prop.name"
                class="hover:bg-neutral-50 dark:hover:bg-neutral-700/50"
              >
                <td class="font-mono px-3 py-2 text-xs text-neutral-800 dark:text-neutral-200">
                  {{ prop.name }}
                  <span v-if="prop.required" class="text-red-500 dark:text-red-400">*</span>
                </td>
                <td class="font-mono px-3 py-2 text-xs text-blue-600 dark:text-blue-400">
                  {{ prop.type }}
                </td>
                <td class="font-mono px-3 py-2 text-xs text-neutral-500 dark:text-neutral-400">
                  {{ prop.default || '-' }}
                </td>
                <td class="px-3 py-2 text-xs text-neutral-600 dark:text-neutral-300">
                  {{ prop.description }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Slots Section -->
      <div v-if="hasSlots">
        <h4 class="mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          Slots
        </h4>
        <div class="space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-600 dark:bg-neutral-700/50">
          <div
            v-for="slot in componentDoc.slots"
            :key="slot.name"
            class="text-xs"
          >
            <span class="font-mono font-semibold text-neutral-800 dark:text-neutral-200">
              #{{ slot.name }}:
            </span>
            <span class="text-neutral-600 dark:text-neutral-300"> {{ slot.description }}</span>
          </div>
        </div>
      </div>

      <!-- Events Section -->
      <div v-if="hasEvents">
        <h4 class="mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          Events
        </h4>
        <div class="space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-600 dark:bg-neutral-700/50">
          <div
            v-for="event in componentDoc.events"
            :key="event.name"
            class="text-xs"
          >
            <span class="font-mono font-semibold text-neutral-800 dark:text-neutral-200">
              @{{ event.name }}:
            </span>
            <span class="font-mono text-blue-600 dark:text-blue-400">({{ event.payload }})</span>
            <span class="text-neutral-600 dark:text-neutral-300"> - {{ event.description }}</span>
          </div>
        </div>
      </div>

      <!-- Usage Examples Section -->
      <div v-if="hasExamples">
        <h4 class="mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          Usage Examples
        </h4>
        <div class="space-y-3">
          <div
            v-for="(example, index) in componentDoc.examples"
            :key="index"
          >
            <p class="mb-1 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
              {{ example.title }}
            </p>
            <pre class="overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-900 p-3 dark:border-neutral-600"><code class="text-xs text-green-400">{{ example.code }}</code></pre>
          </div>
        </div>
      </div>
    </div>
  </Popover>
</template>

<style scoped>
/* Ensure code blocks don't break layout */
pre {
  white-space: pre;
  word-wrap: normal;
}

code {
  font-family: 'Courier New', Courier, monospace;
}
</style>

