<script setup lang="ts">
import { toast } from 'vue-sonner'
import { getStateBySlug } from '~/utils/usStates'

/**
 * Contractor Profile Page
 * Route: /[state]/[city]/landscapers/[slug]
 *
 * SEO-optimized URL with LocalBusiness schema
 */

// Note: State validation is handled at route level via regex pattern in nuxt.config.ts
definePageMeta({
  layout: 'default',
})

const route = useRoute()
const stateSlug = computed(() => route.params.state as string)
const citySlug = computed(() => route.params.city as string)
const contractorSlug = computed(() => route.params.slug as string)

// Get state data
const stateData = computed(() => getStateBySlug(stateSlug.value))

// Fetch contractor data
const { data: contractor, error } = await useFetch(
  () => `/api/public/contractors/${citySlug.value}/${contractorSlug.value}`
)

// 404 if not found
if (error.value || !contractor.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Contractor Not Found',
    message: `The contractor "${contractorSlug.value}" was not found in ${citySlug.value}.`
  })
}

// Apply SEO with LocalBusiness schema
useContractorSeo({
  companyName: contractor.value.companyName,
  slug: contractor.value.slug,
  cityName: contractor.value.cityName,
  citySlug: citySlug.value,
  stateCode: contractor.value.stateCode,
  stateSlug: stateSlug.value,
  description: contractor.value.description,
  rating: contractor.value.rating,
  reviewCount: contractor.value.reviewCount,
  phone: contractor.value.phone,
  email: contractor.value.email,
  website: contractor.value.website,
  streetAddress: contractor.value.streetAddress,
  postalCode: contractor.value.postalCode,
  lat: contractor.value.lat,
  lng: contractor.value.lng,
  images: contractor.value.images || [],
  categories: contractor.value.categories || []
})

// Breadcrumbs with SEO-optimized URLs (Home is added automatically by Breadcrumbs component)
const breadcrumbs = computed(() => [
  { id: 'state', title: stateData.value?.name || '', full_path: `/${stateSlug.value}` },
  { id: 'city', title: `${contractor.value?.cityName} Contractors`, full_path: `/${stateSlug.value}/${citySlug.value}/landscapers` },
  { id: 'contractor', title: contractor.value?.companyName || '', full_path: `/${stateSlug.value}/${citySlug.value}/landscapers/${contractorSlug.value}` }
])

// Tabs
const tabs = ['Overview', 'Products & Services', 'Photos', 'Reviews']
const activeTab = ref('Overview')

// Show confirmation toast when redirected back from email confirm link
onMounted(() => {
  if (route.query.review === 'confirmed') {
    activeTab.value = 'Reviews'
    toast.success('Your review is live! Thanks for sharing your experience.')
    const url = new URL(window.location.href)
    url.searchParams.delete('review')
    window.history.replaceState({}, '', url.toString())
  }
})

// Supabase client for building storage URLs
const supabase = useSupabaseClient()

// Build image URL from storage path
function buildImageUrl(storagePath: string): string {
  const { data } = supabase.storage.from('contractors').getPublicUrl(storagePath)
  return data.publicUrl
}

// Get images from API response
const images = computed<string[]>(() => contractor.value?.images || [])
const heroImage = computed(() => images.value.length > 0 ? buildImageUrl(images.value[0]) : undefined)

// Get categories
const categories = computed(() => contractor.value?.categories || [])

// Get social links
const socialLinks = computed(() => contractor.value?.socialLinks || {})
const hasSocialLinks = computed(() => {
  const links = socialLinks.value
  return Object.values(links).some(v => v && v !== 'null')
})

// Get opening hours (stored as array of {day, hours} objects)
const openingHours = computed(() => contractor.value?.openingHours || [])

// Check if we have valid hours to display
const hasHours = computed(() => {
  const hours = openingHours.value
  return Array.isArray(hours) && hours.length > 0
})

// Format opening hours for display (shows first day as preview)
const formattedHours = computed(() => {
  const hours = openingHours.value
  // Handle array format: [{day: "Monday", hours: "7 AM to 7 PM"}, ...]
  if (Array.isArray(hours) && hours.length > 0) {
    const firstEntry = hours[0]
    if (firstEntry && typeof firstEntry === 'object' && 'hours' in firstEntry) {
      return firstEntry.hours
    }
  }
  // Handle empty or missing hours
  if (!hours || (Array.isArray(hours) && hours.length === 0)) {
    return 'Hours not available'
  }
  return 'Hours vary'
})

