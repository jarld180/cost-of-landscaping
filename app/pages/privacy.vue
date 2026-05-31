<script setup lang="ts">
definePageMeta({ layout: 'default' })
useSeoMeta({
  title: 'Privacy Policy — Cost of Landscaping',
  description: 'Privacy policy for CostOflandscaping.com — how we collect, use, and protect your information.',
  robots: 'noindex'
})
const currentYear = new Date().getFullYear()
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
    <h1 class="font-heading mb-8 text-3xl font-bold text-neutral-900 dark:text-white">Privacy Policy</h1>
    <p class="mb-6 text-sm text-neutral-500">Last updated: April 2026</p>

    <div class="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-neutral-700 dark:text-neutral-300">
      <section>
        <h2 class="text-xl font-semibold text-neutral-900 dark:text-white">Information We Collect</h2>
        <p>We collect information you provide directly to us, such as when you submit a quote request, contact a contractor, or leave a review. This includes your name, email address, phone number, and project details.</p>
        <p>We also collect information automatically when you use the site, including your IP address, browser type, pages visited, and referring URLs via standard web analytics.</p>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-neutral-900 dark:text-white">How We Use Your Information</h2>
        <ul class="list-disc pl-6 space-y-1">
          <li>To connect you with landscape pros in your area</li>
          <li>To send confirmation emails for review submissions</li>
          <li>To improve the site and contractor directory</li>
          <li>To detect and prevent fraudulent reviews or spam</li>
        </ul>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-neutral-900 dark:text-white">Information Sharing</h2>
        <p>We share your contact information with contractors only when you explicitly request a quote or contact. We do not sell your personal information to third parties.</p>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-neutral-900 dark:text-white">Cookies</h2>
        <p>We use cookies and similar technologies for analytics (tracking page visits and usage patterns) and to maintain session state. You can disable cookies in your browser settings, though some site features may not function correctly.</p>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-neutral-900 dark:text-white">Contact</h2>
        <p>Questions about this policy? Email us at <a href="mailto:hello@costoflandscaping.com" class="text-blue-600 hover:underline">hello@costoflandscaping.com</a>.</p>
      </section>
    </div>

    <p class="mt-12 text-xs text-neutral-400">© {{ currentYear }} Cost of Landscaping. All rights reserved.</p>
  </div>
</template>
