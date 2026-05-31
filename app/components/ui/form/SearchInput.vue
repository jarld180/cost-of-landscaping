<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { onClickOutside, useDebounceFn } from '@vueuse/core'
import { consola } from 'consola'
import {
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectPortal,
  SelectContent,
  SelectViewport,
  SelectItem,
  SelectItemText
} from 'reka-ui'
import { getStateByCode } from '~/utils/usStates'

// Composable for storing search location coordinates
const { setLocation: saveSearchLocation } = useSearchLocation()

export interface ServiceOption {
  id: number | null
  name: string
  slug: string | null
}

// Location result from API
interface LocationResult {
  type: 'city' | 'zip'
  value: string
  cityName: string
  citySlug: string | null
  stateCode: string
  stateName: string
  lat: number
  lng: number
  zip?: string
  cityId?: string
}

interface Props {
  /**
   * Placeholder text for the input
   * @default "Search by ZIP Code"
   */
  placeholder?: string

  /**
   * The size of the input
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg'

  /**
   * The visual variant (border-based)
   * @default 'primary-outline'
   */
  variant?: 'primary-outline' | 'secondary-outline' | 'secondary-light-outline'

  /**
   * Maximum autocomplete results to show (autocomplete mode only)
   * @default 5
   */
  maxResults?: number

  /**
   * Minimum characters before autocomplete triggers (autocomplete mode only)
   * @default 2
   */
  minCharacters?: number

  /**
   * Loading state for future API integration
   * @default false
   */
  loading?: boolean

  /**
   * Button text. If provided, component shows button instead of autocomplete
   * @default null
   */
  button?: string | null

  /**
   * Custom background colors as [lightMode, darkMode] hex values
   * When provided, overrides the default background colors
   * Example: ['#FFFFFF', '#1F2937']
   * @default null
   */
  backgroundColor?: [string, string] | null

  /**
   * Service dropdown options. When provided, shows inline service selector
   * @default null
   */
  serviceDropdownValues?: ServiceOption[] | null
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Search by ZIP Code',
  size: 'md',
  variant: 'primary-outline',
  maxResults: 5,
  minCharacters: 2,
  loading: false,
  button: null,
  backgroundColor: null,
  serviceDropdownValues: null
})

// Emits
const emit = defineEmits<{
  submit: [value: LocationResult | string | { location: string, service: ServiceOption | null }]
  input: [value: string]
}>()

// State
const searchQuery = ref('')
const isOpen = ref(false)
const selectedIndex = ref(-1)
const inputRef = ref<HTMLInputElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const selectedService = ref<string>('')
const isServiceDropdownOpen = ref(false)
const locationResults = ref<LocationResult[]>([])
const isSearching = ref(false)

// Computed: Is button mode active
const isButtonMode = computed(() => props.button !== null && props.button !== undefined)

// Computed: Has service dropdown
const hasServiceDropdown = computed(() =>
  props.serviceDropdownValues !== null &&
  props.serviceDropdownValues !== undefined &&
  props.serviceDropdownValues.length > 0
)

// Initialize selected service to first option (usually "All Services")
watch(() => props.serviceDropdownValues, (newValue) => {
  if (newValue && newValue.length > 0 && newValue[0]) {
    selectedService.value = String(newValue[0].id ?? '0')
  }
}, { immediate: true })

// Debounced API search for locations
const searchLocations = useDebounceFn(async (query: string) => {
  if (query.length < props.minCharacters) {
    locationResults.value = []
    return
  }

  isSearching.value = true
  try {
    const results = await $fetch<LocationResult[]>('/api/public/locations', {
      query: { q: query, limit: props.maxResults }
    })
    locationResults.value = results
  } catch (error) {
    consola.error('Location search failed:', error)
    locationResults.value = []
  } finally {
    isSearching.value = false
  }
}, 300)

// Track if a location has been selected from autocomplete (for button mode)
const selectedLocation = ref<LocationResult | null>(null)

// Computed: Filtered results (now from API) - works in both modes
const filteredResults = computed(() => {
  return locationResults.value
})

// Computed: Show dropdown - now works in button mode too
const showDropdown = computed(() => {
  return isOpen.value && searchQuery.value.length >= props.minCharacters
})

