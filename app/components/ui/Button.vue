<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  /**
   * The text to display on the button
   */
  text: string

  /**
   * The size of the button
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg' | 'xl'

  /**
   * The route to navigate to when clicked. If null, button does nothing on click.
   * @default null
   */
  location?: string | null

  /**
   * The visual variant of the button
   * @default 'primary'
   */
  variant?: 'primary' | 'secondary' | 'primary-outline' | 'secondary-outline' | 'ghost'

  /**
   * Whether the button is disabled
   * @default false
   */
  disabled?: boolean

  /**
   * Whether the button is in a loading state
   * @default false
   */
  loading?: boolean

  /**
   * The button type attribute
   * @default 'button'
   */
  type?: 'button' | 'submit' | 'reset'

  /**
   * Optional icon name (uses Nuxt Icon)
   * When provided, displays on the right side of the button text
   * Example: 'heroicons:arrow-right'
   */
  icon?: string | null

  /**
   * Optional custom colors as [normalColor, hoverColor] hex values
   * Behavior depends on variant:
   * - primary/secondary: Uses colors as background (pill style with shadow)
   * - ghost: Uses colors as text colors (transparent background)
   * - outline variants: Uses colors for border and text
   * Example: ['#FFFFFF', '#C0C0C0']
   * @default null
   */
  colors?: [string, string] | null

  /**
   * Optional custom text colors as [normalColor, hoverColor] hex values
   * When provided, overrides the default text color for the button
   * Works with all variants, especially useful with custom background colors
   * Example: ['#000000', '#333333']
   * @default null
   */
  textColors?: [string, string] | null

  /**
   * The border width for outline variants
   * Only applies to primary-outline and secondary-outline variants
   * @default 'thick'
   */
  borderWidth?: 'thin' | 'thick'

  /**
   * Whether the link should open in a new tab
   * Only applies when location is provided
   * @default false
   */
  external?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  location: null,
  variant: 'primary',
  disabled: false,
  loading: false,
  type: 'button',
  icon: null,
  colors: null,
  textColors: null,
  borderWidth: 'thick',
  external: false
})

// Size classes for different button sizes
const sizeClasses = computed(() => {
  // Ghost variant has no horizontal padding
  if (props.variant === 'ghost') {
    const sizes = {
      sm: 'py-2 text-sm rounded-4xl',
      md: 'py-3 text-base rounded-4xl',
      lg: 'py-3 text-lg rounded-4xl',
      xl: 'py-4 text-xl rounded-4xl'
    }
    return sizes[props.size]
  }

  const sizes = {
    sm: 'px-4 py-2 text-sm rounded-4xl',
    md: 'px-6 py-3 text-base rounded-4xl',
    lg: 'px-8 py-3 text-lg rounded-4xl',
    xl: 'px-10 py-4 text-xl rounded-4xl'
  }
  return sizes[props.size]
})

// Icon size classes based on button size
const iconSizeClasses = computed(() => {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-7 w-7'
  }
  return sizes[props.size]
})

// Border width classes for outline variants
const borderWidthClasses = computed(() => {
  return props.borderWidth === 'thin' ? 'border' : 'border-2'
})