// Categories display state
const categoriesExpanded = ref(false)
const maxVisibleCategories = 6
const visibleCategories = computed(() => {
  if (categoriesExpanded.value) return categories.value
  return categories.value.slice(0, maxVisibleCategories)
})
const hiddenCategoriesCount = computed(() => {
  return Math.max(0, categories.value.length - maxVisibleCategories)
})

// Rating stars count
const filledStars = computed(() => {
  const rating = contractor.value?.rating
  if (!rating) return 0
  return Math.round(rating)
})

// Contact form state
const fullName = ref<string | null>(null)
const email = ref<string | null>(null)
const phone = ref<string | null>(null)
const projectDetails = ref<string | null>(null)
const isSubmittingContact = ref(false)
const contactSuccess = ref(false)
const contactError = ref<string | null>(null)

async function submitContact() {
  if (!fullName.value?.trim() || !email.value?.trim()) {
    contactError.value = 'Name and email are required.'
    return
  }
  isSubmittingContact.value = true
  contactError.value = null
  try {
    await $fetch('/api/public/leads', {
      method: 'POST',
      body: {
        name: fullName.value.trim(),
        email: email.value.trim(),
        phone: phone.value?.trim() || undefined,
        projectDetails: projectDetails.value?.trim() || undefined,
        contractorId: contractor.value?.id,
        city: contractor.value?.cityName,
        stateCode: contractor.value?.stateCode,
        source: 'contractor_profile'
      }
    })
    contactSuccess.value = true
    fullName.value = null
    email.value = null
    phone.value = null
    projectDetails.value = null
  } catch (err: any) {
    contactError.value = err.data?.message || 'Failed to send message. Please try again.'
  } finally {
    isSubmittingContact.value = false
  }
}

// Services computed from categories
const services = computed(() => {
  const cats = categories.value
  if (cats.length === 0) {
    return [{ title: 'landscaping Services', description: 'Professional landscaping installation and repair.', badge: 'Popular', badgeVariant: 'blue-blue' as const }]
  }
  return cats.slice(0, 4).map((cat: string, index: number) => ({
    title: cat,
    description: `Professional ${cat.toLowerCase()} services with quality craftsmanship.`,
    badge: index === 0 ? 'Popular' : 'Service',
    badgeVariant: 'blue-blue' as const
  }))
})

// Service info cards
const serviceInfo = computed(() => [
  { title: 'Service Area', content: `${contractor.value?.cityName}, ${contractor.value?.stateCode} area` },
  { title: 'Lead Time', content: 'Contact for availability' },
  { title: 'Warranty', content: 'Ask about warranty options' }
])

// Photo gallery
const photos = computed(() => images.value.map((path: string) => buildImageUrl(path)))

// Lightbox state
const isLightboxOpen = ref(false)
const selectedImageIndex = ref(0)
const openLightbox = (index: number) => {
  selectedImageIndex.value = index
  isLightboxOpen.value = true
}

// ============================================
// Reviews Tab State & Logic
// ============================================
import type { PublicReview } from '~/components/ui/pages/listing/ReviewCard.vue'

// Reviews from embedded contractor response (SSR)
const embeddedReviews = computed(() => contractor.value?.reviews || { items: [], total: 0, hasMore: false, ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } })

// All reviews (starts with embedded, can grow with pagination)
const allReviews = ref<PublicReview[]>([])

// Initialize with embedded reviews when contractor loads
watch(() => contractor.value?.reviews?.items, (items) => {
  if (items && allReviews.value.length === 0) {
    allReviews.value = items as unknown as PublicReview[]
  }
}, { immediate: true })

// Sorting state
type ReviewSortOption = 'recent' | 'highest' | 'lowest'
const reviewSortBy = ref<ReviewSortOption>('recent')
const sortOptions: { value: ReviewSortOption; label: string }[] = [
  { value: 'recent', label: 'Most Recent' },
  { value: 'highest', label: 'Highest Rated' },
  { value: 'lowest', label: 'Lowest Rated' }
]

// Pagination
const reviewsPerPage = 5
const currentReviewPage = ref(1)
const isLoadingReviews = ref(false)

// Total from backend
const totalReviews = computed(() => embeddedReviews.value.total)
const totalReviewPages = computed(() => Math.ceil(totalReviews.value / reviewsPerPage))

// Currently displayed reviews
const paginatedReviews = computed(() => {
  const start = (currentReviewPage.value - 1) * reviewsPerPage
  return allReviews.value.slice(start, start + reviewsPerPage)
})

// Overall rating from contractor data
const overallRating = computed(() => contractor.value?.rating?.toFixed(1) || '0.0')

