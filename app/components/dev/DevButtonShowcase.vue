<script setup lang="ts">
// Button Component Showcase
</script>

<template>
  <ComponentSection
    title="Button Component"
    component-name="Button"
    description="Versatile button component with multiple variants and sizes for all your UI needs"
  >
    <div class="space-y-8">
      <!-- Standard Variants -->
      <div>
        <h3 class="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
          Standard Variants
        </h3>
        <div class="@5xl:grid-cols-2 grid grid-cols-1 gap-8">
          <DevButtonVariantCard
            variant-title="Primary Variant"
            variant="primary"
            sample-text="For Contractors"
          />

          <DevButtonVariantCard
            variant-title="Primary Outline Variant"
            variant="primary-outline"
            sample-text="View Contractors"
          />

          <DevButtonVariantCard
            variant-title="Secondary Variant"
            variant="secondary"
            sample-text="Learn More"
          />

          <DevButtonVariantCard
            variant-title="Secondary Outline Variant"
            variant="secondary-outline"
            sample-text="Learn More"
          />
        </div>
      </div>

      <!-- Ghost Variant -->
      <div>
        <h3 class="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
          Ghost Variant
        </h3>
        <div class="@5xl:grid-cols-2 grid grid-cols-1 gap-8">
          <DevButtonVariantCard
            variant-title="Ghost Variant"
            variant="ghost"
            sample-text="Learn More"
          />

          <DevButtonVariantCard
            variant-title="Ghost Variant with Icon"
            variant="ghost"
            sample-text="View Profile"
            icon="heroicons:arrow-right"
          />
        </div>
      </div>

      <!-- Buttons with Icons -->
      <div>
        <h3 class="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
          Buttons with Icons
        </h3>
        <div class="@5xl:grid-cols-2 grid grid-cols-1 gap-8">
          <DevButtonVariantCard
            variant-title="Primary with Icon"
            variant="primary"
            sample-text="View Profile"
            icon="heroicons:arrow-right"
          />

          <DevButtonVariantCard
            variant-title="Primary Outline with Icon"
            variant="primary-outline"
            sample-text="Get Started"
            icon="heroicons:arrow-right"
          />
        </div>
      </div>

      <!-- Border Width Options -->
      <div>
        <h3 class="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
          Border Width Options
        </h3>
        <div class="rounded-lg border border-neutral-300 bg-white p-6 dark:border-neutral-600 dark:bg-neutral-800">
          <div class="space-y-6">
            <div>
              <h4 class="mb-3 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Primary Outline</h4>
              <div class="flex flex-wrap gap-4">
                <Button text="Thick (Default)" variant="primary-outline" borderWidth="thick" size="md" />
                <Button text="Thin" variant="primary-outline" borderWidth="thin" size="md" />
                <Button text="Thick with Icon" variant="primary-outline" borderWidth="thick" icon="heroicons:arrow-right" size="md" />
                <Button text="Thin with Icon" variant="primary-outline" borderWidth="thin" icon="heroicons:arrow-right" size="md" />
              </div>
            </div>
            <div>
              <h4 class="mb-3 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Secondary Outline</h4>
              <div class="flex flex-wrap gap-4">
                <Button text="Thick (Default)" variant="secondary-outline" borderWidth="thick" size="md" />
                <Button text="Thin" variant="secondary-outline" borderWidth="thin" size="md" />
                <Button text="Thick with Icon" variant="secondary-outline" borderWidth="thick" icon="heroicons:arrow-right" size="md" />
                <Button text="Thin with Icon" variant="secondary-outline" borderWidth="thin" icon="heroicons:arrow-right" size="md" />
              </div>
            </div>
            <div>
              <h4 class="mb-3 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Secondary Variant</h4>
              <div class="flex flex-wrap gap-4">
                <Button text="Thick (Default)" variant="secondary" borderWidth="thick" size="md" />
                <Button text="Thin" variant="secondary" borderWidth="thin" size="md" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Custom Colors -->
      <div>
        <h3 class="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
          Custom Colors
        </h3>
        <div class="rounded-lg border border-neutral-300 bg-white p-6 dark:border-neutral-600 dark:bg-neutral-800">
          <div class="space-y-6">
            <!-- Primary variant with custom colors (pill style) -->
            <div>
              <p class="mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                Primary variant with custom colors (Pill style with shadow)
              </p>
              <p class="mb-3 text-xs text-neutral-500 dark:text-neutral-400">
                Uses custom colors as background, maintains pill shape and shadow
              </p>
              <div class="flex flex-wrap gap-4">
                <Button
                  text="Get Listed Now"
                  variant="primary"
                  :colors="['#FFFFFF', '#C0C0C0']"
                  :textColors="['#000000', '#333333']"
                  size="lg"
                />
                <Button
                  text="Custom Red"
                  variant="primary"
                  :colors="['#FF5733', '#C70039']"
                  :textColors="['#FFFFFF', '#E0E0E0']"
                  size="md"
                />
                <Button
                  text="Custom Green"
                  variant="primary"
                  :colors="['#28A745', '#1E7E34']"
                  :textColors="['#FFFFFF', '#E0E0E0']"
                  icon="heroicons:check-circle"
                  size="md"
                />
              </div>
            </div>

            <!-- Primary variant with textColors only -->
            <div>
              <p class="mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                Primary variant with custom text colors only
              </p>
              <p class="mb-3 text-xs text-neutral-500 dark:text-neutral-400">
                Uses default blue background with custom text colors
              </p>
              <div class="flex flex-wrap gap-4">
                <Button
                  text="White Text"
                  variant="primary"
                  :textColors="['#FFFFFF', '#E0E0E0']"
                  size="md"
                />
                <Button
                  text="Yellow Text"
                  variant="primary"
                  :textColors="['#FFD700', '#FFA500']"
                  size="md"
                />
              </div>
            </div>

            <!-- Secondary variant with custom colors -->
            <div>
              <p class="mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                Secondary variant with custom colors
              </p>
              <p class="mb-3 text-xs text-neutral-500 dark:text-neutral-400">
                Uses custom colors as background with secondary styling
              </p>
              <div class="flex flex-wrap gap-4">
                <Button
                  text="Custom Button"
                  variant="secondary"
                  :colors="['#FFD700', '#FFA500']"
                  size="md"
                />
                <Button
                  text="Purple Button"
                  variant="secondary"
                  :colors="['#9B59B6', '#8E44AD']"
                  size="md"
                />
              </div>
            </div>

            <!-- Ghost variant with custom colors (text only) -->
            <div>
              <p class="mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                Ghost variant with custom colors (Text only)
              </p>
              <p class="mb-3 text-xs text-neutral-500 dark:text-neutral-400">
                Uses custom colors as text colors, transparent background
              </p>
              <div class="flex flex-wrap gap-4">
                <Button
                  text="View Profile"
                  variant="ghost"
                  :colors="['#FFFFFF', '#C0C0C0']"
                  icon="heroicons:arrow-right"
                  size="md"
                />
                <Button
                  text="Delete"
                  variant="ghost"
                  :colors="['#FF5733', '#C70039']"
                  icon="heroicons:trash"
                  size="md"
                />
                <Button
                  text="Success"
                  variant="ghost"
                  :colors="['#28A745', '#1E7E34']"
                  icon="heroicons:check-circle"
                  size="md"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Mixed Examples -->
      <div>
        <h3 class="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
          Mixed Examples
        </h3>
        <div class="rounded-lg border border-neutral-300 bg-white p-6 dark:border-neutral-600 dark:bg-neutral-800">
          <div class="flex flex-wrap gap-4">
            <Button text="For Contractors" variant="primary" size="md" />
            <Button text="View Profile" variant="primary" size="md" icon="heroicons:arrow-right" />
            <Button text="Learn More" variant="secondary" size="md" />
            <Button text="Get Started" variant="primary-outline" size="md" icon="heroicons:arrow-right" />
            <Button text="View Details" variant="ghost" size="md" icon="heroicons:arrow-right" />
            <Button text="Contact Us" variant="secondary-outline" size="sm" borderWidth="thin" />
            <Button text="Thin Border" variant="primary-outline" borderWidth="thin" size="md" />
            <Button text="Custom" variant="ghost" :colors="['#FF5733', '#C70039']" size="md" />
          </div>
        </div>
      </div>
    </div>
  </ComponentSection>
</template>

<style scoped>
</style>

