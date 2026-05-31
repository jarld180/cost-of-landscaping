<script setup lang="ts">
// Divider Component Showcase
</script>

<template>
  <ComponentSection
    title="Divider Component"
    component-name="Divider"
    description="Horizontal or vertical separator with customizable spacing and styles"
  >
    <div class="space-y-8">
      <!-- Horizontal Dividers -->
      <div>
        <h3 class="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
          Horizontal Dividers
        </h3>
        <div class="space-y-6">
          <!-- No Spacing -->
          <div>
            <p class="mb-2 text-xs text-neutral-500 dark:text-neutral-400">No Spacing</p>
            <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800">
              <p class="text-sm text-neutral-600 dark:text-neutral-300">Content above</p>
              <Divider />
              <p class="text-sm text-neutral-600 dark:text-neutral-300">Content below</p>
            </div>
          </div>

          <!-- Small Spacing -->
          <div>
            <p class="mb-2 text-xs text-neutral-500 dark:text-neutral-400">Small Spacing</p>
            <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800">
              <p class="text-sm text-neutral-600 dark:text-neutral-300">Content above</p>
              <Divider spacing="sm" />
              <p class="text-sm text-neutral-600 dark:text-neutral-300">Content below</p>
            </div>
          </div>

          <!-- Medium Spacing -->
          <div>
            <p class="mb-2 text-xs text-neutral-500 dark:text-neutral-400">Medium Spacing</p>
            <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800">
              <p class="text-sm text-neutral-600 dark:text-neutral-300">Content above</p>
              <Divider spacing="md" />
              <p class="text-sm text-neutral-600 dark:text-neutral-300">Content below</p>
            </div>
          </div>

          <!-- Large Spacing -->
          <div>
            <p class="mb-2 text-xs text-neutral-500 dark:text-neutral-400">Large Spacing</p>
            <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800">
              <p class="text-sm text-neutral-600 dark:text-neutral-300">Content above</p>
              <Divider spacing="lg" />
              <p class="text-sm text-neutral-600 dark:text-neutral-300">Content below</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Divider Variants -->
      <div>
        <h3 class="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
          Divider Variants
        </h3>
        <div class="space-y-6">
          <!-- Solid -->
          <div>
            <p class="mb-2 text-xs text-neutral-500 dark:text-neutral-400">Solid (Default)</p>
            <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800">
              <p class="text-sm text-neutral-600 dark:text-neutral-300">Content above</p>
              <Divider spacing="md" variant="solid" />
              <p class="text-sm text-neutral-600 dark:text-neutral-300">Content below</p>
            </div>
          </div>

          <!-- Dashed -->
          <div>
            <p class="mb-2 text-xs text-neutral-500 dark:text-neutral-400">Dashed</p>
            <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800">
              <p class="text-sm text-neutral-600 dark:text-neutral-300">Content above</p>
              <Divider spacing="md" variant="dashed" />
              <p class="text-sm text-neutral-600 dark:text-neutral-300">Content below</p>
            </div>
          </div>

          <!-- Dotted -->
          <div>
            <p class="mb-2 text-xs text-neutral-500 dark:text-neutral-400">Dotted</p>
            <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800">
              <p class="text-sm text-neutral-600 dark:text-neutral-300">Content above</p>
              <Divider spacing="md" variant="dotted" />
              <p class="text-sm text-neutral-600 dark:text-neutral-300">Content below</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Vertical Dividers -->
      <div>
        <h3 class="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
          Vertical Dividers
        </h3>
        <div class="space-y-6">
          <!-- No Spacing -->
          <div>
            <p class="mb-2 text-xs text-neutral-500 dark:text-neutral-400">No Spacing</p>
            <div class="flex h-24 items-center rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800">
              <p class="text-sm text-neutral-600 dark:text-neutral-300">Left</p>
              <Divider orientation="vertical" />
              <p class="text-sm text-neutral-600 dark:text-neutral-300">Right</p>
            </div>
          </div>

          <!-- Small Spacing -->
          <div>
            <p class="mb-2 text-xs text-neutral-500 dark:text-neutral-400">Small Spacing</p>
            <div class="flex h-24 items-center rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800">
              <p class="text-sm text-neutral-600 dark:text-neutral-300">Left</p>
              <Divider orientation="vertical" spacing="sm" />
              <p class="text-sm text-neutral-600 dark:text-neutral-300">Right</p>
            </div>
          </div>

          <!-- Medium Spacing -->
          <div>
            <p class="mb-2 text-xs text-neutral-500 dark:text-neutral-400">Medium Spacing</p>
            <div class="flex h-24 items-center rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800">
              <p class="text-sm text-neutral-600 dark:text-neutral-300">Left</p>
              <Divider orientation="vertical" spacing="md" />
              <p class="text-sm text-neutral-600 dark:text-neutral-300">Right</p>
            </div>
          </div>

          <!-- Large Spacing -->
          <div>
            <p class="mb-2 text-xs text-neutral-500 dark:text-neutral-400">Large Spacing</p>
            <div class="flex h-24 items-center rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800">
              <p class="text-sm text-neutral-600 dark:text-neutral-300">Left</p>
              <Divider orientation="vertical" spacing="lg" />
              <p class="text-sm text-neutral-600 dark:text-neutral-300">Right</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Vertical Variants -->
      <div>
        <h3 class="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
          Vertical Divider Variants
        </h3>
        <div class="space-y-6">
          <!-- Solid -->
          <div>
            <p class="mb-2 text-xs text-neutral-500 dark:text-neutral-400">Solid (Default)</p>
            <div class="flex h-24 items-center rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800">
              <p class="text-sm text-neutral-600 dark:text-neutral-300">Left</p>
              <Divider orientation="vertical" spacing="md" variant="solid" />
              <p class="text-sm text-neutral-600 dark:text-neutral-300">Right</p>
            </div>
          </div>

          <!-- Dashed -->
          <div>
            <p class="mb-2 text-xs text-neutral-500 dark:text-neutral-400">Dashed</p>
            <div class="flex h-24 items-center rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800">
              <p class="text-sm text-neutral-600 dark:text-neutral-300">Left</p>
              <Divider orientation="vertical" spacing="md" variant="dashed" />
              <p class="text-sm text-neutral-600 dark:text-neutral-300">Right</p>
            </div>
          </div>

          <!-- Dotted -->
          <div>
            <p class="mb-2 text-xs text-neutral-500 dark:text-neutral-400">Dotted</p>
            <div class="flex h-24 items-center rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800">
              <p class="text-sm text-neutral-600 dark:text-neutral-300">Left</p>
              <Divider orientation="vertical" spacing="md" variant="dotted" />
              <p class="text-sm text-neutral-600 dark:text-neutral-300">Right</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </ComponentSection>
</template>

<style scoped>
</style>