// Computed: Show "no results" message
const showNoResults = computed(() => {
  return showDropdown.value && filteredResults.value.length === 0 && !isSearching.value
})

// Computed: Show clear button - now works in button mode too
const showClearButton = computed(() => {
  return searchQuery.value.length > 0
})

// Size classes
const sizeClasses = computed(() => {
  // When service dropdown is present, use auto height on mobile (stacked), fixed height on desktop
  if (hasServiceDropdown.value) {
    const sizes = {
      sm: 'min-h-11 @md:h-11 text-sm py-3 @md:py-0',
      md: 'min-h-12 @md:h-12 text-base py-3 @md:py-0',
      lg: 'min-h-14 @md:h-14 text-lg py-4 @md:py-0'
    }
    return sizes[props.size]
  }

  // Default: fixed height for all breakpoints
  const sizes = {
    sm: 'h-11 text-sm',
    md: 'h-12 text-base',
    lg: 'h-14 text-lg'
  }
  return sizes[props.size]
})

// Variant classes
const variantClasses = computed(() => {
  const variants = {
    'primary-outline': 'border-blue-400 dark:border-blue-500 focus-within:border-blue-500 dark:focus-within:border-blue-400',
    'secondary-outline': 'border-neutral-600 dark:border-neutral-500 focus-within:border-neutral-700 dark:focus-within:border-neutral-400',
    'secondary-light-outline': 'border-neutral-300 dark:border-neutral-600 focus-within:border-neutral-400 dark:focus-within:border-neutral-500'
  }
  return variants[props.variant]
})

// Custom styles for background colors
const customStyles = computed(() => {
  const styles: Record<string, string> = {}

  if (props.backgroundColor) {
    styles['--search-bg-light'] = props.backgroundColor[0]
    styles['--search-bg-dark'] = props.backgroundColor[1]
  }

  return styles
})

// Container classes
const containerClasses = computed(() => {
  // In button mode: responsive right padding to contain button properly
  // Mobile container (< 448px): pr-2 (8px) for circular icon button
  // Tablet/Desktop container (≥ 448px): pr-1 (4px) for pill text button
  // In autocomplete mode: standard padding
  const paddingClasses = isButtonMode.value ? 'pl-4 pr-2 @md:pr-1' : 'pl-4 pr-4'

  // Background color classes
  const bgClasses = props.backgroundColor
    ? 'bg-[var(--search-bg-light)] dark:bg-[var(--search-bg-dark)]'
    : 'bg-gray-100 dark:bg-neutral-900'

  // Layout classes - when service dropdown is present, stack on mobile
  const layoutClasses = hasServiceDropdown.value
    ? 'flex flex-col @md:flex-row @md:items-center gap-3 rounded-3xl @md:rounded-full'
    : 'flex items-center gap-3 rounded-full'

  return [
    'relative border transition-all',
    bgClasses,
    paddingClasses,
    sizeClasses.value,
    variantClasses.value,
    layoutClasses
  ].join(' ')
})

// Input classes
const inputClasses = computed(() => {
  return [
    'flex-1 min-w-0 bg-transparent text-neutral-900 placeholder-neutral-400 outline-none dark:text-neutral-100 dark:placeholder-neutral-500'
  ].join(' ')
})

// Button classes (for button mode)
const buttonClasses = computed(() => {
  // Mobile container (< 448px): Round icon-only button with fixed size, no padding
  // Tablet/Desktop container (≥ 448px): Pill text button with auto size and padding
  // Button must fit within container with padding (container - 2*padding)
  // sm: h-11 container -> h-7 button (2px top/bottom margin) on mobile
  // md: h-12 container -> h-8 button (2px top/bottom margin) on mobile
  // lg: h-14 container -> h-10 button (2px top/bottom margin) on mobile
  const baseClasses = 'flex flex-shrink-0 items-center justify-center rounded-full bg-blue-500 font-bold text-white transition-all hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500'

  // Mobile: No padding (icon centered in fixed w/h), Tablet/Desktop: Horizontal padding for text
  const responsiveClasses = '@md:px-5'

  // When service dropdown is present, button should be full width on mobile
  const widthClasses = hasServiceDropdown.value ? 'w-full @md:w-auto' : ''

  const sizes = {
    sm: 'h-7 w-7 @md:h-auto @md:py-2 @md:w-auto text-sm',
    md: 'h-8 w-8 @md:h-auto @md:w-auto @md:py-2 text-base',
    lg: 'h-10 w-10 @md:h-auto @md:w-auto @md:py-2 text-lg'
  }

  // Override size width classes when service dropdown is present
  const sizeClasses = hasServiceDropdown.value
    ? sizes[props.size].replace(/w-\d+/, 'w-full').replace(/@md:w-auto/, '@md:w-auto')
    : sizes[props.size]

  return [baseClasses, responsiveClasses, widthClasses, sizeClasses].join(' ')
})