// Rating distribution from backend
const ratingDistribution = computed(() => {
  const dist = embeddedReviews.value.ratingDistribution
  const total = totalReviews.value || 1 // Avoid division by zero
  return [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: dist[rating as 1 | 2 | 3 | 4 | 5] || 0,
    percentage: Math.round(((dist[rating as 1 | 2 | 3 | 4 | 5] || 0) / total) * 100)
  }))
})

// Fetch reviews from API (for sorting changes or pagination beyond embedded)
async function fetchReviews(sort: ReviewSortOption, offset: number = 0) {
  if (!contractor.value) return

  isLoadingReviews.value = true
  try {
    const { data } = await useFetch(`/api/public/contractors/${contractor.value.citySlug}/${contractor.value.slug}/reviews`, {
      query: { sort, limit: reviewsPerPage, offset }
    })

    if (data.value?.reviews) {
      if (offset === 0) {
        // Replace all reviews (sorting changed)
        allReviews.value = data.value.reviews
      } else {
        // Append reviews (pagination)
        allReviews.value = [...allReviews.value, ...data.value.reviews]
      }
    }
  } finally {
    isLoadingReviews.value = false
  }
}

// Handle sort change
watch(reviewSortBy, async (newSort) => {
  currentReviewPage.value = 1
  await fetchReviews(newSort, 0)
})

// Handle page change
async function handleReviewPageChange(page: number) {
  const neededReviews = page * reviewsPerPage
  // Check if we need to fetch more reviews
  if (neededReviews > allReviews.value.length && embeddedReviews.value.hasMore) {
    await fetchReviews(reviewSortBy.value, allReviews.value.length)
  }
  currentReviewPage.value = page
}

// Auth state for claim flow - using centralized composable
const { isAuthenticated, email: authenticatedEmail, displayName: authenticatedName, ensureProfile } = useAuthUser()

// Claim business state
const showClaimDialog = ref(false)
const isSubmittingClaim = ref(false)
const claimSubmitted = ref(false)
const claimName = ref('')
const claimEmail = ref('')
const claimPhone = ref('')
const claimError = ref<string | null>(null)

// Email check state (for unauthenticated users)
const isCheckingEmail = ref(false)
const emailRequiresSignIn = ref(false)
const emailCheckMessage = ref<string | null>(null)

const openClaimDialog = async () => {
  // Ensure profile is loaded before checking auth state
  await ensureProfile()

  showClaimDialog.value = true
  claimError.value = null
  emailRequiresSignIn.value = false
  emailCheckMessage.value = null
  // Pre-fill for authenticated users
  if (isAuthenticated.value) {
    claimEmail.value = authenticatedEmail.value
    claimName.value = authenticatedName.value
  }
}

const closeClaimDialog = () => {
  showClaimDialog.value = false
  claimName.value = ''
  claimEmail.value = ''
  claimPhone.value = ''
  claimError.value = null
  emailRequiresSignIn.value = false
  emailCheckMessage.value = null
}

// Check if email has existing account (for unauthenticated users only)
// Check if email has existing account - returns true if blocked
const checkEmail = async (): Promise<boolean> => {
  // Skip check for authenticated users - they're using their own email
  if (isAuthenticated.value) return false
  // Skip if email is empty or invalid format
  const email = claimEmail.value.trim()
  if (!email || !email.includes('@')) return false

  isCheckingEmail.value = true
  emailRequiresSignIn.value = false
  emailCheckMessage.value = null

  try {
    const response = await $fetch('/api/public/claims/check-email', {
      method: 'POST',
      body: { email },
    })

    if (response.requiresSignIn) {
      emailRequiresSignIn.value = true
      emailCheckMessage.value = response.message || 'Please sign in to claim this profile.'
      return true // Blocked
    } else if (!response.canClaim) {
      claimError.value = response.message || 'Unable to process claim with this email.'
      return true // Blocked
    }
    return false // Can proceed
  } catch {
    // Silently fail - server-side validation will catch issues
    return false
  } finally {
    isCheckingEmail.value = false
  }
}

const submitClaim = async () => {
  if (!contractor.value?.id) return
  if (!claimName.value.trim() || !claimEmail.value.trim()) {
    claimError.value = 'Name and email are required'
    return
  }

  isSubmittingClaim.value = true
  claimError.value = null

  // Check email on submit (not just on blur)
  const isBlocked = await checkEmail()
  if (isBlocked) {
    isSubmittingClaim.value = false
    return
  }

  try {
    const response = await $fetch('/api/public/claims', {
      method: 'POST',
      body: {
        contractorId: contractor.value.id,
        claimantName: claimName.value.trim(),
        claimantEmail: claimEmail.value.trim(),
        claimantPhone: claimPhone.value.trim() || undefined,
        isAuthenticated: isAuthenticated.value,
      },
    })
    claimSubmitted.value = true
    // Different success message for authenticated vs unauthenticated
    if (response.skipVerification) {
      toast.success('Your claim has been submitted and is awaiting admin review.')
    } else {
      toast.success('Please check your email to verify your claim.')
    }
    closeClaimDialog()
  } catch (err: unknown) {
    const error = err as { data?: { message?: string } }
    claimError.value = error.data?.message || 'Failed to submit claim. Please try again.'
  } finally {
    isSubmittingClaim.value = false
  }
}
</script>

