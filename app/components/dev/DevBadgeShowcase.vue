<script setup lang="ts">
// Badge component showcase demonstrating all variants and sizes
</script>

<template>
  <ComponentSection
    title="Badge Component"
    component-name="Badge"
    description="Pill-shaped label component with outline variants for tags and status indicators"
  >
    <div class="space-y-8">
      <!-- Standard Variants -->
      <div>
        <h3 class="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
          Standard Variants
        </h3>
        <div class="@5xl:grid-cols-2 grid grid-cols-1 gap-8">
          <DevBadgeVariantCard
            variant-title="Primary Outline Variant"
            variant="primary-outline"
            sample-text="Featured"
          />

          <DevBadgeVariantCard
            variant-title="Secondary Outline Variant"
            variant="secondary-outline"
            sample-text="New"
          />
        </div>
      </div>

      <!-- Ghost Variant -->
      <div>
        <h3 class="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
          Ghost Variant
        </h3>
        <div class="@5xl:grid-cols-2 grid grid-cols-1 gap-8">
          <DevBadgeVariantCard
            variant-title="Ghost Variant"
            variant="ghost"
            sample-text="Top Rated"
          />

          <DevBadgeVariantCard
            variant-title="Ghost Variant with Icon"
            variant="ghost"
            sample-text="Top Rated"
            icon="heroicons:check-circle"
          />
        </div>
      </div>

      <!-- Badges with Icons -->
      <div>
        <h3 class="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
          Badges with Icons
        </h3>
        <div class="@5xl:grid-cols-2 grid grid-cols-1 gap-8">
          <DevBadgeVariantCard
            variant-title="Primary with Icon"
            variant="primary-outline"
            sample-text="Verified"
            icon="heroicons:check-circle"
          />

          <DevBadgeVariantCard
            variant-title="Secondary with Icon"
            variant="secondary-outline"
            sample-text="Premium"
            icon="heroicons:star"
          />
        </div>
      </div>

      <!-- Border Thickness & Custom Colors - 2 Column Layout on Desktop -->
      <div class="@5xl:grid-cols-2 grid grid-cols-1 gap-8">
        <!-- Border Thickness -->
        <div>
          <h3 class="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
            Border Thickness
          </h3>
          <div class="rounded-lg border border-neutral-300 bg-white p-6 dark:border-neutral-600 dark:bg-neutral-800">
            <div class="space-y-4">
              <div>
                <h4 class="mb-2 text-sm font-medium text-neutral-600 dark:text-neutral-400">Thick Border (Default - 2px)</h4>
                <div class="flex flex-wrap gap-3">
                  <Badge text="Primary" variant="primary-outline" borderWidth="thick" size="sm" />
                  <Badge text="Secondary" variant="secondary-outline" borderWidth="thick" size="md" />
                  <Badge text="Ghost" variant="ghost" borderWidth="thick" size="lg" />
                </div>
              </div>
              <div>
                <h4 class="mb-2 text-sm font-medium text-neutral-600 dark:text-neutral-400">Thin Border (1px)</h4>
                <div class="flex flex-wrap gap-3">
                  <Badge text="Primary" variant="primary-outline" borderWidth="thin" size="sm" />
                  <Badge text="Secondary" variant="secondary-outline" borderWidth="thin" size="md" />
                  <Badge text="Ghost" variant="ghost" borderWidth="thin" size="lg" />
                </div>
              </div>
              <div>
                <h4 class="mb-2 text-sm font-medium text-neutral-600 dark:text-neutral-400">Border Comparison with Icons</h4>
                <div class="flex flex-wrap gap-3">
                  <Badge text="Thick" variant="primary-outline" borderWidth="thick" icon="heroicons:check-circle" />
                  <Badge text="Thin" variant="primary-outline" borderWidth="thin" icon="heroicons:check-circle" />
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
            <div class="space-y-4">
              <div>
                <h4 class="mb-2 text-sm font-medium text-neutral-600 dark:text-neutral-400">Custom Red Badge</h4>
                <div class="flex flex-wrap gap-3">
                  <Badge text="Error" :color="['#DC2626', '#EF4444']" size="sm" />
                  <Badge text="Critical" :color="['#DC2626', '#EF4444']" size="md" />
                  <Badge text="Alert" :color="['#DC2626', '#EF4444']" size="lg" icon="heroicons:exclamation-triangle" />
                </div>
              </div>
              <div>
                <h4 class="mb-2 text-sm font-medium text-neutral-600 dark:text-neutral-400">Custom Green Badge</h4>
                <div class="flex flex-wrap gap-3">
                  <Badge text="Success" :color="['#059669', '#10B981']" size="sm" />
                  <Badge text="Verified" :color="['#059669', '#10B981']" size="md" icon="heroicons:check-circle" />
                  <Badge text="Approved" :color="['#059669', '#10B981']" size="lg" />
                </div>
              </div>
              <div>
                <h4 class="mb-2 text-sm font-medium text-neutral-600 dark:text-neutral-400">Custom Purple Badge</h4>
                <div class="flex flex-wrap gap-3">
                  <Badge text="Premium" :color="['#7C3AED', '#A855F7']" size="sm" icon="heroicons:star" />
                  <Badge text="VIP" :color="['#7C3AED', '#A855F7']" size="md" />
                  <Badge text="Exclusive" :color="['#7C3AED', '#A855F7']" size="lg" icon="heroicons:sparkles" />
                </div>
              </div>
              <div>
                <h4 class="mb-2 text-sm font-medium text-neutral-600 dark:text-neutral-400">Custom Colors with Border Options</h4>
                <div class="flex flex-wrap gap-3">
                  <Badge text="Thick" :color="['#F59E0B', '#FBBF24']" borderWidth="thick" />
                  <Badge text="Thin" :color="['#F59E0B', '#FBBF24']" borderWidth="thin" />
                  <Badge text="Thick Icon" :color="['#8B5CF6', '#A78BFA']" borderWidth="thick" icon="heroicons:star" />
                  <Badge text="Thin Icon" :color="['#8B5CF6', '#A78BFA']" borderWidth="thin" icon="heroicons:star" />
                </div>
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
          <div class="flex flex-wrap gap-3">
            <Badge text="Featured" variant="primary-outline" size="md" />
            <Badge text="New" variant="secondary-outline" size="md" borderWidth="thin" />
            <Badge text="Top Rated" variant="ghost" size="md" icon="heroicons:check-circle" />
            <Badge text="Verified" variant="primary-outline" size="md" icon="heroicons:shield-check" borderWidth="thin" />
            <Badge text="Premium" variant="secondary-outline" size="sm" icon="heroicons:star" />
            <Badge text="Best Seller" variant="ghost" size="lg" icon="heroicons:fire" borderWidth="thin" />
            <Badge text="Custom" :color="['#F59E0B', '#FBBF24']" size="md" icon="material-symbols:electric-bolt" />
            <Badge text="Custom Thin" :color="['#EC4899', '#F472B6']" size="md" borderWidth="thin" />
          </div>
        </div>
      </div>
    </div>
  </ComponentSection>
</template>

<style scoped>
</style>

