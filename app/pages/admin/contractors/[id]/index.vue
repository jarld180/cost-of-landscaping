<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { consola } from 'consola'
import { toast } from 'vue-sonner'
import { getStateSlugFromCode } from '~/utils/usStates'

// Page metadata
definePageMeta({
  layout: 'admin',
})

useHead({
  title: 'View Contractor - Admin',
})

// ===========================================
// TYPES
// ===========================================

interface ServiceTypeInfo {
  id: string
  name: string
  slug: string
  source: 'ai_enrichment' | 'manual' | 'import'
  confidenceScore: number | null
}

interface ContractorWithExtras {
  id: string
  company_name: string
  slug: string
  description: string | null
  phone: string | null
  email: string | null
  website: string | null
  street_address: string | null
  postal_code: string | null
  rating: number | null
  review_count: number | null
  status: 'pending' | 'active' | 'suspended'
  google_place_id: string | null
  google_cid: string | null
  metadata: Record<string, any> | null
  created_at: string
  updated_at: string
  city?: {
    id: string
    name: string
    slug: string
    state_code: string
  } | null
  service_types?: ServiceTypeInfo[]
}

interface BusinessHours {
  monday?: { open: string; close: string } | null
  tuesday?: { open: string; close: string } | null
  wednesday?: { open: string; close: string } | null
  thursday?: { open: string; close: string } | null
  friday?: { open: string; close: string } | null
  saturday?: { open: string; close: string } | null
  sunday?: { open: string; close: string } | null
}

// ===========================================
// STATE
// ===========================================

const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()

const contractorId = computed(() => route.params.id as string)
const contractor = ref<ContractorWithExtras | null>(null)
const loading = ref(true)

// ===========================================
// FETCH DATA
// ===========================================

async function fetchContractor() {
  try {
    loading.value = true
    const response = await $fetch<{ success: boolean; data: ContractorWithExtras }>(`/api/contractors/${contractorId.value}`)

    if (response.success && response.data) {
      contractor.value = response.data
    } else {
      throw new Error('Contractor not found')
    }
  } catch (error: any) {
    if (import.meta.dev) {
      consola.error('[ViewContractor] Error fetching:', error)
    }
    toast.error('Contractor not found')
    router.push('/admin/contractors')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchContractor()
})

// ===========================================
// COMPUTED VALUES
// ===========================================

const metadata = computed(() => (contractor.value?.metadata as Record<string, any>) || {})
const enrichment = computed(() => metadata.value.enrichment || {})
const images = computed<string[]>(() => metadata.value.images || [])
const primaryImage = computed(() => metadata.value.primary_image || images.value[0] || null)
const serviceTypes = computed(() => contractor.value?.service_types || [])
// Enrichment status computed
const enrichmentStatus = computed(() => enrichment.value.status || 'not_started')
const enrichmentDate = computed(() => enrichment.value.enriched_at || enrichment.value.failed_at || null)
const businessHours = computed<BusinessHours>(() => enrichment.value.business_hours || {})
const socialLinks = computed(() => enrichment.value.social_links || metadata.value.social_links || {})

// Build image URL from storage path
function buildImageUrl(storagePath: string): string {
  const { data } = supabase.storage.from('contractors').getPublicUrl(storagePath)
  return data.publicUrl
}

// Format city display
const cityDisplay = computed(() => {
  if (!contractor.value?.city) return 'Not set'
  return `${contractor.value.city.name}, ${contractor.value.city.state_code}`
})

// Status badge styling
const statusConfig = computed(() => {
  switch (contractor.value?.status) {
    case 'active':
      return { label: 'Active', variant: 'default' as const, icon: 'heroicons:check-circle' }
    case 'suspended':
      return { label: 'Suspended', variant: 'destructive' as const, icon: 'heroicons:x-circle' }
    default:
      return { label: 'Pending', variant: 'secondary' as const, icon: 'heroicons:clock' }
  }
})