// Variant classes for primary and secondary styles
const variantClasses = computed(() => {
  // If custom colors are provided with primary or secondary variants, use pill style with custom colors
  if (props.colors && (props.variant === 'primary' || props.variant === 'secondary')) {
    return 'bg-[var(--btn-bg-color)] text-[var(--btn-text-color)] hover:bg-[var(--btn-hover-color)] hover:text-[var(--btn-text-hover-color)] transition-all shadow-md hover:shadow-lg'
  }

  // If custom colors are provided with ghost variant, use text-only style
  if (props.colors && props.variant === 'ghost') {
    return 'bg-transparent text-[var(--btn-color)] hover:text-[var(--btn-hover-color)] transition-colors'
  }

  // If custom colors are provided with outline variants, use custom border/text colors
  if (props.colors && (props.variant === 'primary-outline' || props.variant === 'secondary-outline')) {
    return `bg-transparent text-[var(--btn-color)] hover:bg-[var(--btn-hover-bg)] ${borderWidthClasses.value} border-[var(--btn-color)] hover:border-[var(--btn-hover-color)] transition-all`
  }

  // If only textColors is provided (no custom background colors), apply custom text colors to default variants
  if (props.textColors && !props.colors) {
    const baseVariants = {
      primary: `bg-blue-500 hover:bg-blue-600 active:bg-blue-700 shadow-md hover:shadow-lg text-[var(--btn-text-color)] hover:text-[var(--btn-text-hover-color)]`,
      secondary: `bg-neutral-200 hover:bg-neutral-300 active:bg-neutral-400 ${borderWidthClasses.value} border-neutral-300 hover:border-neutral-400 dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:active:bg-neutral-500 dark:border-neutral-600 dark:hover:border-neutral-500 text-[var(--btn-text-color)] hover:text-[var(--btn-text-hover-color)]`,
      'primary-outline': `bg-transparent hover:bg-blue-50 active:bg-blue-100 ${borderWidthClasses.value} border-blue-500 hover:border-blue-600 text-[var(--btn-text-color)] hover:text-[var(--btn-text-hover-color)]`,
      'secondary-outline': `bg-transparent hover:bg-neutral-100 active:bg-neutral-200 ${borderWidthClasses.value} border-neutral-400 hover:border-neutral-500 dark:hover:bg-neutral-800 dark:active:bg-neutral-700 dark:border-neutral-500 dark:hover:border-neutral-400 text-[var(--btn-text-color)] hover:text-[var(--btn-text-hover-color)]`,
      'ghost': `bg-transparent text-[var(--btn-text-color)] hover:text-[var(--btn-text-hover-color)] transition-colors`
    }
    return baseVariants[props.variant]
  }

  const variants = {
    primary: 'bg-blue-500 text-neutral-50 hover:bg-blue-600 active:bg-blue-700 shadow-md hover:shadow-lg',
    secondary: `bg-neutral-200 text-neutral-700 hover:bg-neutral-300 active:bg-neutral-400 ${borderWidthClasses.value} border-neutral-300 hover:border-neutral-400 dark:bg-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-600 dark:active:bg-neutral-500 dark:border-neutral-600 dark:hover:border-neutral-500`,
    'primary-outline': `bg-transparent text-blue-500 hover:bg-blue-50 active:bg-blue-100 ${borderWidthClasses.value} border-blue-500 hover:border-blue-600`,
    'secondary-outline': `bg-transparent text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200 ${borderWidthClasses.value} border-neutral-400 hover:border-neutral-500 dark:text-neutral-200 dark:hover:bg-neutral-800 dark:active:bg-neutral-700 dark:border-neutral-500 dark:hover:border-neutral-400`,
    'ghost': 'bg-transparent text-blue-500 hover:text-blue-600 active:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300'
  }
  return variants[props.variant]
})

// Custom styles for color overrides
const customStyles = computed(() => {
  const styles: Record<string, string> = {}

  // Handle custom background colors
  if (props.colors) {
    // For primary/secondary variants with custom colors: use colors as background
    if (props.variant === 'primary' || props.variant === 'secondary') {
      styles['--btn-bg-color'] = props.colors[0]
      styles['--btn-hover-color'] = props.colors[1]
      // Default text color (will be overridden by textColor if provided)
      styles['--btn-text-color'] = '#000000'
      styles['--btn-text-hover-color'] = '#000000'
    }

    // For ghost variant: use colors as text colors
    if (props.variant === 'ghost') {
      styles['--btn-color'] = props.colors[0]
      styles['--btn-hover-color'] = props.colors[1]
    }

    // For outline variants: use colors for border and text
    if (props.variant === 'primary-outline' || props.variant === 'secondary-outline') {
      styles['--btn-color'] = props.colors[0]
      styles['--btn-hover-color'] = props.colors[1]
      styles['--btn-hover-bg'] = `${props.colors[0]}10` // 10% opacity of the color
    }
  }

  // Handle custom text colors (overrides default text colors)
  if (props.textColors) {
    styles['--btn-text-color'] = props.textColors[0]
    styles['--btn-text-hover-color'] = props.textColors[1]
  }

  return styles
})

// Combined button classes
const buttonClasses = computed(() => {
  return [
    'font-bold transition-all duration-200',
    'focus:outline-none focus:ring-4 focus:ring-blue-300',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md',
    'inline-flex items-center justify-center text-center no-underline',
    'leading-none',
    props.icon ? 'gap-2' : '',
    sizeClasses.value,
    variantClasses.value
  ].filter(Boolean).join(' ')
})

// Determine if this should be a link or button
const isLink = computed(() => props.location && !props.disabled)
</script>

<template>
  <Primitive
    v-if="isLink"
    as-child
  >
    <NuxtLink
      :to="location!"
      :target="external ? '_blank' : undefined"
      :rel="external ? 'noopener noreferrer' : undefined"
      :class="buttonClasses"
      :style="customStyles"
    >
      {{ text }}
      <Icon v-if="icon" :name="icon" :class="iconSizeClasses" />
    </NuxtLink>
  </Primitive>

  <button
    v-else
    :type="type"
    :disabled="disabled || loading"
    :class="buttonClasses"
    :style="customStyles"
  >
    <Icon
      v-if="loading"
      name="svg-spinners:ring-resize"
      :class="iconSizeClasses"
    />
    <span v-if="!loading">{{ text }}</span>
    <span v-else>{{ text }}</span>
    <Icon v-if="icon && !loading" :name="icon" :class="iconSizeClasses" />
  </button>
</template>

<style scoped>
</style>

