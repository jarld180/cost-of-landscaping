<script setup lang="ts">
interface Props {
  title?: string
  description?: string
  variant?: 'primary' | 'secondary' | 'success'
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Test Card Component',
  description: 'This is a test component demonstrating Tailwind CSS styling in Nuxt 4',
  variant: 'primary'
})

const variantClasses = computed(() => {
  const variants = {
    primary: 'border-blue-400 bg-blue-50',
    secondary: 'border-neutral-500 bg-neutral-100',
    success: 'border-blue-200 bg-blue-50'
  }
  return variants[props.variant]
})

const badgeClasses = computed(() => {
  const badges = {
    primary: 'bg-blue-500 text-neutral-50',
    secondary: 'bg-neutral-600 text-neutral-50',
    success: 'bg-blue-200 text-neutral-50'
  }
  return badges[props.variant]
})
</script>

<template>
  <div
    class="rounded-lg border-2 p-6 shadow-md hover:shadow-lg transition-shadow duration-300"
    :class="variantClasses"
  >
    <div class="flex items-start justify-between mb-4">
      <h3 class="text-xl font-semibold font-heading text-neutral-700">
        {{ title }}
      </h3>
      <span
        class="px-3 py-1 rounded-full text-xs font-medium"
        :class="badgeClasses"
      >
        {{ variant }}
      </span>
    </div>

    <p class="text-neutral-600 mb-4">
      {{ description }}
    </p>

    <div class="flex gap-3">
      <button
        class="px-4 py-2 bg-blue-500 text-neutral-50 rounded-md hover:bg-blue-600 transition-colors duration-200 font-medium"
      >
        Primary Action
      </button>
      <button
        class="px-4 py-2 border-2 border-neutral-300 text-neutral-600 rounded-md hover:border-neutral-400 hover:bg-neutral-100 transition-all duration-200 font-medium"
      >
        Secondary
      </button>
    </div>

    <div class="mt-6 pt-4 border-t border-neutral-300">
      <div class="grid grid-cols-3 gap-4 text-center">
        <div>
          <p class="text-2xl font-bold font-tight text-neutral-700">42</p>
          <p class="text-sm text-neutral-500">Projects</p>
        </div>
        <div>
          <p class="text-2xl font-bold font-tight text-neutral-700">1.2k</p>
          <p class="text-sm text-neutral-500">Users</p>
        </div>
        <div>
          <p class="text-2xl font-bold font-tight text-neutral-700">98%</p>
          <p class="text-sm text-neutral-500">Success</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>

