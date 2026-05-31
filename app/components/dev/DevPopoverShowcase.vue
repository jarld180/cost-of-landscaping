<script setup lang="ts">
// Popover Component Showcase
</script>

<template>
  <ComponentSection
    title="Popover Component"
    component-name="Popover"
    description="Floating content panel that appears on trigger interaction"
  >
    <div class="space-y-8">
      <!-- Basic Popover -->
      <div>
        <h3 class="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
          Basic Popover
        </h3>
        <div class="flex flex-wrap gap-4">
          <Popover trigger-text="Open Popover">
            <div class="space-y-3">
              <h4 class="font-heading text-lg font-bold text-neutral-700 dark:text-neutral-200">
                Popover Title
              </h4>
              <p class="text-sm text-neutral-600 dark:text-neutral-300">
                This is a basic popover with some content inside. You can put any content here.
              </p>
            </div>
          </Popover>
        </div>
      </div>

      <!-- Different Sides -->
      <div>
        <h3 class="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
          Different Sides
        </h3>
        <div class="flex flex-wrap gap-4">
          <Popover trigger-text="Top" side="top">
            <p class="text-sm text-neutral-600 dark:text-neutral-300">Popover on top</p>
          </Popover>
          <Popover trigger-text="Right" side="right">
            <p class="text-sm text-neutral-600 dark:text-neutral-300">Popover on right</p>
          </Popover>
          <Popover trigger-text="Bottom" side="bottom">
            <p class="text-sm text-neutral-600 dark:text-neutral-300">Popover on bottom</p>
          </Popover>
          <Popover trigger-text="Left" side="left">
            <p class="text-sm text-neutral-600 dark:text-neutral-300">Popover on left</p>
          </Popover>
        </div>
      </div>

      <!-- Different Alignments -->
      <div>
        <h3 class="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
          Different Alignments
        </h3>
        <div class="flex flex-wrap gap-4">
          <Popover trigger-text="Start Align" align="start">
            <p class="text-sm text-neutral-600 dark:text-neutral-300">Aligned to start</p>
          </Popover>
          <Popover trigger-text="Center Align" align="center">
            <p class="text-sm text-neutral-600 dark:text-neutral-300">Aligned to center</p>
          </Popover>
          <Popover trigger-text="End Align" align="end">
            <p class="text-sm text-neutral-600 dark:text-neutral-300">Aligned to end</p>
          </Popover>
        </div>
      </div>

      <!-- Without Arrow -->
      <div>
        <h3 class="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
          Without Arrow
        </h3>
        <div class="flex flex-wrap gap-4">
          <Popover trigger-text="No Arrow" :show-arrow="false">
            <p class="text-sm text-neutral-600 dark:text-neutral-300">This popover has no arrow</p>
          </Popover>
        </div>
      </div>

      <!-- Custom Width -->
      <div>
        <h3 class="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
          Custom Width
        </h3>
        <div class="flex flex-wrap gap-4">
          <Popover trigger-text="Wide Popover" width="400px">
            <div class="space-y-3">
              <h4 class="font-heading text-lg font-bold text-neutral-700 dark:text-neutral-200">
                Wide Popover
              </h4>
              <p class="text-sm text-neutral-600 dark:text-neutral-300">
                This popover has a custom width of 400px. You can set any width you need for your content.
              </p>
            </div>
          </Popover>
        </div>
      </div>

      <!-- Custom Trigger -->
      <div>
        <h3 class="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
          Custom Trigger
        </h3>
        <div class="flex flex-wrap gap-4">
          <Popover>
            <template #trigger>
              <Button text="Custom Trigger Button" variant="secondary" />
            </template>
            <div class="space-y-3">
              <h4 class="font-heading text-lg font-bold text-neutral-700 dark:text-neutral-200">
                Custom Trigger
              </h4>
              <p class="text-sm text-neutral-600 dark:text-neutral-300">
                You can use any component as a trigger by using the trigger slot.
              </p>
            </div>
          </Popover>
        </div>
      </div>
    </div>
  </ComponentSection>
</template>

<style scoped>
</style>

