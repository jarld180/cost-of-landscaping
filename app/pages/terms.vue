<script setup lang="ts">
definePageMeta({ layout: 'default' })
useSeoMeta({
  title: 'Terms & Conditions — Cost of Landscaping',
  description: 'Terms and conditions for using CostOflandscaping.com.',
  robots: 'noindex'
})
const currentYear = new Date().getFullYear()
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
    <h1 class="font-heading mb-8 text-3xl font-bold text-neutral-900 dark:text-white">Terms &amp; Conditions</h1>
    <p class="mb-6 text-sm text-neutral-500">Last updated: April 2026</p>

    <div class="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-neutral-700 dark:text-neutral-300">
      <section>
        <h2 class="text-xl font-semibold text-neutral-900 dark:text-white">Acceptance of Terms</h2>
        <p>By accessing or using CostOflandscaping.com, you agree to be bound by these Terms &amp; Conditions. If you do not agree, do not use the site.</p>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-neutral-900 dark:text-white">Use of the Site</h2>
        <p>Cost of Landscaping is a directory service that connects homeowners with landscape pros. We do not guarantee the quality, licensing, or availability of any contractor listed on the site. Always verify contractor credentials independently before hiring.</p>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-neutral-900 dark:text-white">Reviews</h2>
        <p>Reviews submitted on Cost of Landscaping represent the opinions of the reviewer. We reserve the right to remove reviews that are fraudulent, abusive, or violate our policies. Contractors may not pay to remove or suppress legitimate reviews.</p>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-neutral-900 dark:text-white">Contractor Listings</h2>
        <p>Contractor information is provided for informational purposes only. Listing on this site does not constitute endorsement. Verified badges indicate documentation has been reviewed at a specific point in time and may not reflect current status.</p>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-neutral-900 dark:text-white">Limitation of Liability</h2>
        <p>Cost of Landscaping is not liable for any damages arising from your use of this site or reliance on contractor information provided. All decisions to hire a contractor are made at your own risk.</p>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-neutral-900 dark:text-white">Contact</h2>
        <p>Questions? Email <a href="mailto:hello@costoflandscaping.com" class="text-blue-600 hover:underline">hello@costoflandscaping.com</a>.</p>
      </section>
    </div>

    <p class="mt-12 text-xs text-neutral-400">© {{ currentYear }} Cost of Landscaping. All rights reserved.</p>
  </div>
</template>
