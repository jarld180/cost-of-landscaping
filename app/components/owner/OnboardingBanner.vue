<template>
  <div class="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-5 dark:border-blue-800 dark:bg-blue-900/20">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex gap-3">
        <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
          <Icon name="heroicons:shield-check" class="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 class="text-base font-semibold text-blue-950 dark:text-blue-100">
            Finish setting up your verified badge
          </h2>
          <p class="mt-1 text-sm text-blue-800 dark:text-blue-300">
            Add the badge to your website to get your profile verified and improve your trust signal with homeowners.
          </p>
        </div>
      </div>
      <Button text="Continue setup" location="/owner/onboarding" size="sm" />
    </div>
  </div>
</template>
