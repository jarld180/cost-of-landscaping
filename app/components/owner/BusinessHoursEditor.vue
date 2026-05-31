<script setup lang="ts">
import {
  DAYS_OF_WEEK,
  DAY_LABELS,
  TIME_OPTIONS,
  type BusinessHours,
  type DayOfWeek,
} from '~/schemas/owner/contractor-form.schema'

interface Props {
  modelValue: BusinessHours | null | undefined
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [hours: BusinessHours]
}>()

// Internal state for each day
const dayStates = reactive<Record<DayOfWeek, { isOpen: boolean; open: string; close: string }>>({
  monday: { isOpen: false, open: '9:00 AM', close: '5:00 PM' },
  tuesday: { isOpen: false, open: '9:00 AM', close: '5:00 PM' },
  wednesday: { isOpen: false, open: '9:00 AM', close: '5:00 PM' },
  thursday: { isOpen: false, open: '9:00 AM', close: '5:00 PM' },
  friday: { isOpen: false, open: '9:00 AM', close: '5:00 PM' },
  saturday: { isOpen: false, open: '9:00 AM', close: '5:00 PM' },
  sunday: { isOpen: false, open: '9:00 AM', close: '5:00 PM' },
})

// Initialize from modelValue
watch(
  () => props.modelValue,
  (newVal) => {
    if (!newVal) return
    for (const day of DAYS_OF_WEEK) {
      const hours = newVal[day]
      if (hours && hours.open && hours.close) {
        dayStates[day].isOpen = true
        dayStates[day].open = hours.open
        dayStates[day].close = hours.close
      } else {
        dayStates[day].isOpen = false
      }
    }
  },
  { immediate: true }
)

// Emit changes
function emitUpdate() {
  const result: BusinessHours = {}
  for (const day of DAYS_OF_WEEK) {
    if (dayStates[day].isOpen) {
      result[day] = {
        open: dayStates[day].open,
        close: dayStates[day].close,
      }
    } else {
      result[day] = null
    }
  }
  emit('update:modelValue', result)
}

// Toggle day open/closed
function toggleDay(day: DayOfWeek, isOpen: boolean) {
  dayStates[day].isOpen = isOpen
  emitUpdate()
}

// Update time
function updateTime(day: DayOfWeek, field: 'open' | 'close', value: string) {
  dayStates[day][field] = value
  emitUpdate()
}

// Copy Monday to weekdays
function copyMondayToWeekdays() {
  const monday = dayStates.monday
  const weekdays: DayOfWeek[] = ['tuesday', 'wednesday', 'thursday', 'friday']
  for (const day of weekdays) {
    dayStates[day].isOpen = monday.isOpen
    dayStates[day].open = monday.open
    dayStates[day].close = monday.close
  }
  emitUpdate()
}
</script>

<template>
  <div class="space-y-3">
    <!-- Day rows -->
    <div class="space-y-2">
      <div
        v-for="day in DAYS_OF_WEEK"
        :key="day"
        class="flex items-center gap-3 rounded-xl border border-neutral-300 p-3 transition-colors dark:border-neutral-600"
        :class="{ 'bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-600': dayStates[day].isOpen }"
      >
        <!-- Open checkbox -->
        <Checkbox
          :model-value="dayStates[day].isOpen"
          @update:model-value="(v: boolean | 'indeterminate') => toggleDay(day, v === true)"
        />

        <!-- Day label -->
        <span class="w-24 text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {{ DAY_LABELS[day] }}
        </span>

        <!-- Time selectors (only show when open) -->
        <div v-if="dayStates[day].isOpen" class="flex flex-1 items-center gap-2">
          <select
            :value="dayStates[day].open"
            @change="(e) => updateTime(day, 'open', (e.target as HTMLSelectElement).value)"
            class="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-700 outline-none transition-colors hover:border-neutral-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
          >
            <option v-for="time in TIME_OPTIONS" :key="time" :value="time">{{ time }}</option>
          </select>
          <span class="text-sm text-neutral-500">to</span>
          <select
            :value="dayStates[day].close"
            @change="(e) => updateTime(day, 'close', (e.target as HTMLSelectElement).value)"
            class="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-700 outline-none transition-colors hover:border-neutral-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
          >
            <option v-for="time in TIME_OPTIONS" :key="time" :value="time">{{ time }}</option>
          </select>
        </div>
        <div v-else class="flex-1 text-sm text-neutral-500 italic">
          Closed
        </div>
      </div>
    </div>

    <!-- Copy to weekdays button -->
    <div class="pt-1">
      <button
        type="button"
        class="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
        @click="copyMondayToWeekdays"
      >
        Copy Monday to weekdays
      </button>
    </div>
  </div>
</template>