// Enrichment status badge config
const enrichmentStatusConfig = computed(() => {
  switch (enrichmentStatus.value) {
    case 'completed':
      return { label: 'Enriched', variant: 'default' as const, icon: 'heroicons:sparkles' }
    case 'failed':
      return { label: 'Failed', variant: 'destructive' as const, icon: 'heroicons:exclamation-triangle' }
    case 'bot_blocked':
      return { label: 'Bot Blocked', variant: 'warning' as const, icon: 'heroicons:shield-exclamation' }
    case 'not_applicable':
      return { label: 'N/A', variant: 'secondary' as const, icon: 'heroicons:minus-circle' }
    default:
      return { label: 'Not Started', variant: 'outline' as const, icon: 'heroicons:clock' }
  }
})

// Format relative time (e.g., "2 hours ago")
function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return 'Never'

  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`
  if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30)
    return `${months} ${months === 1 ? 'month' : 'months'} ago`
  }
  const years = Math.floor(diffDays / 365)
  return `${years} ${years === 1 ? 'year' : 'years'} ago`
}

// Get source badge variant
function getSourceVariant(source: string) {
  switch (source) {
    case 'ai_enrichment':
      return 'default'
    case 'manual':
      return 'secondary'
    case 'import':
      return 'outline'
    default:
      return 'outline'
  }
}

// Get source label
function getSourceLabel(source: string) {
  switch (source) {
    case 'ai_enrichment':
      return 'AI'
    case 'manual':
      return 'Manual'
    case 'import':
      return 'Import'
    default:
      return source
  }
}

// Check if we have any social links
const hasSocialLinks = computed(() => {
  return Object.values(socialLinks.value).some((v) => v)
})

// Check if we have business hours
const hasBusinessHours = computed(() => {
  return Object.keys(businessHours.value).length > 0
})

// Days of the week in order
const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

// Navigation
function handleEdit() {
  router.push(`/admin/contractors/${contractorId.value}/edit`)
}

function handleBack() {
  router.push('/admin/contractors')
}

// Build public profile URL
const publicProfileUrl = computed(() => {
  if (!contractor.value?.city?.state_code || !contractor.value?.city?.slug || !contractor.value?.slug) {
    return null
  }
  const stateSlug = getStateSlugFromCode(contractor.value.city.state_code)
  return `/${stateSlug}/${contractor.value.city.slug}/concrete-contractors/${contractor.value.slug}`
})
</script>

<template>
  <div>
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="flex flex-col items-center gap-3">
        <UiSpinner class="size-8" />
        <p class="text-sm text-muted-foreground">Loading contractor...</p>
      </div>
    </div>

    <template v-else-if="contractor">
      <!-- Header Section -->
      <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="space-y-2">
          <!-- Title + Badges -->
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="text-2xl font-bold text-foreground sm:text-3xl">{{ contractor.company_name }}</h1>
            <UiBadge :variant="statusConfig.variant">
              <Icon :name="statusConfig.icon" class="mr-1 size-3.5" />
              {{ statusConfig.label }}
            </UiBadge>
            <UiBadge :variant="enrichmentStatusConfig.variant">
              <Icon :name="enrichmentStatusConfig.icon" class="mr-1 size-3.5" />
              {{ enrichmentStatusConfig.label }}
            </UiBadge>
          </div>
          <!-- Location + Enrichment Timestamp -->
          <div class="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span class="flex items-center gap-1">
              <Icon name="heroicons:map-pin" class="size-4" />
              {{ cityDisplay }}
            </span>
            <span v-if="enrichmentDate" class="flex items-center gap-1">
              <Icon name="heroicons:clock" class="size-4" />
              {{ enrichmentStatus === 'completed' ? 'Enriched' : 'Last attempt' }} {{ formatRelativeTime(enrichmentDate) }}
            </span>
          </div>
        </div>
        <!-- Quick Actions -->
        <div class="flex flex-wrap items-center gap-2">
          <UiButton variant="ghost" size="sm" @click="handleBack">
            <Icon name="heroicons:arrow-left" class="mr-1 size-4" />
            Back
          </UiButton>
          <a v-if="publicProfileUrl" :href="publicProfileUrl" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border bg-background px-3 py-1.5 text-sm font-medium shadow-xs transition-all hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 h-8 gap-1.5 has-[>svg]:px-2.5">
            <Icon name="heroicons:arrow-top-right-on-square" class="mr-1 size-4" />
            View Profile
          </a>
          <UiButton size="sm" @click="handleEdit">
            <Icon name="heroicons:pencil" class="mr-1 size-4" />
            Edit
          </UiButton>
        </div>
      </div>

      <!-- Content Grid -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <!-- Main Content (2 cols) -->
        <div class="space-y-6 lg:col-span-2">
          <!-- Enrichment Status Card (only if enrichment has info) -->
          <UiCard v-if="enrichmentStatus !== 'not_started'" class="border-l-4" :class="{
            'border-l-green-500': enrichmentStatus === 'completed',
            'border-l-red-500': enrichmentStatus === 'failed',
            'border-l-yellow-500': enrichmentStatus === 'bot_blocked',
            'border-l-gray-400': enrichmentStatus === 'not_applicable',
          }">
            <UiCardHeader>
              <UiCardTitle class="flex items-center gap-2">
                <Icon :name="enrichmentStatusConfig.icon" class="size-5" />
                Enrichment Status
              </UiCardTitle>
            </UiCardHeader>
            <UiCardContent>
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-sm text-muted-foreground">Status</span>
                  <UiBadge :variant="enrichmentStatusConfig.variant">{{ enrichmentStatusConfig.label }}</UiBadge>
                </div>
                <div v-if="enrichmentDate" class="flex items-center justify-between">
                  <span class="text-sm text-muted-foreground">{{ enrichmentStatus === 'completed' ? 'Enriched At' : 'Attempted At' }}</span>
                  <span class="text-sm">{{ new Date(enrichmentDate).toLocaleString() }}</span>
                </div>
                <div v-if="enrichment.error" class="rounded-md bg-destructive/10 p-3">
                  <p class="text-sm text-destructive">{{ enrichment.error }}</p>
                </div>
                <div v-if="enrichmentStatus === 'bot_blocked' && enrichment.website_url" class="text-sm">
                  <span class="text-muted-foreground">Blocked URL:</span>
                  <a :href="enrichment.website_url" target="_blank" class="ml-1 text-primary hover:underline">{{ enrichment.website_url }}</a>
                </div>
              </div>
            </UiCardContent>
          </UiCard>

          <!-- Contact Card -->
          <UiCard>
            <UiCardHeader>
              <UiCardTitle>Contact Information</UiCardTitle>
            </UiCardHeader>
            <UiCardContent>
              <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt class="text-sm font-medium text-muted-foreground">Phone</dt>
                  <dd class="mt-1">
                    <a v-if="contractor.phone" :href="`tel:${contractor.phone}`" class="flex items-center gap-2 text-primary hover:underline">
                      <Icon name="heroicons:phone" class="size-4" />
                      {{ contractor.phone }}
                    </a>
                    <span v-else class="text-muted-foreground">—</span>
                  </dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-muted-foreground">Email</dt>
                  <dd class="mt-1">
                    <a v-if="contractor.email" :href="`mailto:${contractor.email}`" class="flex items-center gap-2 text-primary hover:underline">
                      <Icon name="heroicons:envelope" class="size-4" />
                      {{ contractor.email }}
                    </a>
                    <span v-else class="text-muted-foreground">—</span>
                  </dd>
                </div>
                <div class="sm:col-span-2">
                  <dt class="text-sm font-medium text-muted-foreground">Website</dt>
                  <dd class="mt-1">
                    <a v-if="contractor.website" :href="contractor.website" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 text-primary hover:underline">
                      <Icon name="heroicons:globe-alt" class="size-4" />
                      {{ contractor.website }}
                    </a>
                    <span v-else class="text-muted-foreground">—</span>
                  </dd>
                </div>
              </dl>
            </UiCardContent>
          </UiCard>

          <!-- Service Types Card -->
          <UiCard>
            <UiCardHeader>
              <UiCardTitle>Service Types</UiCardTitle>
            </UiCardHeader>
            <UiCardContent>
              <div v-if="serviceTypes.length" class="flex flex-wrap gap-2">
                <div v-for="st in serviceTypes" :key="st.id" class="flex items-center gap-1">
                  <UiBadge variant="secondary">{{ st.name }}</UiBadge>
                  <UiBadge :variant="getSourceVariant(st.source)" class="text-xs">{{ getSourceLabel(st.source) }}</UiBadge>
                </div>
              </div>
              <p v-else class="italic text-muted-foreground">No service types assigned</p>
            </UiCardContent>
          </UiCard>

          <!-- Business Hours Card -->
          <UiCard v-if="hasBusinessHours">
            <UiCardHeader>
              <UiCardTitle class="flex items-center gap-2">
                <Icon name="heroicons:clock" class="size-5" />
                Business Hours
              </UiCardTitle>
            </UiCardHeader>
            <UiCardContent>
              <div class="divide-y">
                <div v-for="day in daysOfWeek" :key="day" class="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                  <span class="text-sm font-medium capitalize">{{ day }}</span>
                  <span v-if="businessHours[day]" class="text-sm text-muted-foreground">
                    {{ businessHours[day]?.open }} - {{ businessHours[day]?.close }}
                  </span>
                  <span v-else class="text-sm text-muted-foreground">Closed</span>
                </div>
              </div>
            </UiCardContent>
          </UiCard>

          <!-- Description Card -->
          <UiCard>
            <UiCardHeader>
              <UiCardTitle>Description</UiCardTitle>
            </UiCardHeader>
            <UiCardContent>
              <p v-if="contractor.description" class="whitespace-pre-wrap text-foreground">{{ contractor.description }}</p>
              <p v-else class="italic text-muted-foreground">No description provided</p>
            </UiCardContent>
          </UiCard>

          <!-- Images Gallery -->
          <UiCard>
            <UiCardHeader>
              <UiCardTitle>Images ({{ images.length }})</UiCardTitle>
            </UiCardHeader>
            <UiCardContent>
              <div v-if="images.length" class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                <div
                  v-for="image in images"
                  :key="image"
                  class="group relative aspect-square overflow-hidden rounded-lg border"
                >
                  <img
                    :src="buildImageUrl(image)"
                    :alt="contractor.company_name"
                    class="size-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div v-if="image === primaryImage" class="absolute right-2 top-2">
                    <span class="rounded-full bg-yellow-500 p-1.5 text-white shadow-lg">
                      <Icon name="heroicons:star-solid" class="size-4" />
                    </span>
                  </div>
                </div>
              </div>
              <p v-else class="italic text-muted-foreground">No images available</p>
            </UiCardContent>
          </UiCard>
        </div>

        <!-- Sidebar (1 col) -->
        <div class="space-y-6">
          <!-- Social Links Card -->
          <UiCard>
            <UiCardHeader>
              <UiCardTitle class="flex items-center gap-2">
                <Icon name="heroicons:share" class="size-5" />
                Social Links
              </UiCardTitle>
            </UiCardHeader>
            <UiCardContent>
              <div v-if="hasSocialLinks" class="flex flex-wrap gap-3">
                <a v-if="socialLinks.facebook" :href="socialLinks.facebook" target="_blank" rel="noopener noreferrer" class="flex size-10 items-center justify-center rounded-full bg-blue-600 text-white transition-all hover:scale-110 hover:bg-blue-700" title="Facebook">
                  <Icon name="mdi:facebook" class="size-5" />
                </a>
                <a v-if="socialLinks.instagram" :href="socialLinks.instagram" target="_blank" rel="noopener noreferrer" class="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 text-white transition-all hover:scale-110" title="Instagram">
                  <Icon name="mdi:instagram" class="size-5" />
                </a>
                <a v-if="socialLinks.twitter" :href="socialLinks.twitter" target="_blank" rel="noopener noreferrer" class="flex size-10 items-center justify-center rounded-full bg-black text-white transition-all hover:scale-110" title="X (Twitter)">
                  <Icon name="mdi:twitter" class="size-5" />
                </a>
                <a v-if="socialLinks.linkedin" :href="socialLinks.linkedin" target="_blank" rel="noopener noreferrer" class="flex size-10 items-center justify-center rounded-full bg-blue-700 text-white transition-all hover:scale-110 hover:bg-blue-800" title="LinkedIn">
                  <Icon name="mdi:linkedin" class="size-5" />
                </a>
                <a v-if="socialLinks.youtube" :href="socialLinks.youtube" target="_blank" rel="noopener noreferrer" class="flex size-10 items-center justify-center rounded-full bg-red-600 text-white transition-all hover:scale-110 hover:bg-red-700" title="YouTube">
                  <Icon name="mdi:youtube" class="size-5" />
                </a>
                <a v-if="socialLinks.yelp" :href="socialLinks.yelp" target="_blank" rel="noopener noreferrer" class="flex size-10 items-center justify-center rounded-full bg-red-500 text-white transition-all hover:scale-110 hover:bg-red-600" title="Yelp">
                  <Icon name="mdi:yelp" class="size-5" />
                </a>
              </div>
              <p v-else class="italic text-muted-foreground">No social links</p>
            </UiCardContent>
          </UiCard>

          <!-- Location Card -->
          <UiCard>
            <UiCardHeader>
              <UiCardTitle class="flex items-center gap-2">
                <Icon name="heroicons:map-pin" class="size-5" />
                Location
              </UiCardTitle>
            </UiCardHeader>
            <UiCardContent>
              <dl class="space-y-3">
                <div>
                  <dt class="text-sm font-medium text-muted-foreground">City</dt>
                  <dd class="mt-1 text-foreground">{{ cityDisplay }}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-muted-foreground">Street Address</dt>
                  <dd class="mt-1 text-foreground">{{ contractor.street_address || '—' }}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-muted-foreground">Postal Code</dt>
                  <dd class="mt-1 text-foreground">{{ contractor.postal_code || '—' }}</dd>
                </div>
              </dl>
            </UiCardContent>
          </UiCard>

          <!-- Rating Card -->
          <UiCard v-if="contractor.rating || contractor.review_count">
            <UiCardHeader>
              <UiCardTitle class="flex items-center gap-2">
                <Icon name="heroicons:star" class="size-5" />
                Reviews
              </UiCardTitle>
            </UiCardHeader>
            <UiCardContent>
              <div class="flex items-center gap-4">
                <div v-if="contractor.rating" class="flex items-center gap-1">
                  <Icon name="heroicons:star-solid" class="size-5 text-yellow-500" />
                  <span class="text-lg font-semibold">{{ contractor.rating.toFixed(1) }}</span>
                </div>
                <div v-if="contractor.review_count" class="text-sm text-muted-foreground">
                  {{ contractor.review_count }} {{ contractor.review_count === 1 ? 'review' : 'reviews' }}
                </div>
              </div>
            </UiCardContent>
          </UiCard>

          <!-- Google Info Card -->
          <UiCard>
            <UiCardHeader>
              <UiCardTitle class="flex items-center gap-2">
                <Icon name="mdi:google" class="size-5" />
                Google Info
              </UiCardTitle>
            </UiCardHeader>
            <UiCardContent>
              <dl class="space-y-3">
                <div>
                  <dt class="text-sm font-medium text-muted-foreground">Place ID</dt>
                  <dd class="mt-1 break-all font-mono text-xs text-foreground">{{ contractor.google_place_id || '—' }}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-muted-foreground">CID</dt>
                  <dd class="mt-1 break-all font-mono text-xs text-foreground">{{ contractor.google_cid || '—' }}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-muted-foreground">Slug</dt>
                  <dd class="mt-1 break-all font-mono text-xs text-foreground">{{ contractor.slug }}</dd>
                </div>
              </dl>
            </UiCardContent>
          </UiCard>

          <!-- Record Info Card -->
          <UiCard>
            <UiCardHeader>
              <UiCardTitle class="flex items-center gap-2">
                <Icon name="heroicons:information-circle" class="size-5" />
                Record Info
              </UiCardTitle>
            </UiCardHeader>
            <UiCardContent>
              <dl class="space-y-3">
                <div>
                  <dt class="text-sm font-medium text-muted-foreground">ID</dt>
                  <dd class="mt-1 break-all font-mono text-xs text-foreground">{{ contractor.id }}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-muted-foreground">Created</dt>
                  <dd class="mt-1 text-sm text-foreground">{{ new Date(contractor.created_at).toLocaleString() }}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-muted-foreground">Updated</dt>
                  <dd class="mt-1 text-sm text-foreground">{{ new Date(contractor.updated_at).toLocaleString() }}</dd>
                </div>
              </dl>
            </UiCardContent>
          </UiCard>
        </div>
      </div>
    </template>
  </div>
</template>