// Dropdown classes
const dropdownClasses = computed(() => {
  return [
    'absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-800'
  ].join(' ')
})

// Handle input change - now triggers search in both modes
const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  searchQuery.value = target.value
  emit('input', searchQuery.value)

  // Clear selected location when user types (in button mode)
  if (isButtonMode.value) {
    selectedLocation.value = null
  }

  // Open dropdown and trigger search in both modes
  isOpen.value = true
  selectedIndex.value = -1
  searchLocations(searchQuery.value)
}

// Navigate to the appropriate page based on location selection
const navigateToLocation = (result: LocationResult) => {
  // Get state slug from state code
  const stateData = getStateByCode(result.stateCode)
  if (!stateData) {
    consola.error('State not found for code:', result.stateCode)
    return
  }

  // Store search location coordinates for distance-based sorting on destination page
  saveSearchLocation({
    lat: result.lat,
    lng: result.lng,
    displayName: result.value,
    type: result.type,
    citySlug: result.citySlug || undefined,
    stateCode: result.stateCode
  })

  // If we have a city slug (from cities table), navigate to city page
  if (result.citySlug) {
    navigateTo(`/${stateData.slug}/${result.citySlug}/landscapers/`)
  } else {
    // For ZIP codes without city match, navigate to state page
    // TODO: In future, could create dynamic city pages from ZIP data
    navigateTo(`/${stateData.slug}/`)
  }
}

// Handle result selection
const selectResult = (result: LocationResult) => {
  searchQuery.value = result.value
  isOpen.value = false
  selectedIndex.value = -1

  // Consola log for demo (only in dev mode)
  if (import.meta.dev) {
    consola.success('SearchInput: Selected location', {
      type: result.type,
      cityName: result.cityName,
      stateCode: result.stateCode,
      citySlug: result.citySlug,
      zip: result.zip
    })
  }

  // In button mode: populate input and store location, wait for button click
  if (isButtonMode.value) {
    selectedLocation.value = result
    // Don't emit or navigate - wait for button click
    return
  }

  // In autocomplete mode: emit and navigate immediately
  if (hasServiceDropdown.value) {
    emit('submit', {
      location: result.value,
      service: getSelectedServiceObject()
    })
  } else {
    emit('submit', result)
  }

  // Navigate to the location page
  navigateToLocation(result)
}

// Handle button click (button mode)
const handleButtonClick = async () => {
  if (searchQuery.value.trim().length === 0) return

  // Consola log for demo (only in dev mode)
  if (import.meta.dev) {
    consola.info('SearchInput (Button Mode): Submitted value', {
      value: searchQuery.value,
      buttonText: props.button,
      service: hasServiceDropdown.value ? selectedService.value : null,
      hasSelectedLocation: !!selectedLocation.value
    })
  }

  // If service dropdown is present, emit object with location and service
  if (hasServiceDropdown.value) {
    emit('submit', {
      location: searchQuery.value,
      service: getSelectedServiceObject()
    })
  } else {
    emit('submit', searchQuery.value)
  }

  // If we have a selected location from autocomplete, use it directly
  if (selectedLocation.value) {
    navigateToLocation(selectedLocation.value)
    return
  }

  // Otherwise, search for location via API and navigate to the first result
  isSearching.value = true
  try {
    const results = await $fetch<LocationResult[]>('/api/public/locations', {
      query: { q: searchQuery.value.trim(), limit: 1 }
    })

    if (results && results.length > 0 && results[0]) {
      navigateToLocation(results[0])
    } else {
      // No results found - stay on page but show message
      if (import.meta.dev) {
        consola.warn('SearchInput: No locations found for query', searchQuery.value)
      }
    }
  } catch (error) {
    consola.error('SearchInput: Location search failed', error)
  } finally {
    isSearching.value = false
  }
}