<template>
  <div class="pb-20">
    <!-- Hero Section -->
    <section class="mb-8 rounded-3xl bg-[#F2F6FA] px-4 py-12 dark:bg-blue-900/20 sm:px-6 md:px-8 lg:px-12 xl:px-20">
      <div class="mb-6 w-fit px-0 sm:px-2 md:px-4 lg:px-8 xl:px-20">
        <Breadcrumbs :items="breadcrumbs" />
      </div>

      <div class="flex flex-col justify-between gap-14 px-0 sm:px-2 md:px-4 lg:flex-row lg:items-start lg:px-8 xl:px-20">
        <div class="space-y-4">
          <h1 class="font-heading text-3xl font-bold text-neutral-900 dark:text-white sm:text-4xl md:text-5xl">
            {{ contractor?.companyName }}
          </h1>

          <div class="flex flex-wrap items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
            <div v-if="contractor?.rating && totalReviews > 0" class="flex items-center text-yellow-500">
              <span class="mr-1 text-lg font-bold">{{ contractor.rating.toFixed(1) }}</span>
              <div class="flex">
                <Icon v-for="i in 5" :key="i" name="heroicons:star-solid" :class="['h-4 w-4', i <= filledStars ? 'text-yellow-500' : 'text-neutral-300 dark:text-neutral-600']" />
              </div>
            </div>
            <span v-if="totalReviews > 0">({{ totalReviews }})</span>
            <span class="mx-2">•</span>
            <span>{{ contractor?.cityName }}, {{ contractor?.stateCode }}</span>
          </div>

          <p v-if="contractor?.description" class="max-w-3xl text-base text-neutral-600 dark:text-neutral-300 sm:text-lg">
            {{ contractor.description }}
          </p>
        </div>

        <div class="flex flex-col gap-3 sm:flex-row lg:-mt-6 lg:flex-col xl:flex-col">
          <ContractorVerifiedBadge v-if="contractor?.isClaimed" :tier="(contractor as any)?.verificationTier || 'basic_verified'" />
          <Button v-if="contractor?.phone" :text="`Call ${contractor.phone}`" variant="primary-outline" class="!mt-3 whitespace-nowrap bg-white hover:bg-blue-50 dark:bg-transparent" />
          <Button text="Request a Quote" variant="primary" class="whitespace-nowrap" />
          <Button v-if="!contractor?.isClaimed && !claimSubmitted" text="Claim this Business" variant="ghost" icon="heroicons:arrows-right-left-solid" class="whitespace-nowrap text-sm font-normal text-neutral-600 hover:text-blue-600 dark:text-neutral-400 dark:hover:text-blue-400" @click="openClaimDialog" />
          <span v-else-if="claimSubmitted" class="text-center text-sm text-green-600 dark:text-green-400">✓ Claim submitted</span>
        </div>
      </div>
    </section>

    <div class="grid grid-cols-1 gap-8 px-4 sm:px-6 md:px-8 lg:grid-cols-12 lg:px-12 xl:px-20">
      <!-- Sidebar -->
      <div class="space-y-6 lg:col-span-4">
        <!-- Company Info Card -->
        <Card :step="1" heading="Company Info" padding="p-6" :background-colors="['#ffffff', '#171717']" border-width="thick" :border-color="['#e5e7eb', '#404040']">
          <div class="mt-5 space-y-3 text-sm">
            <div class="grid grid-cols-[90px_1fr] gap-2 sm:grid-cols-[100px_1fr]">
              <span class="font-bold text-neutral-900 dark:text-white">Service Area:</span>
              <span class="text-neutral-600 dark:text-neutral-400">{{ contractor?.cityName }}, {{ contractor?.stateCode }}</span>
            </div>
            <div class="grid grid-cols-[90px_1fr] gap-2 sm:grid-cols-[100px_1fr]">
              <span class="font-bold text-neutral-900 dark:text-white">Hours:</span>
              <template v-if="hasHours">
                <Popover side="bottom" align="start" width="300px">
                  <template #trigger>
                    <button type="button" class="inline-flex items-center gap-1 text-left text-neutral-600 hover:text-blue-600 dark:text-neutral-400 dark:hover:text-blue-400">
                      {{ formattedHours }}
                      <Icon name="heroicons:chevron-down" class="h-4 w-4" />
                    </button>
                  </template>
                  <div class="space-y-1.5">
                    <div
                      v-for="entry in openingHours"
                      :key="entry.day"
                      class="flex justify-between text-sm"
                    >
                      <span class="font-medium text-neutral-700 dark:text-neutral-300">{{ entry.day }}</span>
                      <span class="text-neutral-600 dark:text-neutral-400">{{ entry.hours }}</span>
                    </div>
                  </div>
                </Popover>
              </template>
              <span v-else class="text-neutral-600 dark:text-neutral-400">{{ formattedHours }}</span>
            </div>
            <div v-if="contractor?.website" class="grid grid-cols-[90px_1fr] gap-2 sm:grid-cols-[100px_1fr]">
              <span class="font-bold text-neutral-900 dark:text-white">Website:</span>
              <a :href="contractor.website" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">
                {{ contractor.website.replace(/^https?:\/\//, '').replace(/\/$/, '') }}
              </a>
            </div>
          </div>
          <div v-if="categories.length" class="mt-4 flex flex-wrap items-center gap-2 border-t-2 border-gray-200 pt-4">
            <MiniBadge v-for="cat in visibleCategories" :key="cat" :text="cat" variant="primary-outline" size="sm" class="rounded-full" />
            <button
              v-if="hiddenCategoriesCount > 0 && !categoriesExpanded"
              type="button"
              class="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              @click="categoriesExpanded = true"
            >
              +{{ hiddenCategoriesCount }} more
            </button>
            <button
              v-if="categoriesExpanded && categories.length > maxVisibleCategories"
              type="button"
              class="text-sm font-medium text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"
              @click="categoriesExpanded = false"
            >
              Show less
            </button>
          </div>
          <!-- Social Links -->
          <div v-if="hasSocialLinks" class="mt-4 flex flex-wrap gap-3">
            <a v-if="socialLinks.facebook" :href="socialLinks.facebook" target="_blank" rel="noopener noreferrer" class="text-neutral-400 transition-colors hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300" title="Facebook">
              <Icon name="ion:logo-facebook" class="size-5" />
            </a>
            <a v-if="socialLinks.instagram" :href="socialLinks.instagram" target="_blank" rel="noopener noreferrer" class="text-neutral-400 transition-colors hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300" title="Instagram">
              <Icon name="ion:logo-instagram" class="size-5" />
            </a>
            <a v-if="socialLinks.twitter" :href="socialLinks.twitter" target="_blank" rel="noopener noreferrer" class="text-neutral-400 transition-colors hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300" title="X (Twitter)">
              <Icon name="ion:logo-twitter" class="size-5" />
            </a>
            <a v-if="socialLinks.linkedin" :href="socialLinks.linkedin" target="_blank" rel="noopener noreferrer" class="text-neutral-400 transition-colors hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300" title="LinkedIn">
              <Icon name="ion:logo-linkedin" class="size-5" />
            </a>
            <a v-if="socialLinks.youtube" :href="socialLinks.youtube" target="_blank" rel="noopener noreferrer" class="text-neutral-400 transition-colors hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300" title="YouTube">
              <Icon name="ion:logo-youtube" class="size-5" />
            </a>
            <a v-if="socialLinks.yelp" :href="socialLinks.yelp" target="_blank" rel="noopener noreferrer" class="text-neutral-400 transition-colors hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300" title="Yelp">
              <Icon name="ion:logo-yelp" class="size-5" />
            </a>
          </div>
        </Card>

        <!-- Contact Card -->
        <Card :step="2" heading="Contact" padding="p-6" :background-colors="['#ffffff', '#171717']" border-width="thick" :border-color="['#e5e7eb', '#404040']">
          <p class="mb-4 text-xs text-neutral-500">Replies within 24 hours</p>
          <div v-if="contactSuccess" class="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
            ✓ Message sent! The contractor will reach out within 24 hours.
          </div>
          <form v-else class="space-y-4" @submit.prevent="submitContact">
            <TextInput v-model="fullName" type="text" placeholder="Full Name *" size="md" :disabled="isSubmittingContact" />
            <TextInput v-model="email" type="email" placeholder="Email *" size="md" :disabled="isSubmittingContact" />
            <TextInput v-model="phone" type="tel" placeholder="Phone" size="md" :disabled="isSubmittingContact" />
            <textarea v-model="projectDetails" placeholder="What Can We Build For You" rows="4" :disabled="isSubmittingContact" class="w-full rounded-lg border border-blue-200 bg-white px-4 py-3 text-sm placeholder-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800" />
            <p v-if="contactError" class="text-sm text-red-600">{{ contactError }}</p>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Button
                :text="isSubmittingContact ? 'Sending...' : 'Send'"
                type="submit"
                variant="primary"
                class="w-full"
                :disabled="isSubmittingContact"
              />
            </div>
          </form>
        </Card>
      </div>

      <!-- Main Content -->
      <div class="lg:col-span-8">
        <Card padding="p-0" class="overflow-hidden" :background-colors="['#ffffff', '#171717']" border-width="thick" :border-color="['#e5e7eb', '#404040']">
          <!-- Tabs -->
          <div class="flex flex-wrap gap-2 px-8 pt-6">
            <button v-for="tab in tabs" :key="tab" type="button" :class="['rounded-full px-6 py-2 text-sm font-bold transition-colors', activeTab === tab ? 'bg-[#f0f7f0] text-[#1f6f3a] dark:bg-blue-900/30 dark:text-blue-400' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700']" @click="activeTab = tab">
              {{ tab }}
            </button>
          </div>

          <!-- Tab Panels -->
          <div class="space-y-8 p-8">
          <!-- Overview Tab -->
          <div v-if="activeTab === 'Overview'" class="space-y-8">
          <div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div class="space-y-5">
              <!-- About heading with location -->
              <div>
                <h2 class="font-heading text-2xl font-bold text-neutral-900 dark:text-white">About {{ contractor?.companyName }}</h2>
                <p class="mt-1 flex items-center gap-1 text-xs text-neutral-500">
                  <span class="text-neutral-400">•</span>
                  {{ contractor?.cityName }}, {{ contractor?.stateCode }}
                </p>
              </div>

              <!-- Description -->
              <p class="text-sm text-neutral-600 dark:text-neutral-300">{{ contractor?.description || 'No description available.' }}</p>

              <!-- Star rating -->
              <div class="!mt-2 flex items-center gap-1.5">
                <div class="flex items-center">
                  <Icon v-for="i in 5" :key="i" name="heroicons:star-solid" class="h-3 w-3" :class="i <= filledStars ? 'text-amber-400' : 'text-neutral-300 dark:text-neutral-600'" />
                </div>
                <span v-if="totalReviews > 0" class="text-xs text-neutral-600 dark:text-neutral-400">
                  {{ overallRating }} ({{ totalReviews }})
                </span>
                <span v-else class="text-sm text-neutral-500">No ratings yet</span>
              </div>

              <!-- Stats cards -->
              <div class="!mt-10 flex gap-4">
                <div class="flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-5 py-4 dark:border-neutral-700 dark:bg-neutral-800">
                  <p class="text-xl font-bold text-neutral-900 dark:text-white">15+ yrs</p>
                  <p class="text-sm text-neutral-500">Experience</p>
                </div>
                <div class="flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-5 py-4 dark:border-neutral-700 dark:bg-neutral-800">
                  <div class="flex flex-row items-center text-xl font-bold text-neutral-900 dark:text-white">
                    <template v-if="contractor?.rating && contractor.rating > 0 && totalReviews > 0">
                      {{ contractor.rating.toFixed(1) }}
                      <Icon name="heroicons:star-solid" class="h-3 w-3 pl-6 text-amber-400" />
                    </template>
                    <template v-else>N/A</template>
                  </div>
                  <p class="text-sm text-neutral-500">Average Rating</p>
                </div>
              </div>
            </div>
            <div v-if="heroImage" class="max-h-72 overflow-hidden rounded-2xl">
              <NuxtImg :src="heroImage" :alt="contractor?.companyName" class="h-full w-full object-cover" />
            </div>
            <div v-else class="flex h-64 items-center justify-center overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-800">
              <Icon name="heroicons:building-office-2" class="h-24 w-24 text-neutral-400" />
            </div>
          </div>

          <!-- Recent Reviews Preview (Overview tab) -->
          <div v-if="allReviews.length > 0" class="space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="font-heading text-lg font-bold text-neutral-900 dark:text-white">Recent Reviews</h3>
              <button
                type="button"
                class="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                @click="activeTab = 'Reviews'"
              >
                See all {{ totalReviews }} reviews →
              </button>
            </div>
            <ReviewCard
              v-for="review in allReviews.slice(0, 2)"
              :key="review.id"
              :review="review"
            />
            <button
              type="button"
              class="w-full rounded-xl border border-amber-300 bg-amber-50 px-5 py-3 text-sm font-bold text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/30"
              @click="activeTab = 'Reviews'; $nextTick(() => document.getElementById('write-review')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))"
            >
              ★ Leave a Review for {{ contractor?.companyName }}
            </button>
          </div>
          <div v-else class="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-900/10">
            <p class="mb-3 text-sm text-amber-800 dark:text-amber-300">No reviews yet — be the first to share your experience.</p>
            <button
              type="button"
              class="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-bold text-neutral-900 transition-colors hover:bg-amber-300"
              @click="activeTab = 'Reviews'; $nextTick(() => document.getElementById('write-review')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))"
            >
              Write the First Review
            </button>
          </div>
          </div>

          <!-- Products & Services Tab -->
          <div v-else-if="activeTab === 'Products & Services'" class="space-y-8">
            <div class="space-y-6">
              <div v-for="service in services" :key="service.title" class="flex items-start justify-between gap-4 border-b border-neutral-200 pb-6 last:border-b-0 dark:border-neutral-700">
                <div class="flex-1 space-y-2">
                  <h3 class="text-2xl font-bold text-neutral-900 dark:text-white">{{ service.title }}</h3>
                  <p class="text-neutral-600 dark:text-neutral-400">{{ service.description }}</p>
                </div>
                <Badge :text="service.badge" :variant="service.badgeVariant" size="sm" class="shrink-0" />
              </div>
            </div>
          </div>

          <!-- Photos Tab -->
          <div v-else-if="activeTab === 'Photos'" class="space-y-6">
            <div v-if="photos.length > 0" class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              <div v-for="(photo, index) in photos" :key="index" class="group relative aspect-[4/3] cursor-pointer overflow-hidden rounded-lg" @click="openLightbox(index)">
                <NuxtImg :src="photo" :alt="`Photo ${index + 1}`" class="h-full w-full object-cover" loading="lazy" />
              </div>
            </div>
            <div v-else class="flex h-64 flex-col items-center justify-center text-neutral-500">
              <Icon name="heroicons:photo" class="mb-4 h-16 w-16" />
              <p>No photos available</p>
            </div>
            <Lightbox v-if="photos.length > 0" v-model:open="isLightboxOpen" :images="photos" :initial-index="selectedImageIndex" />
          </div>

          <!-- Reviews Tab -->
          <div v-else-if="activeTab === 'Reviews'" class="space-y-8">
            <!-- Summary Header (only shown when actual review records exist) -->
            <div v-if="totalReviews > 0" class="grid grid-cols-1 gap-6 md:grid-cols-2">
              <!-- Overall Rating + Write a Review button -->
              <div class="flex items-center gap-4">
                <div class="flex flex-col items-center rounded-2xl border border-neutral-200 p-6 dark:border-neutral-700">
                  <span class="font-heading text-5xl font-bold text-neutral-900 dark:text-white">
                    {{ overallRating }}
                  </span>
                  <div class="mt-2 flex items-center gap-0.5">
                    <Icon
                      v-for="i in 5"
                      :key="i"
                      name="heroicons:star-solid"
                      :class="['h-5 w-5', i <= filledStars ? 'text-yellow-400' : 'text-neutral-300 dark:text-neutral-600']"
                    />
                  </div>
                  <span class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                    {{ totalReviews }} reviews
                  </span>
                </div>
                <button
                  type="button"
                  class="flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 font-bold text-neutral-900 transition-colors hover:bg-amber-300"
                  @click="() => document.getElementById('write-review')?.scrollIntoView({ behavior: 'smooth', block: 'center' })"
                >
                  <Icon name="heroicons:pencil-square" class="h-5 w-5" />
                  Write a Review
                </button>
              </div>

              <!-- Rating Distribution -->
              <div class="space-y-2">
                <div
                  v-for="item in ratingDistribution"
                  :key="item.rating"
                  class="flex items-center gap-3"
                >
                  <span class="w-16 text-sm text-neutral-600 dark:text-neutral-400">
                    {{ item.rating }} stars
                  </span>
                  <div class="h-2.5 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                    <div
                      class="h-full rounded-full bg-yellow-400 transition-all duration-300"
                      :style="{ width: `${item.percentage}%` }"
                    />
                  </div>
                  <span class="w-12 text-right text-sm text-neutral-500 dark:text-neutral-400">
                    {{ item.count }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Sorting Controls -->
            <div v-if="totalReviews > 0" class="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-4 dark:border-neutral-700">
              <span class="text-sm text-neutral-500 dark:text-neutral-400">
                Showing {{ paginatedReviews.length }} of {{ totalReviews }} reviews
              </span>
              <div class="flex items-center gap-2">
                <span class="text-sm text-neutral-600 dark:text-neutral-400">Sort by:</span>
                <div class="flex gap-1">
                  <button
                    v-for="option in sortOptions"
                    :key="option.value"
                    type="button"
                    :disabled="isLoadingReviews"
                    :class="[
                      'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                      reviewSortBy === option.value
                        ? 'bg-blue-500 text-white'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700',
                      isLoadingReviews && 'cursor-not-allowed opacity-50'
                    ]"
                    @click="reviewSortBy = option.value"
                  >
                    {{ option.label }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Loading indicator -->
            <div v-if="isLoadingReviews" class="flex items-center justify-center py-8">
              <Icon name="heroicons:arrow-path" class="h-6 w-6 animate-spin text-blue-500" />
              <span class="ml-2 text-neutral-500">Loading reviews...</span>
            </div>

            <!-- Review List -->
            <div v-else-if="paginatedReviews.length > 0" class="space-y-6">
              <ReviewCard
                v-for="review in paginatedReviews"
                :key="review.id"
                :review="review"
              />
            </div>

            <!-- No reviews message -->
            <div v-else class="py-8 text-center text-neutral-500 dark:text-neutral-400">
              No reviews yet. Be the first to leave a review!
            </div>

            <!-- Pagination -->
            <div v-if="totalReviewPages > 1 && !isLoadingReviews" class="pt-4">
              <Pagination
                :current-page="currentReviewPage"
                :total-pages="totalReviewPages"
                size="md"
                @update:current-page="handleReviewPageChange"
              />
            </div>

            <!-- Submit a review -->
            <div id="write-review">
              <ReviewsReviewSubmitForm
                v-if="contractor"
                :contractor-id="contractor.id"
                :contractor-name="contractor.companyName"
              />
            </div>
          </div>
          </div>
        </Card>
      </div>
    </div>

    <!-- Bottom CTA -->
    <ListingBottomCta />

    <!-- Claim Business Dialog -->
    <Dialog v-model:open="showClaimDialog" title="Claim this Business" description="Submit a claim to manage this business profile." size="md" :close-on-overlay-click="false" @close="closeClaimDialog">
      <form class="mt-4 space-y-4" @submit.prevent="submitClaim">
        <!-- Authenticated user notice - 2-column layout -->
        <div v-if="isAuthenticated" class="flex gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
          <Icon name="heroicons:check-badge" class="mt-0.5 h-4 w-4 shrink-0" />
          <span>You're signed in. Your claim will go directly to admin review.</span>
        </div>

        <div v-if="claimError" class="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{{ claimError }}</div>

        <!-- Email requires sign-in notice - 2-column layout -->
        <div v-if="emailRequiresSignIn" class="rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
          <div class="flex gap-2 text-sm text-amber-700 dark:text-amber-300">
            <Icon name="heroicons:exclamation-triangle" class="mt-0.5 h-4 w-4 shrink-0" />
            <span>{{ emailCheckMessage }}</span>
          </div>
          <NuxtLink
            :to="`/login?redirect=${encodeURIComponent($route.fullPath)}`"
            class="text-site-blue ml-6 mt-2 inline-flex items-center gap-1 text-sm font-medium hover:underline"
          >
            Sign in to your account
            <Icon name="heroicons:arrow-right" class="h-4 w-4" />
          </NuxtLink>
        </div>

        <TextInput v-model="claimName" type="text" placeholder="Your Full Name *" size="md" :disabled="isSubmittingClaim" />

        <!-- Email: read-only for authenticated users - use TextInput for consistency -->
        <div v-if="isAuthenticated">
          <TextInput
            v-model="claimEmail"
            type="email"
            placeholder="Your Email Address *"
            size="md"
            disabled
          />
          <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Using your account email</p>
        </div>
        <!-- Email for unauthenticated users - validated on submit -->
        <TextInput
          v-else
          v-model="claimEmail"
          type="email"
          placeholder="Your Email Address *"
          size="md"
          :disabled="isSubmittingClaim"
        />

        <TextInput v-model="claimPhone" type="tel" placeholder="Phone Number (optional)" size="md" :disabled="isSubmittingClaim" />
      </form>
      <template #actions>
        <Button text="Cancel" variant="ghost" :disabled="isSubmittingClaim" @click="closeClaimDialog" />
        <Button text="Submit Claim" variant="primary" :disabled="isSubmittingClaim || emailRequiresSignIn || !claimName.trim() || !claimEmail.trim()" @click="submitClaim" />
      </template>
    </Dialog>
  </div>
</template>