// Get selected service object from value
const getSelectedServiceObject = (): ServiceOption | null => {
  if (!props.serviceDropdownValues || !selectedService.value) return null
  return props.serviceDropdownValues.find(s => String(s.id ?? '0') === selectedService.value) || null
}

// Handle clear button
const handleClear = () => {
  searchQuery.value = ''
  isOpen.value = false
  selectedIndex.value = -1
  inputRef.value?.focus()
}

// Keyboard navigation
const handleKeydown = (event: KeyboardEvent) => {
  if (isButtonMode.value) {
    // In button mode, Enter submits
    if (event.key === 'Enter') {
      event.preventDefault()
      handleButtonClick()
    }
    return
  }

  // Autocomplete mode keyboard navigation
  if (!showDropdown.value) return

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      selectedIndex.value = Math.min(selectedIndex.value + 1, filteredResults.value.length - 1)
      break
    case 'ArrowUp':
      event.preventDefault()
      selectedIndex.value = Math.max(selectedIndex.value - 1, -1)
      break
    case 'Enter':
      event.preventDefault()
      if (selectedIndex.value >= 0) {
        const result = filteredResults.value[selectedIndex.value]
        if (result) {
          selectResult(result)
        }
      }
      break
    case 'Escape':
      event.preventDefault()
      isOpen.value = false
      selectedIndex.value = -1
      break
    case 'Tab':
      isOpen.value = false
      selectedIndex.value = -1
      break
  }
}

// Click outside to close autocomplete dropdown
onClickOutside(containerRef as any, () => {
  isOpen.value = false
  selectedIndex.value = -1
})

// Watch for selected index changes to scroll into view
watch(selectedIndex, (newIndex) => {
  if (newIndex >= 0) {
    const element = document.querySelector(`[data-result-index="${newIndex}"]`)
    element?.scrollIntoView({ block: 'nearest' })
  }
})
</script>

<template>
  <div ref="containerRef" class="@container relative w-full">
    <!-- Input Container -->
    <div :class="containerClasses" :style="customStyles">
      <!-- Input Row (Search Icon + Input + Loading/Clear) -->
      <div class="flex items-center gap-3 flex-1 min-w-0">
        <!-- Search Icon -->
        <Icon name="heroicons:magnifying-glass" class="h-5 w-5 flex-shrink-0 text-neutral-400 dark:text-neutral-500" />

        <!-- Input Field -->
        <input
          ref="inputRef"
          v-model="searchQuery"
          type="text"
          :placeholder="placeholder"
          :class="inputClasses"
          @input="handleInput"
          @keydown="handleKeydown"
        />

        <!-- Loading Spinner -->
        <Icon
          v-if="loading"
          name="heroicons:arrow-path"
          class="h-5 w-5 flex-shrink-0 animate-spin text-neutral-400 dark:text-neutral-500"
        />

        <!-- Clear Button (Autocomplete Mode Only) -->
        <button
          v-if="showClearButton"
          type="button"
          class="flex-shrink-0 text-neutral-400 transition-colors hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
          @click="handleClear"
          aria-label="Clear search"
        >
          <Icon name="heroicons:x-mark" class="h-5 w-5" />
        </button>
      </div>

      <!-- Service Dropdown (when serviceDropdownValues is provided) -->
      <div v-if="hasServiceDropdown" class="relative flex items-center w-full @md:w-auto">
        <!-- Divider (hidden on mobile, shown on desktop) -->
        <div class="hidden @md:block mr-3 h-6 w-px bg-neutral-300 dark:bg-neutral-600" />

        <!-- Reka UI Select Component -->
        <SelectRoot v-model="selectedService" v-model:open="isServiceDropdownOpen">
          <SelectTrigger
            class="w-full @md:w-auto cursor-pointer flex items-center justify-between gap-2 bg-transparent text-sm font-medium text-neutral-700 outline-none dark:text-neutral-300 border-0"
            aria-label="Select service type"
          >
            <SelectValue placeholder="All Services" />
            <Icon
              name="heroicons:chevron-down"
              :class="[
                'h-4 w-4 text-neutral-500 dark:text-neutral-400 transition-transform duration-200',
                isServiceDropdownOpen ? 'rotate-180' : ''
              ]"
            />
          </SelectTrigger>

          <SelectPortal>
            <SelectContent
              position="popper"
              :side-offset="8"
              class="z-50 rounded-2xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-800 overflow-hidden"
            >
              <SelectViewport class="p-1">
                <SelectItem
                  v-for="(service, index) in serviceDropdownValues"
                  :key="service.id ?? index"
                  :value="String(service.id ?? index)"
                  class="relative flex items-center px-4 py-3 text-sm font-medium text-neutral-900 dark:text-neutral-100 rounded-lg cursor-pointer outline-none select-none data-[highlighted]:bg-neutral-50 dark:data-[highlighted]:bg-neutral-700 data-[state=checked]:bg-blue-50 dark:data-[state=checked]:bg-blue-900/20"
                >
                  <SelectItemText>
                    {{ service.name }}
                  </SelectItemText>
                </SelectItem>
              </SelectViewport>
            </SelectContent>
          </SelectPortal>
        </SelectRoot>
      </div>

      <!-- Submit Button (Button Mode Only) -->
      <button
        v-if="isButtonMode"
        type="button"
        :class="buttonClasses"
        :disabled="searchQuery.trim().length === 0"
        @click="handleButtonClick"
        aria-label="Search"
      >
        <!-- When service dropdown is present: Always show text (full width button) -->
        <!-- When no service dropdown: Mobile shows icon, Desktop shows text -->
        <template v-if="hasServiceDropdown">
          <span>{{ button }}</span>
        </template>
        <template v-else>
          <!-- Mobile container (< 448px): Show Icon, Tablet/Desktop (≥ 448px): Hidden -->
          <Icon name="heroicons:magnifying-glass" class="@md:hidden h-5 w-5" />
          <!-- Mobile container (< 448px): Hidden, Tablet/Desktop (≥ 448px): Show Text -->
          <span class="@md:inline hidden">{{ button }}</span>
        </template>
      </button>
    </div>

    <!-- Autocomplete Dropdown -->
    <div
      v-if="showDropdown"
      :class="dropdownClasses"
    >
      <!-- Loading State -->
      <div v-if="isSearching" class="px-4 py-6 text-center">
        <Icon name="svg-spinners:ring-resize" class="mx-auto h-6 w-6 text-blue-500" />
      </div>

      <!-- Results List -->
      <div v-else-if="filteredResults.length > 0">
        <button
          v-for="(result, index) in filteredResults"
          :key="`${result.type}-${result.cityName}-${result.stateCode}-${result.zip || index}`"
          type="button"
          :data-result-index="index"
          :class="[
            'w-full px-4 py-3 text-left transition-colors',
            index === selectedIndex
              ? 'bg-blue-50 dark:bg-blue-900/20'
              : 'hover:bg-neutral-50 dark:hover:bg-neutral-700'
          ]"
          @click="selectResult(result)"
        >
          <div class="flex items-center gap-2">
            <!-- Location type icon -->
            <Icon
              :name="result.type === 'city' ? 'heroicons:building-office-2' : 'heroicons:map-pin'"
              class="h-4 w-4 flex-shrink-0 text-neutral-400"
            />
            <div>
              <div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {{ result.value }}
              </div>
              <div v-if="result.type === 'zip'" class="text-xs text-neutral-500 dark:text-neutral-400">
                ZIP: {{ result.zip }}
              </div>
            </div>
          </div>
        </button>
      </div>

      <!-- No Results Message -->
      <div v-else-if="showNoResults" class="px-4 py-6 text-center">
        <p class="text-sm text-neutral-500 dark:text-neutral-400">
          No results, try something else
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>

